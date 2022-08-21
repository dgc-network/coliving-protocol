const fs = require('fs')
const http = require('http')
const https = require('https')

const axios = require('axios')
const retry = require('async-retry')

axios.defaults.timeout = 10000
axios.defaults.httpAgent = new http.Agent({ timeout: 10000 })
axios.defaults.httpsAgent = new https.Agent({ timeout: 10000 })

const cidsExistsSupported = {}
const imageCidsExistsSupported = {}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeRequest (request, retries = 5) {
  return retry(() => axios(request), { retries })
}

/**
 * @param {string} discoveryNode - Discovery Node endpoint
 * @param {number} offset
 * @param {number} limit
 * @returns {Array<Object>} userBatch
 */
async function getUsersBatch (discoveryNode, offset, limit) {
  try {
    return (
      await makeRequest(
        {
          method: 'get',
          url: '/users',
          baseURL: discoveryNode,
          params: { offset, limit }
        },
        10
      )
    ).data.data.map(user => ({
      ...user,
      content_node_endpoint: user.content_node_endpoint
        ? user.content_node_endpoint.split(',').filter(endpoint => endpoint)
        : []
    }))
  } catch (err) {
    console.log(`Got ${err} when fetching users from discovery-node`)
    return []
  }
}

/**
 * @param {string} discoveryNode - Discovery Node endpoint
 * @param {number} batchSize - Batch Size to use for each request
 * @returns {Object} agreementCids - A object mapping user id to a list of agreement cids
 */
async function getAgreementCids (discoveryNode, batchSize) {
  const agreementCids = {}

  const totalAgreements = (
    await makeRequest({
      method: 'get',
      url: '/latest/agreement',
      baseURL: discoveryNode
    })
  ).data.data

  console.log(`Fetching agreements (total of ${totalAgreements})`)

  for (let offset = 0; offset < totalAgreements; offset += batchSize) {
    console.time(`Fetching agreements (${offset} - ${offset + batchSize})`)

    const agreementsBatch = (
      await makeRequest({
        method: 'get',
        url: '/agreements',
        baseURL: discoveryNode,
        params: { offset, limit: batchSize }
      })
    ).data.data

    agreementsBatch.forEach(({ metadata_multihash, owner_id }) => {
      agreementCids[owner_id] = agreementCids[owner_id] || []
      agreementCids[owner_id].push(metadata_multihash)
    })

    console.timeEnd(`Fetching agreements (${offset} - ${offset + batchSize})`)
  }

  return agreementCids
}

/**
 * @param {string} contentNode - Creator Node endpoint
 * @param {Array<string>} walletPublicKeys
 * @returns {Array<Object>} clockValues
 */
async function getClockValues (contentNode, walletPublicKeys) {
  try {
    return (
      await makeRequest({
        method: 'post',
        url: '/users/batch_clock_status',
        baseURL: contentNode,
        data: { walletPublicKeys }
      })
    ).data.data.users
  } catch (e) {
    console.log(`Got ${e} when fetching clock values from ${contentNode}`)
    return walletPublicKeys.map(walletPublicKey => ({
      walletPublicKey,
      clock: 0
    }))
  }
}

/**
 * @param {string} contentNode - Creator Node endpoint
 * @param {Array<string>} cids
 * @returns {Array<Object>} cidsExist
 */
async function getCidsExist (contentNode, cids, batchSize = 500) {
  try {
    if (cidsExistsSupported[contentNode] === undefined) {
      cidsExistsSupported[contentNode] =
        (
          await makeRequest({
            method: 'post',
            url: '/batch_cids_exist',
            baseURL: contentNode,
            data: { cids: [] },
            validateStatus: status => status === 200 || status === 404
          })
        ).status === 200

      if (cidsExistsSupported[contentNode]) {
        await sleep(6000)
      }
    }

    if (!cidsExistsSupported[contentNode]) {
      throw new Error('content node out of date')
    }

    const cidsExist = []

    for (let offset = 0; offset < cids.length; offset += batchSize) {
      const batch = cids.slice(offset, offset + batchSize)
      cidsExist.push(
        ...(
          await makeRequest({
            method: 'post',
            url: '/batch_cids_exist',
            baseURL: contentNode,
            data: { cids: batch }
          })
        ).data.data.cids
      )

      await sleep(6000)
    }

    return cidsExist
  } catch (e) {
    console.log(`Got ${e} when checking if cids exist in ${contentNode}`)
    return cids.map(cid => ({ cid, exists: false }))
  }
}

/**
 * @param {string} contentNode - Creator Node endpoint
 * @param {Array<string>} cids
 * @returns {Array<Object>} cidsExist
 */
async function getImageCidsExist (contentNode, cids, batchSize = 500) {
  try {
    if (imageCidsExistsSupported[contentNode] === undefined) {
      imageCidsExistsSupported[contentNode] =
        (
          await makeRequest({
            method: 'post',
            url: '/batch_image_cids_exist',
            baseURL: contentNode,
            data: { cids: [] },
            validateStatus: status => status === 200 || status === 404
          })
        ).status === 200

      if (imageCidsExistsSupported[contentNode]) {
        await sleep(6000)
      }
    }

    if (!imageCidsExistsSupported[contentNode]) {
      throw new Error('content node out of date')
    }

    const cidsExist = []

    for (let offset = 0; offset < cids.length; offset += batchSize) {
      const batch = cids.slice(offset, offset + batchSize)
      cidsExist.push(
        ...(
          await makeRequest({
            method: 'post',
            url: '/batch_image_cids_exist',
            baseURL: contentNode,
            data: { cids: batch }
          })
        ).data.data.cids
      )

      await sleep(6000)
    }

    return cidsExist
  } catch (e) {
    console.log(`Got ${e} when checking if cids exist in ${contentNode}`)
    return cids.map(cid => ({ cid, exists: false }))
  }
}

async function run () {
  const discoveryNode = 'https://discoverynode.coliving.lol/'
  // const discoveryNode = "https://discoverynode.staging.coliving.lol/"
  // const discoveryNode = 'http://localhost:5000'
  const agreementBatchSize = 500
  const userBatchSize = 500

  const agreementCids = await getAgreementCids(discoveryNode, agreementBatchSize)
  fs.writeFileSync('agreementCids.json', JSON.stringify(agreementCids, null, 4))
  // const agreementCids = require('./agreementCids.json')

  const totalUsers = (
    await makeRequest({
      method: 'get',
      url: '/latest/user',
      baseURL: discoveryNode
    })
  ).data.data

  console.log(`Total Users: ${totalUsers}`)

  for (let offset = 0; offset < totalUsers; offset += userBatchSize) {
    console.time(`${offset} - ${offset + userBatchSize}`)

    const usersBatch = await getUsersBatch(
      discoveryNode,
      offset,
      userBatchSize
    )

    const contentNodes = new Set()
    const contentNodeWalletMap = {} // map of content node to wallets
    const contentNodeCidMap = {} // map of content node to cids
    const contentNodeImageCidMap = {} // map of content node to image cids
    const cids = {} // map of user id to cids
    usersBatch.forEach(
      ({
        content_node_endpoint,
        user_id,
        wallet,
        cover_photo_sizes,
        profile_picture_sizes,
        metadata_multihash
      }) => {
        cids[user_id] = Array.from(agreementCids[user_id] || [])
        if (metadata_multihash) {
          cids[user_id].push(metadata_multihash)
        }

        content_node_endpoint.forEach(endpoint => {
          contentNodes.add(endpoint)
          contentNodeWalletMap[endpoint] = contentNodeWalletMap[endpoint] || []
          contentNodeWalletMap[endpoint].push(wallet)
          contentNodeCidMap[endpoint] = contentNodeCidMap[endpoint] || []
          contentNodeCidMap[endpoint].push(...cids[user_id])

          contentNodeImageCidMap[endpoint] =
            contentNodeImageCidMap[endpoint] || []
          if (cover_photo_sizes) {
            contentNodeImageCidMap[endpoint].push(cover_photo_sizes)
          }
          if (profile_picture_sizes) {
            contentNodeImageCidMap[endpoint].push(profile_picture_sizes)
          }
        })
      }
    )

    const clockValues = {} // content node -> wallet -> clock value
    const cidExists = {} // content node -> cid -> exists
    const imageCidExists = {} // content node -> image cid -> exists
    await Promise.all(
      Array.from(contentNodes).map(async contentNode => {
        const [
          clockValuesArr,
          cidExistsArr,
          imageCidExistsArr
        ] = await Promise.all([
          getClockValues(contentNode, contentNodeWalletMap[contentNode]),
          getCidsExist(contentNode, contentNodeCidMap[contentNode]),
          getImageCidsExist(contentNode, contentNodeImageCidMap[contentNode])
        ])

        clockValues[contentNode] = {}
        clockValuesArr.forEach(({ walletPublicKey, clock }) => {
          clockValues[contentNode][walletPublicKey] = clock
        })

        cidExists[contentNode] = {}
        cidExistsArr.forEach(({ cid, exists }) => {
          cidExists[contentNode][cid] = exists
        })

        imageCidExists[contentNode] = {}
        imageCidExistsArr.forEach(({ cid, exists }) => {
          imageCidExists[contentNode][cid] = exists
        })
      })
    )

    const output = usersBatch.map(
      ({
        user_id,
        handle,
        wallet,
        content_node_endpoint,
        cover_photo_sizes,
        profile_picture_sizes,
        metadata_multihash
      }) => ({
        user_id,
        handle,
        wallet,
        metadata_multihash,
        cover_photo: cover_photo_sizes,
        profile_picture: profile_picture_sizes,
        cids: cids[user_id],
        contentNodes: content_node_endpoint.map((endpoint, idx) => ({
          endpoint,
          metadata_multihash: metadata_multihash
            ? cidExists[endpoint][metadata_multihash]
            : null,
          cover_photo: cover_photo_sizes
            ? imageCidExists[endpoint][cover_photo_sizes]
            : null,
          profile_picture: profile_picture_sizes
            ? imageCidExists[endpoint][profile_picture_sizes]
            : null,
          clock: clockValues[endpoint][wallet],
          cids: cids[user_id].filter(cid => cidExists[endpoint][cid]),
          primary: idx === 0
        }))
      })
    )

    fs.writeFileSync(`output.${offset}.json`, JSON.stringify(output, null, 4))

    console.timeEnd(`${offset} - ${offset + userBatchSize}`)
  }
}

run()
