/**
 * Enqueues sync operation into syncQueue for provided walletPublicKeys against provided contentNodeEndpoint
 */
const enqueueSync = async ({
  serviceRegistry,
  walletPublicKeys,
  contentNodeEndpoint,
  forceResync
}) => {
  await serviceRegistry.syncQueue.enqueueSync({
    walletPublicKeys,
    contentNodeEndpoint,
    forceResync
  })
}

module.exports = {
  enqueueSync
}
