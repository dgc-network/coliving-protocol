import type { DiscoveryNode } from '../../services/discoveryNode'
import { BASE_PATH, RequiredError } from './generated/default/runtime'

import {
  Configuration,
  StreamAgreementRequest,
  AgreementsApi as GeneratedAgreementsApi
} from './generated/default'

export class AgreementsApi extends GeneratedAgreementsApi {
  discoveryNode: DiscoveryNode

  constructor(configuration: Configuration, discoveryNode: DiscoveryNode) {
    super(configuration)
    this.discoveryNode = discoveryNode
  }

  /**
   * Get the url of the digital_content's streamable mp3 file
   */
  async streamAgreement(requestParameters: StreamAgreementRequest): Promise<string> {
    if (
      requestParameters.agreementId === null ||
      requestParameters.agreementId === undefined
    ) {
      throw new RequiredError(
        'agreementId',
        'Required parameter requestParameters.agreementId was null or undefined when calling getAgreement.'
      )
    }

    const path = `/agreements/{digital_content_id}/stream`.replace(
      `{${'digital_content_id'}}`,
      encodeURIComponent(String(requestParameters.agreementId))
    )
    const host = await this.discoveryNode.getHealthyDiscoveryNodeEndpoint(0)
    return `${host}${BASE_PATH}${path}`
  }
}
