const assert = require('assert')
const request = require('supertest')

const { getApp } = require('./lib/app')
const { getLibsMock } = require('./lib/libsMock')
const {
  NAMESPACE_PREFIX
} = require('../src/services/prometheusMonitoring/prometheus.constants')

describe('test Prometheus metrics', async function () {
  let app, server, libsMock

  /** Setup app + global test vars */
  beforeEach(async function () {
    libsMock = getLibsMock()

    const appInfo = await getApp(libsMock)

    app = appInfo.app
    server = appInfo.server
  })

  afterEach(async function () {
    await server.close()
  })

  it('Checks that GET /prometheus_metrics is healthy and exposes default metrics', async function () {
    await request(app).get('/health_check')

    const resp = await request(app).get('/prometheus_metrics').expect(200)
    assert.ok(
      resp.text.includes(
        NAMESPACE_PREFIX + '_default_' + 'process_cpu_user_seconds_total'
      )
    )

    assert.ok(
      resp.text.includes(NAMESPACE_PREFIX + '_http_request_duration_seconds')
    )
  })

  it('Checks that hitting unregistered routes does not digital_content prometheus metrics', async function () {
    await request(app).get('/blahblahblah')
    const resp = await request(app).get('/prometheus_metrics').expect(200)

    assert.ok(!resp.text.includes('blahblahblah'))
  })

  it('Checks the middleware agreements routes with route params', async function () {
    await request(app).get('/ipfs/QmVickyWasHere')
    await request(app).get('/content/QmVickyWasHere')

    const resp = await request(app).get('/prometheus_metrics').expect(200)

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="0.2",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="0.5",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="1",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="4",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="15",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )
    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="60",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )
    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_bucket{le="+Inf",status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_sum{status_code="400",method="GET",path="/ipfs/:CID"}`
      )
    )

    assert.ok(
      resp.text.includes(
        `coliving_cn_http_request_duration_seconds_count{status_code="400",method="GET",path="/ipfs/:CID"} 2`
      )
    )

    assert.ok(!resp.text.includes('/content/:CID'))
  })
})
