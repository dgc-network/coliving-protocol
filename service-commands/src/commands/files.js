const fetch = require('node-fetch')

const File = {}

File.verifyCIDExistsOnCreatorNode = async (cid, contentNodeEndpoint) => {
  const url = `${contentNodeEndpoint}/ipfs/${cid}`

  // Perform HEAD request, ensuring the route returns 200
  const resp = await fetch(url, { method: 'HEAD' })
  return resp.ok
}

module.exports = File
