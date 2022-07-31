const { handleResponse, successResponse, errorResponseBadRequest, errorResponseServerError } = require('../apiHelpers')
const models = require('../models')
const handlebars = require('handlebars')
const fs = require('fs')
const path = require('path')
const authMiddleware = require('../authMiddleware')

const getEmailTemplate = (path) => handlebars.compile(
  fs.readFileSync(path).toString()
)

const welcomeTemplatePath = path.resolve(__dirname, '../notifications/emails/welcome.html')
const welcomeTemplate = getEmailTemplate(welcomeTemplatePath)

const welcomeDownloadTemplatePath = path.resolve(__dirname, '../notifications/emails/welcomeDownload.html')
const welcomeDownloadTemplate = getEmailTemplate(welcomeDownloadTemplatePath)

module.exports = function (app) {
  /**
   * Send the welcome email information to the requested account
   */
  app.post('/email/welcome', authMiddleware, handleResponse(async (req, res, next) => {
    let mg = req.app.get('mailgun')
    if (!mg) {
      req.logger.error('Missing api key')
      // Short-circuit if no api key provided, but do not error
      return successResponse({ msg: 'No mailgun API Key found', status: true })
    }

    let { name, isNativeMobile = false } = req.body
    if (!name) {
      return errorResponseBadRequest('Please provide a name')
    }

    const existingUser = await models.User.findOne({
      where: { id: req.user.id }
    })

    if (!existingUser) {
      return errorResponseBadRequest('Invalid signature provided, no user found')
    }

    const walletAddress = existingUser.walletAddress
    const htmlTemplate = isNativeMobile ? welcomeTemplate : welcomeDownloadTemplate
    const copyrightYear = new Date().getFullYear().toString()
    const welcomeHtml = htmlTemplate({
      name,
      copyright_year: copyrightYear
    })

    const emailParams = {
      from: 'The Coliving Team <team@coliving.lol>',
      to: existingUser.email,
      bcc: 'forrest@coliving.lol',
      subject: 'The Automated Welcome Email',
      html: welcomeHtml
    }
    try {
      await new Promise((resolve, reject) => {
        mg.messages().send(emailParams, (error, body) => {
          if (error) {
            reject(error)
          }
          resolve(body)
        })
      })
      if (isNativeMobile) {
        await models.UserEvents.upsert({
          walletAddress,
          hasSignedInNativeMobile: true
        })
      } else {
        await models.UserEvents.upsert({
          walletAddress,
          hasSignedInNativeMobile: false
        })
      }
      return successResponse({ status: true })
    } catch (e) {
      console.log(e)
      return errorResponseServerError(e)
    }
  }))
}
