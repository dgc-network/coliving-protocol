import assert from 'assert'
import nock from 'nock'

import { timeRequests } from './network'

const setupRequest = (
  url: string,
  delay: number,
  version: string,
  status = 200
) => {
  const req = { url }
  nock(req.url).get('/').delay(delay).reply(status, {
    data: {
      version
    }
  })
  return req
}

describe('timeRequests()', () => {
  it('sortByVersion = true', async () => {
    const requests = [
      setupRequest('https://fastest.coliving.co', 50, '1.2.3'),
      setupRequest('https://fastAndAhead.coliving.co', 100, '1.2.4'),
      setupRequest('https://behind.coliving.co', 100, '1.2.2'),
      setupRequest('https://slow.coliving.co', 500, '1.2.3'),
      setupRequest('https://error.coliving.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: true
    })

    assert.strictEqual(res[0]?.request.url, 'https://fastAndAhead.coliving.co')
    assert.strictEqual(res[1]?.request.url, 'https://fastest.coliving.co')
    assert.strictEqual(res[2]?.request.url, 'https://slow.coliving.co')
    assert.strictEqual(res[3]?.request.url, 'https://behind.coliving.co')
    assert.strictEqual(res[4]?.request.url, 'https://error.coliving.co')
  })

  it('sortByVersion = false', async () => {
    const requests = [
      setupRequest('https://fastest.coliving.co', 50, '1.2.3'),
      setupRequest('https://fastAndAhead.coliving.co', 100, '1.2.4'),
      setupRequest('https://fastAndBehind.coliving.co', 100, '1.2.2'),
      setupRequest('https://slow.coliving.co', 500, '1.2.3'),
      setupRequest('https://slowAndError.coliving.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: false,
      currentVersion: '1.2.3'
    })

    // All healthy nodes with valid version should be sorted by request duration, remaining by version then duration
    assert.strictEqual(res[0]?.request.url, 'https://fastest.coliving.co')
    assert.strictEqual(res[1]?.request.url, 'https://fastAndAhead.coliving.co')
    assert.strictEqual(res[2]?.request.url, 'https://slow.coliving.co')
    assert.strictEqual(res[3]?.request.url, 'https://fastAndBehind.coliving.co')
    assert.strictEqual(res[4]?.request.url, 'https://slowAndError.coliving.co')
  })

  it('respects an equivalency delta', async () => {
    const allResults: string[] = []
    for (let i = 0; i < 20; ++i) {
      const requests = [
        setupRequest('https://cohort1a.coliving.co', 1, '1.2.3'),
        setupRequest('https://cohort1b.coliving.co', 1, '1.2.3'),
        setupRequest('https://cohort1c.coliving.co', 1, '1.2.3'),

        setupRequest('https://cohort2a.coliving.co', 100, '1.2.3'),
        setupRequest('https://cohort2b.coliving.co', 101, '1.2.3'),
        setupRequest('https://cohort2c.coliving.co', 102, '1.2.3'),

        setupRequest('https://cohort3a.coliving.co', 200, '1.2.3'),
        setupRequest('https://cohort3b.coliving.co', 220, '1.2.3'),
        setupRequest('https://cohort3c.coliving.co', 205, '1.2.3')
      ]
      const res = await timeRequests({
        requests,
        sortByVersion: true,
        equivalencyDelta: 50
      })
      allResults.push(res.map((r) => r.request.url).join(''))

      // Ensure that each round of testing separates by cohors
      assert(res[0]?.request.url.startsWith('https://cohort1'))
      assert(res[1]?.request.url.startsWith('https://cohort1'))
      assert(res[2]?.request.url.startsWith('https://cohort1'))

      assert(res[3]?.request.url.startsWith('https://cohort2'))
      assert(res[4]?.request.url.startsWith('https://cohort2'))
      assert(res[5]?.request.url.startsWith('https://cohort2'))

      assert(res[6]?.request.url.startsWith('https://cohort3'))
      assert(res[7]?.request.url.startsWith('https://cohort3'))
      assert(res[8]?.request.url.startsWith('https://cohort3'))
    }

    // Make sure there is some variance
    assert(!allResults.every((val) => val === allResults[0]))
  }).timeout(10000)

  it('filterNonResponsive = true', async () => {
    const requests = [
      setupRequest('https://fastest.coliving.co', 50, '1.2.3'),
      setupRequest('https://fast.coliving.co', 100, '1.2.3'),
      setupRequest('https://fastAndBehind.coliving.co', 100, '1.2.2'),
      setupRequest('https://slow.coliving.co', 500, '1.2.3'),
      setupRequest('https://slowAndError.coliving.co', 500, '1.2.3', 404)
    ]

    const res = await timeRequests({
      requests,
      sortByVersion: true,
      filterNonResponsive: true,
      timeout: 150
    })

    assert.strictEqual(res[0]?.request.url, 'https://fastest.coliving.co')
    assert.strictEqual(res[1]?.request.url, 'https://fast.coliving.co')
    assert.strictEqual(res[2]?.request.url, 'https://fastAndBehind.coliving.co')
  })
})
