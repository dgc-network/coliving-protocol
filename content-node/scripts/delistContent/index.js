const axios = require('axios')
const HashIds = require('./hashIds')
const Commander = require('./commanderHelper')
const { generateTimestampAndSignature } = require('./apiSigning')

// required env variables
const PRIVATE_KEY = process.env.delegatePrivateKey
const CONTENT_NODE_ENDPOINT = process.env.contentNodeEndpoint
const DISCOVERY_PROVIDER_ENDPOINT = process.env.discoveryNodeEndpoint

const REQUEST_CONCURRENCY_LIMIT = 20
const MAX_LIMIT = 500
const VALUES_BATCH_SIZE = 10

// this is a global flag that will be modified to true if verbose mode flag enabled by caller
let VERBOSE_MODE = false

// create a global instance of HashIds
const hashIds = new HashIds()

// simple logger to wrap console to control debug logging behavior
const Logger = {
  debug: (...msgs) => { if (VERBOSE_MODE) console.log(...msgs) },
  info: (...msgs) => { console.log(...msgs) },
  error: (...msgs) => { console.error('Error: ', ...msgs) }
}

/**
 * Process command line args and either add or remove an entry from DB table
 */
async function run () {
  let args
  const commander = new Commander()
  args = commander.runParser({ CONTENT_NODE_ENDPOINT, PRIVATE_KEY, DISCOVERY_PROVIDER_ENDPOINT, hashIds })

  const { action, type, values, verbose } = args
  if (verbose) VERBOSE_MODE = true
  Logger.info(`Updating set of delisted content for ${CONTENT_NODE_ENDPOINT} for values: [${values}]...`)

  let errors = []
  for (let i = 0; i < values.length; i += VALUES_BATCH_SIZE) {
    const valuesSliced = values.slice(i, i + VALUES_BATCH_SIZE)
    try {
      switch (action) {
        case 'ADD': {
          await delistContent(type, valuesSliced)
          break
        }
        case 'REMOVE': {
          await undelistContent(type, valuesSliced)
          break
        }
        default: {
          throw new Error(`Invalid action type: ${action}`)
        }
      }
    } catch (e) {
      Logger.error(`Failed to perform [${action}] for [${type}]: ${e}`)
      return
    }

    Logger.debug(`Verifying content against set of delisted content for ${CONTENT_NODE_ENDPOINT}...\n`)
    try {
      const CIDs = await verifyDelistedContent({ type, values: valuesSliced, action })

      Logger.info(`Successfully performed [${action}] for type [${type}]! Values: [${valuesSliced}]`)
      Logger.debug(`Number of CIDs: ${CIDs.length}
CIDs: ${CIDs}`)
    } catch (e) {
      const errMsg = `Verification check failed: ${e}`
      Logger.error(errMsg)
      errors.push(errMsg)
    }
  }

  if (errors.length > 0) Logger.error(`Finished Script. Status: Error. Errors:: ${errors}`)
  else Logger.info(`Finished Script. Status: Success`)
}

/**
 * 1. Signs the data {type, values, timestamp} with PRIVATE_KEY specified in this script
 * 2. Sends axios request to add entry to node for type and values
 * @param {string} type
 * @param {number[]|string[]} values
 */
async function delistContent (type, values) {
  const { timestamp, signature } = generateTimestampAndSignature({ type, values }, PRIVATE_KEY)

  let resp
  try {
    const reqObj = {
      url: `${CONTENT_NODE_ENDPOINT}/blacklist/add`,
      method: 'post',
      params: { type, values, timestamp, signature },
      responseType: 'json'
    }
    Logger.debug(`About to send axios request to ${reqObj.url} for values`, values)
    resp = await axios(reqObj)
  } catch (e) {
    throw new Error(`Error with adding type [${type}] and values [${values}] to url: ${CONTENT_NODE_ENDPOINT}: ${e}`)
  }

  return resp.data
}

/**
 * 1. Signs the data {type, values, timestamp} with PRIVATE_KEY specified in this script
 * 2. Sends axios request to remove entry from node for type and id
 * @param {string} type
 * @param {number[]|string[]} values
 */
async function undelistContent (type, values) {
  const { timestamp, signature } = generateTimestampAndSignature({ type, values }, PRIVATE_KEY)

  let resp
  try {
    resp = await axios({
      url: `${CONTENT_NODE_ENDPOINT}/blacklist/remove`,
      method: 'post',
      params: { type, values, timestamp, signature },
      responseType: 'json'
    })
  } catch (e) {
    throw new Error(`Error with removing type [${type}] and values [${values}] to url: ${CONTENT_NODE_ENDPOINT}: ${e}`)
  }

  return resp.data
}

/**
 * 1. Get all delisted content
 * 2. Iterate through passed in CLI args against fetched content
 * @param {string} type
 * @param {(number[]|string[])} values cids or ids
 * @returns {string[]} all CIDs associated with input
 */
async function verifyDelistedContent ({ type, values, action }) {
  let allCIDs = await getCIDs(type, values)

  // Hit content node /ipfs/:CID route to see if cid is delisted
  let checkFn, filterFn
  switch (action) {
    case 'ADD':
      checkFn = checkIsCIDDelisted
      filterFn = status => !status
      break
    case 'REMOVE':
      checkFn = checkIsCIDNotDelisted
      filterFn = status => status
      break
  }

  // Batch requests
  let contentNodeCIDResponses = []
  const checkCIDDelistStatusRequests = allCIDs.map(cid => checkFn(cid))
  for (let i = 0; i < allCIDs.length; i += REQUEST_CONCURRENCY_LIMIT) {
    const contentNodeCIDResponsesSlice = await Promise.all(checkCIDDelistStatusRequests.slice(i, i + REQUEST_CONCURRENCY_LIMIT))
    contentNodeCIDResponses = contentNodeCIDResponses.concat(contentNodeCIDResponsesSlice)
  }

  // CIDs that were not accounted for during delist/undelist
  const unaccountedCIDs = contentNodeCIDResponses
    .filter(resp => filterFn(resp.delisted))
    .map(resp => resp.value)

  if (unaccountedCIDs.length > 0) {
    let errorMsg = `Some CIDs from [${type}] and values [${values}] were not delisted/undelisted.`
    errorMsg += `\nNumber of CIDs: ${unaccountedCIDs.length}`
    errorMsg += `\nCIDs: [${unaccountedCIDs.toString()}]`
    throw new Error(errorMsg)
  }

  // If the type is DIGITAL_CONTENT, we also need to check the stream route
  if (type === 'DIGITAL_CONTENT') {
    // Batch requests
    let contentNodeDigitalContentResponses = []
    const checkDigitalContentDelistStatusRequests = values.map(digitalContentId => checkIsDigitalContentDelisted(digitalContentId))
    for (let i = 0; i < values.length; i += REQUEST_CONCURRENCY_LIMIT) {
      const contentNodeDigitalContentResponsesSlice = await Promise.all(checkDigitalContentDelistStatusRequests.slice(i, i + REQUEST_CONCURRENCY_LIMIT))
      contentNodeDigitalContentResponses = contentNodeDigitalContentResponses.concat(contentNodeDigitalContentResponsesSlice)
    }

    // CIDs that were not accounted for during delist/undelist
    const unaccountedDigitalContents = contentNodeDigitalContentResponses
      .filter(resp => filterFn(resp.delisted))
      .map(resp => resp.value)

    Logger.debug('contentNodeDigitalContentResponses', contentNodeDigitalContentResponses)
    if (unaccountedDigitalContents.length > 0) {
      let errorMsg = `DigitalContents with ids [${values}] were not delisted/undelisted.`
      errorMsg += `\nNumber of DigitalContents: ${unaccountedDigitalContents.length}`
      errorMsg += `\nDigitalContents: [${unaccountedDigitalContents.toString()}]`
      throw new Error(errorMsg)
    }
  }

  return allCIDs
}

/**
 * For resources of a valid type, get all the CIDs for the passed in id values
 * @param {String} type 'USER' or 'DIGITAL_CONTENT'
 * @param {(number[])} values ids for associated type
 * @returns
 */
async function getCIDs (type, values) {
  if (type === 'CID') return values

  let discProvRequests
  let allCIDs
  try {
    // Fetch all the CIDs via disc prov
    switch (type) {
      case 'USER': {
        const map = await fetchUserToNumDigitalContentsMap(values)
        const additionalRequests = []
        discProvRequests = values
          .map(value => {
            let numDigitalContentsForUser = map[value]
            const axiosRequest = {
              url: `${DISCOVERY_PROVIDER_ENDPOINT}/digitalContents`,
              method: 'get',
              params: { user_id: value, limit: MAX_LIMIT },
              responseType: 'json'
            }

            if (numDigitalContentsForUser > MAX_LIMIT) {
            // If users have over 500 digitalContents, add additional requests to query those digitalContents
              let offset = 0
              while (numDigitalContentsForUser > MAX_LIMIT) {
                const axiosRequestWithOffset = { ...axiosRequest }
                axiosRequestWithOffset.params.offset = offset
                additionalRequests.push(axios(axiosRequest))

                offset += MAX_LIMIT
                numDigitalContentsForUser -= MAX_LIMIT
              }
              return null
            } else {
              // Else, create one request
              return axios(axiosRequest)
            }
          })
          // Filter out null resps from mapping requests with users with over 500 digitalContents
          .filter(Boolean)

        discProvRequests.concat(additionalRequests)
        break
      }
      case 'DIGITAL_CONTENT': {
        discProvRequests = values.map(value => axios({
          url: `${DISCOVERY_PROVIDER_ENDPOINT}/digitalContents`,
          method: 'get',
          params: { id: value },
          responseType: 'json'
        }))
        break
      }
    }

    // Batch requests
    let discProvResps = []
    for (let i = 0; i < discProvRequests.length; i += REQUEST_CONCURRENCY_LIMIT) {
      const discProvResponsesSlice = await Promise.all(discProvRequests.slice(i, i + REQUEST_CONCURRENCY_LIMIT))
      discProvResps = discProvResps.concat(discProvResponsesSlice)
    }

    // Iterate through disc prov responses and grab all the digital_content CIDs
    let allCIDsObj = []
    for (const resp of discProvResps) {
      for (const digital_content of resp.data.data) {
        allCIDsObj = allCIDsObj.concat(digital_content.digital_content_segments)
      }
    }
    allCIDs = allCIDsObj.map(CIDObj => CIDObj.multihash)
  } catch (e) {
    throw new Error(`Error with fetching CIDs for verification: ${e}`)
  }
  return allCIDs
}

/**
 * Fetches the total digitalContents count from all input userIds, and returns a map of user_id:digital_content_count
 * @param {number[]} userIds
 */
async function fetchUserToNumDigitalContentsMap (userIds) {
  const resp = await axios({
    url: `${DISCOVERY_PROVIDER_ENDPOINT}/users`,
    method: 'get',
    params: { id: userIds },
    responseType: 'json'
  })

  const map = {}
  resp.data.data.map(resp => {
    map[resp.user_id] = resp.digital_content_count
  })
  return map
}

/**
 * Check if cid is delisted via /ipfs/:CID route
 * @param {string} cid
 */
async function checkIsCIDDelisted (cid) {
  try {
    await axios.head(`${CONTENT_NODE_ENDPOINT}/ipfs/${cid}`)
  } catch (e) {
    if (e.response && e.response.status && e.response.status === 403) {
      return { cid, delisted: true }
    }

    // CID was not found on node, would not have been served either way, return success
    if (e.response && e.response.status && e.response.status === 404) return { type: 'CID', value: cid, delisted: true }

    Logger.error(`Failed to check for cid [${cid}]: ${e}`)
  }
  return { type: 'CID', value: cid, delisted: false }
}

async function checkIsDigitalContentDelisted (id) {
  try {
    const encodedId = hashIds.encode(id)
    await axios.head(`${CONTENT_NODE_ENDPOINT}/digital_contents/stream/${encodedId}`)
  } catch (e) {
    if (e.response && e.response.status && e.response.status === 403) {
      return { value: id, delisted: true }
    }

    // CID was not found on node, would not have been served either way, return success
    if (e.response.status === 404) return { type: 'DIGITAL_CONTENT', value: id, delisted: true }

    Logger.error(`Failed to check for digital_content [${id}]: ${e}`)
  }
  return { type: 'DIGITAL_CONTENT', value: id, delisted: false }
}

/**
 * Check if cid is not delisted via /ipfs/:CID route
 * @param {string} cid
 */
async function checkIsCIDNotDelisted (cid) {
  try {
    await axios.head(`${CONTENT_NODE_ENDPOINT}/ipfs/${cid}`)
  } catch (e) {
    Logger.error(`Failed to check for cid [${cid}]: ${e}`)
    return { cid, delisted: true }
  }
  return { cid, delisted: false }
}

run()
