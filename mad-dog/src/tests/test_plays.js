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

async function logAgreementListen(agreementId, userId, solanaListen) {
  return (await axios({
    method: 'post',
    url: `http://localhost:7000/agreements/${agreementId}/listen`,
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

async function submitAgreementListen (executeOne, agreementId, userId, solanaListen) {
  const initialPlays = await getTotalPlays()

  let signature
  try {
    await executeOne(0, async (libs) => {
      const start = Date.now()
      const identityResponse = await logAgreementListen(agreementId, userId, solanaListen)
      signature = identityResponse.solTxSignature
      console.log(`Logged agreement listen (agreementId=${agreementId}, userId=${userId}, solanaListen=${solanaListen}) | Processed in ${Date.now() - start}ms`)
    })
  } catch (err) {
    console.log(`Failed to log agreement listen (agreementId=${agreementId}, userId=${userId}, solanaListen=${solanaListen}) with error ${err}`)
    return false
  }

  const pollStart = Date.now()
  console.log(`Polling agreement listen (agreementId=${agreementId}, userId=${userId}, solanaListen=${solanaListen})`)

  if (solanaListen) {
    let resp = (await getSolPlay(signature)).data
    while (!resp.data) {
      await delay(500)
      resp = (await getSolPlay(signature)).data
      if (Date.now() - pollStart > MaxPollDurationMs) {
        throw new Error(`Failed to find ${signature} for userId=${userId}, agreementId=${agreementId} in ${MaxPollDurationMs}ms`)
      }
    }
  } else {
    let plays = await getTotalPlays()
    while (plays === initialPlays) {
      await delay(500)
      plays = await getTotalPlays()
      if (Date.now() - pollStart > MaxPollDurationMs) {
        throw new Error(`Failed to find listen for userId=${userId}, agreementId=${agreementId} in ${MaxPollDurationMs}ms`)
      }
    }
  }

  console.log(`Found agreement listen (agreementId=${agreementId}, userId=${userId}, solanaListen=${solanaListen}) in discovery-node`)

  return true
}

async function agreementListenCountsTest ({ executeOne }) {
  const numBaseAgreements = 10
  const numAnonBaseAgreements = 10
  const numSolanaAgreements = 250
  const numAnonSolanaAgreements = 50

  const start = Date.now()

  const numSuccessfulSolanaAgreementListens = (await Promise.all(
    Array.from({ length: numSolanaAgreements }, async () => {
      const numListens = Math.floor(Math.random() * 5) + 1
      const agreementId = Math.floor(Math.random() * 10000000)
      const userId = Math.floor(Math.random() * 10000000)

      return (await Promise.all(
        Array.from({ length: numListens }, () =>
          submitAgreementListen(executeOne, agreementId, userId, true)
        )
      )).reduce((a, b) => a + b, 0)
    })
  )).reduce((a, b) => a + b, 0)

  const numSuccessfulAnonSolanaAgreementListens = (await Promise.all(
    Array.from({ length: numAnonSolanaAgreements }, async () => {
      const numListens = Math.floor(Math.random() * 5) + 1
      const agreementId = Math.floor(Math.random() * 10000000)
    const userId = uuid()

      return (await Promise.all(
        Array.from({ length: numListens }, () =>
          submitAgreementListen(executeOne, agreementId, userId, true)
        )
      )).reduce((a, b) => a + b, 0)
    })
  )).reduce((a, b) => a + b, 0)

  let numSuccessfulBaseAgreementListens = 0
  for (let i = 0; i < numBaseAgreements; i++) {
    const numListens = Math.floor(Math.random() * 5) + 1
    const agreementId = Math.floor(Math.random() * 10000000)
    const userId = Math.floor(Math.random() * 10000000)

    for (let j = 0; j < numListens; j++) {
      if (await submitAgreementListen(executeOne, agreementId, userId, false)) {
        numSuccessfulBaseAgreementListens += 1
      }
    }
  }

  let numSuccessfulAnonBaseAgreementListens = 0
  for (let i = 0; i < numAnonBaseAgreements; i++) {
    const numListens = Math.floor(Math.random() * 5) + 1
    const agreementId = Math.floor(Math.random() * 10000000)
    const userId = uuid()

    for (let j = 0; j < numListens; j++) {
      if (await submitAgreementListen(executeOne, agreementId, userId, false)) {
        numSuccessfulAnonBaseAgreementListens += 1
      }
    }
  }

  const totalSuccessfullyProcessed = numSuccessfulSolanaAgreementListens +
    numSuccessfulAnonSolanaAgreementListens +
    numSuccessfulBaseAgreementListens +
    numSuccessfulAnonBaseAgreementListens

  console.log(
    `Processed ${totalSuccessfullyProcessed} (` +
    `solana: ${numSuccessfulSolanaAgreementListens}, ` +
    `solana anon: ${numSuccessfulAnonSolanaAgreementListens}, ` +
    `base: ${numSuccessfulBaseAgreementListens}, ` +
    `base anon: ${numSuccessfulAnonBaseAgreementListens}` +
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
  agreementListenCountsTest
}
