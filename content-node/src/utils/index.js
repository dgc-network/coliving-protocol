const validateMetadata = require('./validateColivingUserMetadata')
const { validateAssociatedWallets } = validateMetadata

module.exports = {
  validateMetadata,
  validateAssociatedWallets
}
