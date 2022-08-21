const ServiceCommands = require('../src/index')
const { program } = require('commander')
const {
  allUp,
  discoveryNodeUp,
  discoveryNodeWebServerUp,
  identityServiceUp,
  Service,
  SetupCommand,
  runSetupCommand
} = ServiceCommands

const NUM_CONTENT_NODES = 4
const NUM_DISCOVERY_NODES = 1
const SERVICE_INSTANCE_NUMBER = 1

const printOptions = () => {
  console.log('Services:')
  console.log(Object.values(Service))
  console.log('Actions:')
  console.log(Object.values(SetupCommand))
  console.log('\nUsage:')
  console.log('node setup.js run <service> <command>\n')
  console.log('set flag -v or --verbose for verbose mode.')
  console.log('\nExamples:')
  console.log('node setup.js run network up')
  console.log('node setup.js run ipfs up')
  console.log('node setup.js run ipfs-2 up')
  console.log('node setup.js run contracts up')
  console.log('-----------------------------------')
}

const findService = service => {
  const serviceArray = Object.values(Service).filter(x => x === service)
  if (serviceArray.length === 0) {
    throw new Error(`No service found matching ${service}.`)
  }
  if (serviceArray.length !== 1) {
    throw new Error(`Found ${serviceArray} matching values`)
  }
  return serviceArray[0]
}

const findCommand = command => {
  const cmdArray = Object.values(SetupCommand).filter(x => x === command)
  if (cmdArray.length === 0) {
    throw new Error(`No command found matching ${service}. Options: ${Service}`)
  }
  if (cmdArray.length !== 1) {
    throw new Error(`Found ${cmdArray} matching values`)
  }
  return cmdArray[0]
}

program
  .command('init')
  .description('Initialize repositories')
  .action(async opts => {
    await runSetupCommand(Service.INIT_REPOS, SetupCommand.UP, opts)
  })

program
  .command('up')
  .description('Bring up all services')
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .option(
    '--parallel',
    'Parallel provisioning - whether to provision CNs and DNs in parallel.',
    false
  )
  .option(
    '-nc, --num-cnodes <number>',
    'number of content nodes',
    NUM_CONTENT_NODES.toString()
  )
  .option(
    '-nd, --num-dn <number>',
    'number of discovery nodes',
    NUM_DISCOVERY_NODES.toString()
  )
  .option('-aao, --with-aao', 'whether to include AAO', false)
  .option(
    '-wspb, --with-solana-programs-build',
    'whether to build solana programs (as opposed to using cached)',
    false
  )
  .option(
    '-wdeb, --with-data-eth-build',
    'whether to build data and eth contracts and deploy (as opposed to using cached)',
    false
  )
  .action(async opts => {
    console.log('Bringing up services...')
    console.log(
      `See ${process.env.PROTOCOL_DIR}/service-commands/output.log and ${process.env.PROTOCOL_DIR}/service-commands/error.log for troubleshooting.`
    )
    const numContentNodes = parseInt(opts.numCnodes)
    const numDiscoveryNodes = parseInt(opts.numDn)
    const {
      verbose,
      parallel,
      withAao: withAAO,
      withSolanaProgramsBuild: buildSolana,
      withDataEthBuild: buildDataEthContracts
    } = opts
    await allUp({
      numContentNodes,
      numDiscoveryNodes,
      withAAO,
      verbose,
      parallel,
      buildSolana,
      buildDataEthContracts,
      opts
    })
  })

program
  .command('down')
  .description('Bring down all services')
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .action(async opts => {
    console.log('Bringing down services...')
    await runSetupCommand(Service.ALL, SetupCommand.DOWN, opts)
  })

program
  .command('restart')
  .description(
    'Convenience command to restart services: calls down and then up.'
  )
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .option(
    '-nc, --num-cnodes <number>',
    'number of content nodes',
    NUM_CONTENT_NODES.toString()
  )
  .option(
    '-nd, --num-dn <number>',
    'number of discovery nodes',
    NUM_DISCOVERY_NODES.toString()
  )
  .action(async opts => {
    console.log('Restarting services...')
    const numContentNodes = parseInt(opts.numCnodes)
    const numDiscoveryNodes = parseInt(opts.numDn)
    const verbose = opts.verbose
    await runSetupCommand(Service.ALL, SetupCommand.DOWN, opts)
    await allUp({ numContentNodes, numDiscoveryNodes, verbose })
  })

program
  .command('run <service> [command]')
  .description('Execute a service command')
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .option(
    '-i, --instance-num <num>',
    'service instance number',
    SERVICE_INSTANCE_NUMBER.toString()
  )
  .option(
    '-nc, --num-cnodes <number>',
    'number of content nodes',
    NUM_CONTENT_NODES.toString()
  )
  .option(
    '-nd, --num-dn <number>',
    'number of discovery nodes',
    NUM_DISCOVERY_NODES.toString()
  )
  .option('-aao, --with-aao', 'whether to include AAO', false)
  .action(async (service, command, opts) => {
    try {
      if (!service || !command) {
        throw new Error('Failed to parse arguments')
      }
      let options = {}

      const verbose = opts.verbose
      const serviceName = findService(service)
      const setupCommand = findCommand(command)

      if (serviceName === Service.ALL && setupCommand == SetupCommand.UP) {
        const numContentNodes = parseInt(opts.numCnodes)
        const numDiscoveryNodes = parseInt(opts.numDn)
        const withAAO = opts.withAao
        await allUp({ numContentNodes, numDiscoveryNodes, withAAO, verbose })
        return
      }

      if (
        serviceName === Service.CONTENT_NODE ||
        serviceName === Service.DISCOVERY_PROVIDER
      ) {
        const serviceNumber = parseInt(opts.instanceNum)
        if (serviceNumber < 1) {
          throw new Error(
            `Valid instance number required, >0 - found ${opts.instanceNum}`
          )
        }
        console.log(`Creator node instance ${serviceNumber}`)
        options = { serviceNumber, verbose }
      }

      await runSetupCommand(serviceName, setupCommand, options)
    } catch (e) {
      printOptions()
      throw e
    }
  })

program
  .command('discovery-node-stack up')
  .description('Bring up relevant services for discovery node')
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .action(async opts => await discoveryNodeUp(opts))

program
  .command('discovery-node-web-server-stack up')
  .description(
    'Bring up relevant services for discovery node with only the web server running'
  )
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .action(async opts => await discoveryNodeWebServerUp(opts))

program
  .command('identity-service-stack up')
  .description('Bring up relevant services for identity service')
  .option(
    '-v, --verbose',
    'verbose mode - whether to output logs to console (logs are written to service-commands/output.log and service-commands/error.log by default)',
    false
  )
  .action(async opts => await identityServiceUp(opts))

program.parse(process.argv)
