import type { DiscoveryNode } from '../../services/discoveryNode'
import { BASE_PATH, RequiredError } from './generated/default/runtime'

import {
  Configuration,
  StreamDigitalContentRequest,
  DigitalContentsApi as GeneratedDigitalContentsApi
} from './generated/default'

export class DigitalContentsApi extends GeneratedDigitalContentsApi {
  discoveryNode: DiscoveryNode

  constructor(configuration: Configuration, discoveryNode: DiscoveryNode) {
    super(configuration)
    this.discoveryNode = discoveryNode
  }

  /**
   * Get the url of the digital_content's streamable mp3 file
   */
  async streamDigitalContent(requestParameters: StreamDigitalContentRequest): Promise<string> {
    if (
      requestParameters.digitalContentId === null ||
      requestParameters.digitalContentId === undefined
    ) {
      throw new RequiredError(
        'digitalContentId',
        'Required parameter requestParameters.digitalContentId was null or undefined when calling getDigitalContent.'
      )
    }

    const path = `/digital_contents/{digital_content_id}/stream`.replace(
      `{${'digital_content_id'}}`,
      encodeURIComponent(String(requestParameters.digitalContentId))
    )
    const host = await this.discoveryNode.getHealthyDiscoveryNodeEndpoint(0)
    return `${host}${BASE_PATH}${path}`
  }
}
