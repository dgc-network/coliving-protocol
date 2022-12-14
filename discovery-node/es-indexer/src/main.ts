import { RepostDoc, SaveDoc } from './types/docs'
import { ContentListIndexer } from './indexers/contentListIndexer'
import { RepostIndexer } from './indexers/repostIndexer'
import { SaveIndexer } from './indexers/saveIndexer'
import { DigitalContentIndexer } from './indexers/digitalContentIndexer'
import { UserIndexer } from './indexers/userIndexer'
import { PendingUpdates, startListener, takePending } from './listener'
import { logger } from './logger'
import { setupTriggers } from './setup'
import {
  ensureSaneCluterSettings,
  getBlocknumberCheckpoints,
  waitForHealthyCluster,
} from './conn'
import { program } from 'commander'

export const indexer = {
  contentLists: new ContentListIndexer(),
  reposts: new RepostIndexer(),
  saves: new SaveIndexer(),
  digitalContents: new DigitalContentIndexer(),
  users: new UserIndexer(),
}

async function processPending(pending: PendingUpdates) {
  return Promise.all([
    indexer.contentLists.indexIds(Array.from(pending.contentListIds)),
    indexer.digitalContents.indexIds(Array.from(pending.digitalContentIds)),
    indexer.users.indexIds(Array.from(pending.userIds)),

    indexer.reposts.indexRows(pending.reposts as RepostDoc[]),
    indexer.saves.indexRows(pending.saves as SaveDoc[]),
  ])
}

async function start() {
  const cliFlags = program
    .option('--no-listen', 'exit after catchup is complete')
    .option('--drop', 'drop and recreate indexes')
    .parse()
    .opts()

  logger.info(cliFlags, 'booting')
  const health = await waitForHealthyCluster()
  await ensureSaneCluterSettings()
  logger.info(`starting: health ${health.status}`)

  // create indexes
  const indexers = Object.values(indexer)
  await Promise.all(
    indexers.map((ix) => ix.createIndex({ drop: cliFlags.drop }))
  )

  // setup postgres trigger + listeners
  await setupTriggers()
  await startListener()

  // backfill since last run
  const checkpoints = await getBlocknumberCheckpoints()
  logger.info(checkpoints, 'catchup from blocknumbers')
  await Promise.all(Object.values(indexer).map((i) => i.catchup(checkpoints)))

  // refresh indexes before cutting over
  logger.info(checkpoints, 'refreshing indexes')
  await Promise.all(Object.values(indexer).map((i) => i.refreshIndex()))

  // cutover aliases
  logger.info('catchup done... cutting over aliases')
  await Promise.all(indexers.map((ix) => ix.cutoverAlias()))

  // drop old indices
  logger.info('alias cutover done... dropping any old indices')
  await Promise.all(indexers.map((ix) => ix.cleanupOldIndices()))

  if (!cliFlags.listen) {
    logger.info('--no-listen: exiting')
    process.exit(0)
  }

  // process events
  logger.info('processing events')
  while (true) {
    const pending = takePending()
    if (pending) {
      await processPending(pending)
      logger.info('processed new updates')
    }
    // free up event loop + batch queries to postgres
    await new Promise((r) => setTimeout(r, 500))
  }
}

async function main() {
  try {
    await start()
  } catch (e) {
    logger.fatal(e, 'save me pm2')
    process.exit(1)
  }
}

main()

process
  .on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'unhandledRejection')
  })
  .on('uncaughtException', (err) => {
    logger.fatal(err, 'uncaughtException')
    process.exit(1)
  })
