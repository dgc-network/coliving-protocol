const axios = require('axios')
const { delay } = require('../helpers.js')

const MaxPollDurationMs = 240000

const uuid = () => {
  // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/873856#873856
  const s = []
  const hexDigits = '0123456789abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-'

  const uuid = s.join('')
  return uuid
}

async function logDigitalContentListen(digitalContentId, userId, solanaListen) {
  return (await axios({
    method: 'post',
    url: `http://localhost:7000/digital_contents/${digitalContentId}/listen`,
    data: {
      userId,
      solanaListen,
    }
  })).data
}

async function getSolPlay (signature) {
  return (await axios({
    method: 'get',
    url: `http://localhost:5000/get_sol_play?tx_sig=${signature}`
  }))
}

async function getTotalPlays () {
  return ((await axios({
    method: 'get',
    // use nonce to bypass cache
    url: `http://localhost:5000/v1/metrics/plays?bucket_size=century&nonce=${Math.random()}`
  })).data.data[0] || {}).count || 0
}

async function getTotalAggregatePlays () {
  return (await axios({
    method: 'get',
    url: `http://localhost:5000/get_total_aggregate_plays`
  })).data.data
}

async function submitDigitalContentListen (executeOne, digitalContentId, userId, solanaListen) {
  const initialPlays = await getTotalPlays()

  let signature
  try {
    await executeOne(0, async (libs) => {
      const start = Date.now()
      const identityResponse = await logDigitalContentListen(digitalContentId, userId, solanaListen)
      signature = identityResponse.solTxSignature
      console.log(`Logged digital_content listen (digitalContentId=${digitalContentId}, userId=${userId}, solanaListen=${solanaListen}) | Processed in ${Date.now() - start}ms`)
    })
  } catch (err) {
    console.log(`Failed to log digital_content listen (digitalContentId=${digitalContentId}, userId=${userId}, solanaListen=${solanaListen}) with error ${err}`)
    return false
  }

  const pollStart = Date.now()
  console.log(`Polling digital_content listen (digitalContentId=${digitalContentId}, userId=${userId}, solanaListen=${solanaListen})`)

  if (solanaListen) {
    let resp = (await getSolPlay(signature)).data
    while (!resp.data) {
      await delay(500)
      resp = (await getSolPlay(signature)).data
      if (Date.now() - pollStart > MaxPollDurationMs) {
        throw new Error(`Failed to find ${signature} for userId=${userId}, digitalContentId=${digitalContentId} in ${MaxPollDurationMs}ms`)
      }
    }
  } else {
    let plays = await getTotalPlays()
    while (plays === initialPlays) {
      await delay(500)
      plays = await getTotalPlays()
      if (Date.now() - pollStart > MaxPollDurationMs) {
        throw new Error(`Failed to find listen for userId=${userId}, digitalContentId=${digitalContentId} in ${MaxPollDurationMs}ms`)
      }
    }
  }

  console.log(`Found digital_content listen (digitalContentId=${digitalContentId}, userId=${userId}, solanaListen=${solanaListen}) in discovery-node`)

  return true
}

async function digitalContentListenCountsTest ({ executeOne }) {
  const numBaseDigitalContents = 10
  const numAnonBaseDigitalContents = 10
  const numSolanaDigitalContents = 250
  const numAnonSolanaDigitalContents = 50

  const start = Date.now()

  const numSuccessfulSolanaDigitalContentListens = (await Promise.all(
    Array.from({ length: numSolanaDigitalContents }, async () => {
      const numListens = Math.floor(Math.random() * 5) + 1
      const digitalContentId = Math.floor(Math.random() * 10000000)
      const userId = Math.floor(Math.random() * 10000000)

      return (await Promise.all(
        Array.from({ length: numListens }, () =>
          submitDigitalContentListen(executeOne, digitalContentId, userId, true)
        )
      )).reduce((a, b) => a + b, 0)
    })
  )).reduce((a, b) => a + b, 0)

  const numSuccessfulAnonSolanaDigitalContentListens = (await Promise.all(
    Array.from({ length: numAnonSolanaDigitalContents }, async () => {
      const numListens = Math.floor(Math.random() * 5) + 1
      const digitalContentId = Math.floor(Math.random() * 10000000)
    const userId = uuid()

      return (await Promise.all(
        Array.from({ length: numListens }, () =>
          submitDigitalContentListen(executeOne, digitalContentId, userId, true)
        )
      )).reduce((a, b) => a + b, 0)
    })
  )).reduce((a, b) => a + b, 0)

  let numSuccessfulBaseDigitalContentListens = 0
  for (let i = 0; i < numBaseDigitalContents; i++) {
    const numListens = Math.floor(Math.random() * 5) + 1
    const digitalContentId = Math.floor(Math.random() * 10000000)
    const userId = Math.floor(Math.random() * 10000000)

    for (let j = 0; j < numListens; j++) {
      if (await submitDigitalContentListen(executeOne, digitalContentId, userId, false)) {
        numSuccessfulBaseDigitalContentListens += 1
      }
    }
  }

  let numSuccessfulAnonBaseDigitalContentListens = 0
  for (let i = 0; i < numAnonBaseDigitalContents; i++) {
    const numListens = Math.floor(Math.random() * 5) + 1
    const digitalContentId = Math.floor(Math.random() * 10000000)
    const userId = uuid()

    for (let j = 0; j < numListens; j++) {
      if (await submitDigitalContentListen(executeOne, digitalContentId, userId, false)) {
        numSuccessfulAnonBaseDigitalContentListens += 1
      }
    }
  }

  const totalSuccessfullyProcessed = numSuccessfulSolanaDigitalContentListens +
    numSuccessfulAnonSolanaDigitalContentListens +
    numSuccessfulBaseDigitalContentListens +
    numSuccessfulAnonBaseDigitalContentListens

  console.log(
    `Processed ${totalSuccessfullyProcessed} (` +
    `solana: ${numSuccessfulSolanaDigitalContentListens}, ` +
    `solana anon: ${numSuccessfulAnonSolanaDigitalContentListens}, ` +
    `base: ${numSuccessfulBaseDigitalContentListens}, ` +
    `base anon: ${numSuccessfulAnonBaseDigitalContentListens}` +
    `) in ${Date.now() - start}ms`
  )

  let totalAggregatePlays = await getTotalAggregatePlays()
  let totalPlays = await getTotalPlays()
  const pollStart = Date.now()
  while (totalPlays !== totalAggregatePlays) {
    await delay(500)
    totalAggregatePlays = await getTotalAggregatePlays()
    totalPlays = await getTotalPlays()
    if (Date.now() - pollStart > MaxPollDurationMs) {
      throw new Error(`Aggregate play count does not equal metric play count (totalAggregatePlays=${totalAggregatePlays} totalPlays=${totalPlays})`)
    }
  }

}

module.exports = {
  digitalContentListenCountsTest
}
