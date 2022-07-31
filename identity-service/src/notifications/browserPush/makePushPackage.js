const fs = require('fs')
const path = require('path')
const pushLib = require('safari-push-notifications')

// Common between all env
const intermediate = fs.readFileSync(path.join(__dirname, './coliving.pushpackage/AppleWWDRCA.pem'))

// Differing env

// Locally
// NOTE: safari requires https, so ngrok is used for local development and must be replaced here
// const devConfig = {
//   websiteName: 'Coliving',
//   websitePushID: 'web.co.coliving.staging',
//   appUrl: 'http://localhost:3000',
//   identityUrl: 'https://0ef6caf4.ngrok.io', // Replace with https ngrok link
//   appUrls: [],
//   cert: fs.readFileSync(path.join(__dirname, '/coliving.pushpackage/stagingCert.pem')),
//   key: fs.readFileSync(path.join(__dirname, '/coliving.pushpackage/stagingKey.pem')),
//   output: 'devPushPackage.zip'
// }

// Staging
// const stagingConfig = {
//   websiteName: 'Coliving',
//   websitePushID: 'web.co.coliving.staging',
//   appUrl: 'https://staging.coliving.lol',
//   identityUrl: 'https://identityservice.staging.coliving.lol',
//   appUrls: ['https://joey.coliving.lol', 'https://ray.coliving.lol', 'https://michael.coliving.lol', 'https://forrest.coliving.lol'],
//   cert: fs.readFileSync(path.join(__dirname, '/coliving.pushpackage/stagingCert.pem')),
//   key: fs.readFileSync(path.join(__dirname, '/coliving.pushpackage/stagingKey.pem')),
//   output: 'stagingPushPackage.zip'
// }

const prodConfig = {
  websiteName: 'Coliving',
  websitePushID: 'web.co.coliving',
  appUrl: 'https://coliving.lol',
  identityUrl: 'https://identityservice.coliving.lol',
  appUrls: [],
  cert: fs.readFileSync(path.join(__dirname, './coliving.pushpackage/prodCert.pem')),
  key: fs.readFileSync(path.join(__dirname, './coliving.pushpackage/prodKey.pem')),
  output: 'productionPushPackage.zip'
}

// Change the config to be local / staging / prod
let config = prodConfig

const websiteJson = pushLib.websiteJSON(
  config.websiteName,
  config.websitePushID,
  [config.appUrl, config.identityUrl, ...config.appUrls], // allowedDomains
  `${config.appUrl}/feed?openNotifications=true`, // urlFormatString
  1000000000000000, // authenticationToken (zeroFilled to fit 16 chars)
  `${config.identityUrl}/push_notifications/safari` // webServiceURL (Must be https!)
)

pushLib.generatePackage(
  websiteJson, // The object from before / your own website.json object
  path.join(__dirname, '/coliving.pushpackage/icon.iconsets'), // Folder containing the iconset
  config.cert, // Certificate
  config.key, // Private Key
  intermediate // Intermediate certificate
)
  .pipe(fs.createWriteStream(config.output))
  .on('finish', function () {
    console.log('pushPackage.zip is ready.')
  })
