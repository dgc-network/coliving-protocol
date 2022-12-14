/**
 * Verifies a file upload limited to configured delegateOwnerWallet.
 * Used to validate availability prior to joining the network
 *
 * Script usage: node verifyHealthCheckFileUpload.js
*/
const axios = require('axios')
const FormData = require('form-data')
const { generateTimestampAndSignature } = require('../src/apiSigning')
const { promisify } = require('util')

const crypto = require('crypto')

const PRIVATE_KEY = process.env.delegatePrivateKey
const CONTENT_NODE_ENDPOINT = process.env.contentNodeEndpoint
const randomBytes = promisify(crypto.randomBytes)

/**
 * Process command line args and issue file upload health check
 */
async function run () {
  try {
    parseEnvVarsAndArgs()
  } catch (e) {
    console.error(`\nIncorrect script usage: ${e.message}`)
    console.error(`Script usage: node verifyHealthCheckFileUpload.js`)
    return
  }

  try {
    // Generate signature using local key
    const randomBytesToSign = (await randomBytes(18)).toString()
    const signedLocalData = generateTimestampAndSignature({ randomBytesToSign }, PRIVATE_KEY)
    // Add randomBytes to outgoing request parameters
    const reqParam = signedLocalData
    reqParam.randomBytes = randomBytesToSign

    let sampleDigitalContent = new FormData()
    sampleDigitalContent.append('file', (await axios({
      method: 'get',
      url: 'https://s3-us-west-1.amazonaws.com/download.coliving.lol/sp-health-check-files/97mb_music.mp3', // 97 MB
      responseType: 'stream'
    })).data)

    let requestConfig = {
      headers: {
        ...sampleDigitalContent.getHeaders()
      },
      url: `${CONTENT_NODE_ENDPOINT}/health_check/fileupload`,
      method: 'post',
      params: reqParam,
      responseType: 'json',
      data: sampleDigitalContent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    }
    let resp = await axios(requestConfig)
    let data = resp.data
    console.dir(data, { depth: 5 })
  } catch (e) {
    console.error(e)
  }
}

/**
 * Parses the environment variables and command line args
 * export contentNodeEndpoint=http://cn1_content-node_1:4000
 * export delegatePrivateKey=f0b743ce8adb7938f1212f188347a63...
 * NOTE: DO NOT PREFIX PRIVATE KEY WITH 0x
 */
function parseEnvVarsAndArgs () {
  if (!CONTENT_NODE_ENDPOINT || !PRIVATE_KEY) {
    let errorMsg = `contentNodeEndpoint [${CONTENT_NODE_ENDPOINT}] or delegatePrivateKey [${PRIVATE_KEY}] have not been exported. `
    errorMsg += "Please export environment variables 'delegatePrivateKey' and 'contentNodeEndpoint'."
    throw new Error(errorMsg)
  }
}

run()
