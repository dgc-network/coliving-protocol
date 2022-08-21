/**
 * Find the content nodes associated with a user and their respective clock values.
 *
 * Script usage:
 * export DISCOVERY_PROVIDER_ENDPOINT=<discovery node endpoint>
 * node userClockValues.js -h <comma separated user handles> -i <comma separated user ids> -t <axios timeout>
 *
 * Example command: node userClockValues.js -h cheran_test,mukundan314 -i 3 -t 1000
 *
 */
const axios = require('axios')
const ContentNode = require('@coliving/sdk/src/services/contentNode')
const { Command } = require('commander')

function commaSeparatedList(value, unusedPrevValue) {
  return value.split(',')
}

const program = new Command()
program
  .usage('')
  .option('-h, --handles <handles>', 'Coliving handles', commaSeparatedList, [])
  .option('-i, --user-ids <userIds>', 'Coliving user ids', commaSeparatedList, [])
  .option(
    '-t, --timeout <timeout>',
    'Timeout for single request in ms',
    commaSeparatedList,
    5000
  )

const discoveryNodeEndpoint = process.env.DISCOVERY_PROVIDER_ENDPOINT

async function getUserByHandle(handle, discoveryNodeEndpoint, timeout) {
  try {
    return (
      await axios({
        url: `/v1/full/users/handle/${handle}`,
        method: 'get',
        baseURL: discoveryNodeEndpoint,
        timeout: timeout
      })
    ).data.data[0]
  } catch (err) {
    console.log(
      `Failed to get content node endpoint and wallet from endpoint: ${discoveryNodeEndpoint} and handle: ${handle} with ${err}`
    )
  }
}

async function getUserById(userId, discoveryNodeEndpoint, timeout) {
  try {
    const resp = (
      await axios({
        url: `/users?id=${userId}`,
        method: 'get',
        baseURL: discoveryNodeEndpoint,
        timeout
      })
    ).data.data[0]

    if (!resp) {
      console.log(`Failed to find user with userId ${userId}`)
    }

    return resp
  } catch (err) {
    console.log(
      `Failed to get content node endpoint and wallet from endpoint: ${discoveryNodeEndpoint} and user id: ${userId} with ${err}`
    )
  }
}

async function getClockValues(
  { wallet, content_node_endpoint: contentNodeEndpoint, handle },
  timeout
) {
  const primaryContentNode = ContentNode.getPrimary(contentNodeEndpoint)
  const secondaryContentNodes = ContentNode.getSecondaries(contentNodeEndpoint)

  if (!contentNodeEndpoint) {
    return {
      primaryNode: '',
      primaryClockValue: '',
      secondaryNodes: [],
      secondaryClockValues: [],
      handle
    }
  }

  return {
    primaryNode: primaryContentNode,
    primaryClockValue: await ContentNode.getClockValue(
      primaryContentNode,
      wallet,
      timeout
    ),
    secondaryNodes: secondaryContentNodes,
    secondaryClockValues: await Promise.all(
      secondaryContentNodes.map(secondaryNode =>
        ContentNode.getClockValue(secondaryNode, wallet, timeout)
      )
    ),
    handle
  }
}

// get clock values for all users / some users via userIds / handles
async function getUserClockValues(handles, userIds, timeout) {
  const usersFromHandles = handles.map(handle =>
    getUserByHandle(handle, discoveryNodeEndpoint, timeout)
  )

  const usersFromIds = userIds.map(userId =>
    getUserById(userId, discoveryNodeEndpoint, timeout)
  )

  const users = await Promise.all([...usersFromHandles, ...usersFromIds])
  return Promise.all(
    users.filter(user => user).map(user => getClockValues(user, timeout))
  )
}

async function run() {
  const { handles, userIds, timeout } = parseArgsAndEnv()
  const userClockValues = await getUserClockValues(handles, userIds, timeout)
  userClockValues.forEach(
    ({
      primaryNode,
      primaryClockValue,
      secondaryNodes,
      secondaryClockValues,
      handle
    }) => {
      console.log('Handle:', handle)
      console.log('Primary')
      console.log(primaryNode, primaryClockValue)

      console.log('Secondary')
      secondaryNodes.forEach((secondaryNode, idx) => {
        console.log(secondaryNode, secondaryClockValues[idx])
      })

      console.log()
    }
  )
}

/**
 * Process command line args, expects user handle as command line input.
 */
function parseArgsAndEnv() {
  program.parse(process.argv)
  if (!discoveryNodeEndpoint) {
    const errorMessage =
      'Incorrect script usage, expected DISCOVERY_PROVIDER_ENDPOINT in env.\ntry `export DISCOVERY_PROVIDER_ENDPOINT="https://discoverynode.coliving.lol"`'
    throw new Error(errorMessage)
  }

  return {
    handles: program.handles,
    userIds: program.userIds,
    timeout: Number(program.timeout)
  }
}

run()
