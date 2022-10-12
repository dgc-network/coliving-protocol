const Bull = require('bull')
const { logger: genericLogger } = require('./logging')
const config = require('./config')
const redisClient = require('./redis')

// Processing fns
const {
  handleDigitalContentRoute: digitalContentUpload,
  handleTranscodeAndSegment: transcodeAndSegment,
  handleTranscodeHandOff: transcodeHandOff
} = require('./components/digitalContents/digitalContentsComponentService')
const {
  processTranscodeAndSegments
} = require('./components/digitalContents/digitalContentUploadManager')

const MAX_CONCURRENCY = 100
const EXPIRATION_SECONDS = 86400 // 24 hours in seconds
const PROCESS_NAMES = Object.freeze({
  digitalContentUpload: 'digitalContentUpload',
  transcodeAndSegment: 'transcodeAndSegment',
  processTranscodeAndSegments: 'processTranscodeAndSegments',
  transcodeHandOff: 'transcodeHandOff'
})
const PROCESS_STATES = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  FAILED: 'FAILED'
})

const ASYNC_PROCESSING_QUEUE_HISTORY = 500

/**
 * This queue accepts jobs (any function) that needs to be processed asynchonously.
 * Once the job is complete, the response is added to redis. The response can be
 * accessed through the `/async_processing_status` route by passing in the job uuid
 * as part of the query params.
 */

class AsyncProcessingQueue {
  constructor(libs, prometheusRegistry) {
    this.queue = new Bull('asyncProcessing', {
      redis: {
        host: config.get('redisHost'),
        port: config.get('redisPort')
      },
      defaultJobOptions: {
        removeOnComplete: ASYNC_PROCESSING_QUEUE_HISTORY,
        removeOnFail: ASYNC_PROCESSING_QUEUE_HISTORY
      }
    })

    prometheusRegistry.startQueueMetrics(this.queue)

    this.libs = libs

    this.queue.process(MAX_CONCURRENCY, async (job, done) => {
      await this.processTask(job, done)
    })

    this.PROCESS_NAMES = PROCESS_NAMES
    this.PROCESS_STATES = PROCESS_STATES

    this.getAsyncProcessingQueueJobs =
      this.getAsyncProcessingQueueJobs.bind(this)
    this.constructProcessKey = this.constructAsyncProcessingKey.bind(this)
  }

  async processTask(job, done) {
    const { logContext, task } = job.data

    const func = this.getFn(task)

    if (task === PROCESS_NAMES.transcodeHandOff) {
      const { transcodeFilePath, segmentFileNames, sp } =
        await this.monitorProgress(task, transcodeHandOff, job.data)

      if (!transcodeFilePath || !segmentFileNames) {
        this.logStatus(
          'Failed to hand off transcode. Retrying upload to current node...'
        )
        await this.addDigitalContentUploadTask({
          logContext,
          req: job.data.req
        })
        done(null, {})
      } else {
        this.logStatus(
          `Succesfully handed off transcoding and segmenting to sp=${sp}. Wrapping up remainder of digital_content association..`
        )
        await this.addProcessTranscodeAndSegmentTask({
          logContext,
          req: { ...job.data.req, transcodeFilePath, segmentFileNames }
        })
        done(null, { response: { transcodeFilePath, segmentFileNames } })
      }
    } else {
      try {
        const response = await this.monitorProgress(task, func, job.data)
        done(null, { response })
      } catch (e) {
        this.logError(
          `Could not process taskType=${task} uuid=${
            logContext.requestID
          }: ${e.toString()}`,
          logContext
        )
        done(e.toString())
      }
    }
  }

  async logStatus(message, logContext = {}) {
    const logger = genericLogger.child(logContext)
    const { waiting, active, completed, failed, delayed } =
      await this.queue.getJobCounts()
    logger.info(
      `AsyncProcessingQueue: ${message} || active: ${active}, waiting: ${waiting}, failed ${failed}, delayed: ${delayed}, completed: ${completed} `
    )
  }

  async logError(message, logContext = {}) {
    const logger = genericLogger.child(logContext)
    const { waiting, active, completed, failed, delayed } =
      await this.queue.getJobCounts()
    logger.error(
      `AsyncProcessingQueue error: ${message} || active: ${active}, waiting: ${waiting}, failed ${failed}, delayed: ${delayed}, completed: ${completed}`
    )
  }

  // TODO: Make these jobs background processes

  async addDigitalContentUploadTask(params) {
    params.task = PROCESS_NAMES.digitalContentUpload
    return this.addTask(params)
  }

  async addTranscodeAndSegmentTask(params) {
    params.task = PROCESS_NAMES.transcodeAndSegment
    return this.addTask(params)
  }

  async addProcessTranscodeAndSegmentTask(params) {
    params.task = PROCESS_NAMES.processTranscodeAndSegments
    return this.addTask(params)
  }

  async addTranscodeHandOffTask(params) {
    params.task = PROCESS_NAMES.transcodeHandOff
    return this.addTask(params)
  }

  async addTask(params) {
    const { logContext, task } = params

    this.logStatus(
      `Adding ${task} task! uuid=${logContext.requestID}}`,
      logContext
    )

    const job = await this.queue.add(params)

    return job
  }

  /**
   * Depending on the task type, return the processing fn.
   *
   * @dev if this file gets any bigger, we should consider a factory class
   * @param {string} task a process in PROCESS_NAMES
   * @returns the processing fn
   */
  getFn(task) {
    switch (task) {
      // Called via /digital_content_async route (runs on primary)
      case PROCESS_NAMES.digitalContentUpload:
        return digitalContentUpload

      // Called via /transcode_and_segment (running on node that has been handed off digital_content)
      case PROCESS_NAMES.transcodeAndSegment:
        return transcodeAndSegment

      // Part 1 of transcode handoff flow - called via /digital_content_async if currentNodeShouldHandleTranscode = false (runs on primary)
      case PROCESS_NAMES.transcodeHandOff:
        return transcodeHandOff

      // Part 2 of transcode handoff flow - called by process function in this queue after transcodeHandoff successfully runs (runs on primary)
      case PROCESS_NAMES.processTranscodeAndSegments:
        return processTranscodeAndSegments

      default:
        return null
    }
  }

  /**
   * Processes the input function and adds the response to redis. Tasks will either be in a
   * IN_PROGRESS, DONE, or FAILED state.
   * @param {string} task a process in PROCESS_NAMES
   * @param {function} func the processing fn
   * @param {Object} param
   * @param {Object} param.logContext
   * @param {Object} param.req the request associated with the func
   * @returns the expected response from the func
   */
  async monitorProgress(task, func, { logContext, req }) {
    const uuid = logContext.requestID
    const redisKey = this.constructAsyncProcessingKey(uuid)

    let state = { task, status: PROCESS_STATES.IN_PROGRESS }
    this.logStatus(`Starting ${task}, uuid=${uuid}`, logContext)
    await redisClient.set(
      redisKey,
      JSON.stringify(state),
      'EX',
      EXPIRATION_SECONDS
    )

    let response
    try {
      response = await func({ logContext }, { ...req, libs: this.libs })
      state = { task, status: PROCESS_STATES.DONE, resp: response }
      this.logStatus(`Successful ${task}, uuid=${uuid}`, logContext)
      await redisClient.set(
        redisKey,
        JSON.stringify(state),
        'EX',
        EXPIRATION_SECONDS
      )
    } catch (e) {
      state = { task, status: PROCESS_STATES.FAILED, resp: e.message }
      this.logError(
        `Error with ${task}. uuid=${uuid}} resp=${JSON.stringify(e.message)}`,
        logContext
      )
      await redisClient.set(
        redisKey,
        JSON.stringify(state),
        'EX',
        EXPIRATION_SECONDS
      )

      throw e
    }

    return response
  }

  /**
   * Given the jobs, create a count of the type of tasks.
   * @param {Object} jobs jobs returned from the queue
   * @returns {Object} the number of jobs per task
   * Example response:
   *
   * {
   *    digitalContentUpload: 1,
   *    transcodeAndSegment: 4,
   *    processTranscodeAndSegments: 0,
   *    transcodeHandOff: 2
   *    total: 7
   * }
   *
   */
  getTasks(jobs) {
    const response = {
      digitalContentUpload: 0,
      transcodeAndSegment: 0,
      processTranscodeAndSegments: 0,
      transcodeHandOff: 0
    }

    jobs.forEach((job) => {
      response[job.data.task] += 1
    })

    response.total = jobs.length

    return response
  }

  async getAsyncProcessingQueueJobs() {
    const queue = this.queue
    const [waiting, active, failed] = await Promise.all([
      queue.getJobs(['waiting']),
      queue.getJobs(['active']),
      queue.getJobs(['failed'])
    ])

    const allTasks = {
      waiting: this.getTasks(waiting),
      active: this.getTasks(active),
      failed: this.getTasks(failed)
    }

    return allTasks
  }

  constructAsyncProcessingKey(uuid) {
    return `async:::${uuid}`
  }
}

module.exports = AsyncProcessingQueue
