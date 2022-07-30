const { requestNotExcludedFromLogging } = require('./logging')

module.exports.handleResponse = (func) => {
  return async function (req, res, next) {
    try {
      const resp = await func(req, res, next)

      if (!isValidResponse(resp)) {
        throw new Error('Invalid response returned by function')
      }

      sendResponse(req, res, resp)
      next()
    } catch (error) {
      next(error)
    }
  }
}

const sendResponse = module.exports.sendResponse = (req, res, resp) => {
  const endTime = process.hrtime(req.startTime)
  const duration = Math.round(endTime[0] * 1e3 + endTime[1] * 1e-6)
  let logger = req.logger.child({
    statusCode: resp.statusCode,
    duration
  })
  if (resp.statusCode === 200) {
    if (requestNotExcludedFromLogging(req.originalUrl)) {
      logger.info('Success')
    }
  } else {
    logger = logger.child({
      errorMessage: resp.object.error
    })
    logger.info('Error processing request:', resp.object.error)
  }
  res.status(resp.statusCode).send(resp.object)
}

const isValidResponse = module.exports.isValidResponse = (resp) => {
  if (!resp || !resp.statusCode || !resp.object) {
    return false
  }

  return true
}

module.exports.successResponse = (obj = {}) => {
  return {
    statusCode: 200,
    object: obj
  }
}

const errorResponse = module.exports.errorResponse = (statusCode, message, extra = {}) => {
  return {
    statusCode: statusCode,
    object: { error: message, ...extra }
  }
}

module.exports.errorResponseUnauthorized = (message) => {
  return errorResponse(401, message)
}

module.exports.errorResponseForbidden = (message) => {
  return errorResponse(403, message)
}

module.exports.errorResponseBadRequest = (message) => {
  return errorResponse(400, message)
}

module.exports.errorResponseServerError = (message, extra = {}) => {
  return errorResponse(500, message, extra)
}
