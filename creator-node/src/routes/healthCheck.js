const express = require('express')
const {
  handleResponse,
  successResponse,
  errorResponseServerError
} = require('../apiHelpers')
const config = require('../config.js')

const path = require('path')
const versionInfo = require(path.join(process.cwd(), '.version.json'))

const { getMonitors, MONITORS } = require('../monitors/monitors')

const DiskManager = require('../diskManager')

const MAX_DB_CONNECTIONS = config.get('dbConnectionPoolMax')

const router = express.Router()

/**
 * Exposes current and max db connection stats.
 * Returns error if db connection threshold exceeded, else success.
 */
router.get(
  '/db_check',
  handleResponse(async (req, res) => {
    const verbose = req.query.verbose === 'true'
    const maxConnections =
      parseInt(req.query.maxConnections) || MAX_DB_CONNECTIONS

    // Get number of open DB connections
    const [numConnections, connectionInfo] = await getMonitors([
      MONITORS.DATABASE_CONNECTIONS,
      MONITORS.DATABASE_CONNECTION_INFO
    ])

    // Get detailed connection info
    let activeConnections = null
    let idleConnections = null
    if (connectionInfo) {
      activeConnections = connectionInfo.filter(
        (conn) => conn.state === 'active'
      ).length
      idleConnections = connectionInfo.filter(
        (conn) => conn.state === 'idle'
      ).length
    }

    const resp = {
      git: process.env.GIT_SHA,
      connectionStatus: {
        total: numConnections,
        active: activeConnections,
        idle: idleConnections
      },
      maxConnections: maxConnections
    }

    if (verbose) {
      resp.connectionInfo = connectionInfo
    }

    return numConnections >= maxConnections
      ? errorResponseServerError(resp)
      : successResponse(resp)
  })
)

router.get(
  '/version',
  handleResponse(async (req, res) => {
    if (config.get('isReadOnlyMode')) {
      return errorResponseServerError()
    }

    const info = {
      ...versionInfo,
      country: config.get('serviceCountry'),
      latitude: config.get('serviceLatitude'),
      longitude: config.get('serviceLongitude')
    }
    return successResponse(info)
  })
)

/**
 * Exposes current and max disk usage stats.
 * Returns error if max disk usage exceeded, else success.
 */
router.get(
  '/disk_check',
  handleResponse(async (req, res) => {
    const maxUsageBytes = parseInt(req.query.maxUsageBytes)
    const maxUsagePercent =
      parseInt(req.query.maxUsagePercent) || config.get('maxStorageUsedPercent')

    const storagePath = DiskManager.getConfigStoragePath()
    const [total, used] = await getMonitors([
      MONITORS.STORAGE_PATH_SIZE,
      MONITORS.STORAGE_PATH_USED
    ])
    const available = total - used

    const usagePercent = Math.round((used * 100) / total)

    const resp = {
      available: _formatBytes(available),
      total: _formatBytes(total),
      usagePercent: `${usagePercent}%`,
      maxUsagePercent: `${maxUsagePercent}%`,
      storagePath
    }

    if (maxUsageBytes) {
      resp.maxUsage = _formatBytes(maxUsageBytes)
    }

    if (
      usagePercent >= maxUsagePercent ||
      (maxUsageBytes && total - available >= maxUsageBytes)
    ) {
      return errorResponseServerError(resp)
    } else {
      return successResponse(resp)
    }
  })
)

router.get(
  '/ip_check',
  handleResponse(async (req, res) => {
    const { ip } = req

    return successResponse({
      ip: ip || ''
    })
  })
)

function _formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

module.exports = router
