const assert = require('assert')
const sinon = require('sinon')

const BlacklistManager = require('../src/blacklistManager')
const redis = require('../src/redis')

const { getApp } = require('./lib/app')
const { getLibsMock } = require('./lib/libsMock')
const { restartBlacklistManager } = require('./lib/blacklistManager')

const DUMMY_CID = 'QmYkZMB1cdo8k1Lizco4YyiAMfUwCn9yUQaJn7T274uc5z'

describe('test blacklistManager', () => {
  let server, libsMock

  beforeEach(async () => {
    libsMock = getLibsMock()

    const appInfo = await getApp(
      libsMock,
      BlacklistManager,
      null,
      1 /* userId */
    )
    await BlacklistManager.init()

    server = appInfo.server
  })

  afterEach(async () => {
    await restartBlacklistManager(redis)
    sinon.restore()
    await server.close()
  })

  it('should delete all blacklist redis keys on init', async () => {
    let resp = await BlacklistManager.getAllCIDs()
    assert.deepStrictEqual(resp.length, 0)

    resp = await BlacklistManager.getAllUserIds()
    assert.deepStrictEqual(resp.length, 0)

    resp = await BlacklistManager.getAllAgreementIds()
    assert.deepStrictEqual(resp.length, 0)

    resp = await BlacklistManager.getAllInvalidAgreementIds()
    assert.deepStrictEqual(resp.length, 0)
  })

  it('[isServable] if cid is not in blacklist, serve', async () => {
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1),
      true
    )
  })

  it('[isServable] if cid is in blacklist and agreementId is invalid, do not serve', async () => {
    await BlacklistManager.addToRedis(
      'BM.SET.BLACKLIST.SEGMENTCID' /* REDIS_SET_BLACKLIST_SEGMENTCID_KEY */,
      [DUMMY_CID]
    )

    assert.deepStrictEqual(await BlacklistManager.isServable(DUMMY_CID), false)
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, null),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 'abc'),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, -1),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 0.48),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1.48),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, []),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, [1]),
      false
    )
  })

  it('[isServable] cid belongs to digital_content from input agreementId, and the input agreementId is valid + blacklisted, do not serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.AGREEMENTID', [1])
    await BlacklistManager.addToRedis('BM.MAP.BLACKLIST.SEGMENTCID.AGREEMENTID', {
      1: [DUMMY_CID]
    })
    await BlacklistManager.addToRedis('BM.MAP.AGREEMENTID.SEGMENTCIDS', {
      1: [DUMMY_CID]
    })

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1),
      false
    )
  })

  it('[isServable] cid is in blacklist, cid belongs to digital_content from input agreementId with redis check, and the input agreementId is valid + not blacklisted, allow serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])
    await BlacklistManager.addToRedis('BM.MAP.AGREEMENTID.SEGMENTCIDS', {
      1: [DUMMY_CID]
    })

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1),
      true
    )
  })

  it('[isServable] cid is in blacklist, cid does not belong to digital_content from input agreementId with redis check, and input digital_content is invalid, do not serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])
    await BlacklistManager.addToRedis('BM.SET.INVALID.AGREEMENTIDS', [1234])

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1234),
      false
    )
  })

  it('[isServable] cid is in blacklist, cid does not belong to digital_content from input agreementId with redis check, and input digital_content is invalid with db check, do not serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])

    // Mock DB call to return nothing
    sinon
      .stub(BlacklistManager, 'getAllCIDsFromAgreementIdsInDb')
      .callsFake(async () => {
        return []
      })

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1234),
      false
    )
    assert.deepStrictEqual(await BlacklistManager.agreementIdIsInvalid(1234), 1)
  })

  it('[isServable] cid is in blacklist, cid does not belong to digital_content from input agreementId with redis check, and input digital_content is valid with db check, and cid is in digital_content, allow serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])

    // Mock DB call to return proper segment
    sinon
      .stub(BlacklistManager, 'getAllCIDsFromAgreementIdsInDb')
      .callsFake(async () => {
        return [
          {
            metadataJSON: {
              digital_content_segments: [{ duration: 6, multihash: DUMMY_CID }]
            }
          }
        ]
      })

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1),
      true
    )
    assert.deepStrictEqual(
      await BlacklistManager.getAllCIDsFromAgreementIdInRedis(1),
      [DUMMY_CID]
    )
  }).timeout(0)

  it('[isServable] cid is in blacklist, cid does not belong to digital_content from input agreementId with redis check, and input digital_content is valid with db check, and cid is not in digital_content, do not serve', async () => {
    await BlacklistManager.addToRedis('BM.SET.BLACKLIST.SEGMENTCID', [
      DUMMY_CID
    ])

    // Mock DB call to return proper segment that is not the same as `CID`
    sinon
      .stub(BlacklistManager, 'getAllCIDsFromAgreementIdsInDb')
      .callsFake(async () => {
        return [
          {
            metadataJSON: {
              digital_content_segments: [
                { duration: 6, multihash: 'QmABC_tinashe_and_rei_ami' }
              ]
            }
          }
        ]
      })

    assert.deepStrictEqual(
      await BlacklistManager.isServable(DUMMY_CID, 1),
      false
    )
    assert.deepStrictEqual(
      await BlacklistManager.getAllCIDsFromAgreementIdInRedis(1),
      ['QmABC_tinashe_and_rei_ami']
    )
  })
})
