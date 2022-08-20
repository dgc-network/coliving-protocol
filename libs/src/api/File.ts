import urlJoin from 'proper-url-join'

import axios, { ResponseType } from 'axios'
import { Base, BaseConstructorArgs, Services } from './base'
import { raceRequests } from '../utils/network'
import retry from 'async-retry'
import type { Users } from './Users'
import type { Nullable } from '../utils'

/**
 * Downloads a file using an element in the DOM
 */
const downloadURL = (url: string, filename: string) => {
  if (document) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.download = filename
    link.click()
    return
  }
  throw new Error('No body document found')
}

export class File extends Base {
  User: Users

  constructor(user: Users, ...args: BaseConstructorArgs) {
    super(...args)

    this.User = user
  }

  /**
   * Fetches a file from Content Node with a given CID.
   * @param cid IPFS content identifier
   * @param creatorNodeGateways Content Node gateways to fetch content from
   * @param callback callback called on each successful/failed fetch with
   *  [String, Bool](gateway, succeeded)
   *  Can be used for agreementing metrics on which gateways were used.
   */
  async fetchCID(
    cid: string,
    creatorNodeGateways: string[],
    callback: Nullable<(url: string) => void> = null,
    responseType: ResponseType = 'blob',
    agreementId = null
  ) {
    const urls: string[] = []

    creatorNodeGateways.forEach((gateway) => {
      let gatewayWithCid = urlJoin(gateway, cid)
      if (agreementId)
        gatewayWithCid = urlJoin(gatewayWithCid, { query: { agreementId } })
      urls.push(gatewayWithCid)
    })

    return await retry(
      async (bail) => {
        try {
          const { response, errored } = await raceRequests(
            urls,
            callback!,
            {
              method: 'get',
              responseType
            },
            /* timeout */ null
          )

          if (!response) {
            const allUnauthorized = errored.every(
              // @ts-expect-error not valid axios error
              (error) => error.response.status === 403
            )
            if (allUnauthorized) {
              // In the case for a 403, do not retry fetching
              bail(new Error('Unauthorized'))
              return
            }
            throw new Error(`Could not fetch ${cid}`)
          }
          return response
        } catch (e) {
          // TODO: Remove this fallback logic when no more users/agreements/content lists
          // contain "legacy" image formats (no dir cid)
          if (cid.includes('/')) {
            // dirCID -- an image
            console.debug(`Attempted to fetch image ${cid} via legacy method`)
            // Try legacy image format
            // Lop off anything like /480x480.jpg in the CID
            const legacyUrls = creatorNodeGateways.map((gateway) =>
              urlJoin(gateway, cid.split('/')[0])
            )
            try {
              const { response } = await raceRequests(
                legacyUrls,
                callback!,
                {
                  method: 'get',
                  responseType
                },
                /* timeout */ null
              )
              if (!response)
                throw new Error(`Could not fetch ${cid} via legacy method`)
              return response
            } catch (e) {
              throw new Error(`Failed to retrieve ${cid} by legacy method`)
            }
          }

          // Throw so we can retry
          throw new Error(`Failed to retrieve ${cid}`)
        }
      },
      {
        minTimeout: 500,
        maxTimeout: 4000,
        factor: 3,
        retries: 5,
        onRetry: (err: any, i) => {
          // eslint-disable-next-line no-console
          console.log(`FetchCID attempt ${i} error: ${err}`)
        }
      }
    )
  }

  /**
   * Fetches a file from Content Node with a given CID. Follows the same pattern
   * as fetchCID, but resolves with a download of the file rather than
   * returning the response content.
   * @param cid IPFS content identifier
   * @param creatorNodeGateways Content Node gateways to fetch content from
   * @param filename optional filename for the download
   */
  async downloadCID(
    cid: string,
    creatorNodeGateways: string[],
    filename: string
  ) {
    const urls = creatorNodeGateways.map((gateway) =>
      urlJoin(gateway, cid, { query: { filename } })
    )

    try {
      // Races requests and fires the download callback for the first endpoint to
      // respond with a valid response to a `head` request.
      const { response } = await raceRequests(
        urls,
        (url) => downloadURL(url, filename),
        {
          method: 'head'
        },
        /* timeout */ 10000
      )
      return response
    } catch (e) {
      throw new Error(`Failed to retrieve ${cid}`)
    }
  }

  /**
   * Checks if a CID exists on a Content Node.
   * @param cid IPFS content identifier
   * @param creatorNodeGateways Content Node gateways to fetch content from
   * Eg. creatorNodeGateways = ["https://creatornode.coliving.lol/ipfs/", "https://creatornode2.coliving.lol/ipfs/"]
   */
  async checkIfCidAvailable(cid: string, creatorNodeGateways: string[]) {
    const exists: Record<string, unknown> = {}

    await Promise.all(
      creatorNodeGateways.map(async (gateway) => {
        try {
          const { status } = await axios({
            url: urlJoin(gateway, cid),
            method: 'head'
          })
          exists[gateway] = status === 200
        } catch (err) {
          exists[gateway] = false
        }
      })
    )

    return exists
  }

  /**
   * Uploads an image to the connected Content Node.
   * @param file
   */
  async uploadImage(file: globalThis.File, square: boolean, timeoutMs = null) {
    this.REQUIRES(Services.CONTENT_NODE)
    this.FILE_IS_VALID(file)

    // Assign a content_node_endpoint to the user if necessary
    await this.User.assignReplicaSetIfNecessary()

    const resp = await this.creatorNode.uploadImage(
      file,
      square,
      /* onProgress */ undefined,
      timeoutMs
    )
    return resp
  }
}
