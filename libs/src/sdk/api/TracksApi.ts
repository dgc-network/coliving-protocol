import type { DiscoveryProvider } from '../../services/discoveryProvider'
import { BASE_PATH, RequiredError } from './generated/default/runtime'

import {
  Configuration,
  StreamAgreementRequest,
  AgreementsApi as GeneratedAgreementsApi
} from './generated/default'

export class AgreementsApi extends GeneratedAgreementsApi {
  discoveryNode: DiscoveryProvider

  constructor(configuration: Configuration, discoveryNode: DiscoveryProvider) {
    super(configuration)
    this.discoveryNode = discoveryNode
  }

  /**
   * Get the url of the agreement's streamable mp3 file
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

    const path = `/agreements/{agreement_id}/stream`.replace(
      `{${'agreement_id'}}`,
      encodeURIComponent(String(requestParameters.agreementId))
    )
    const host = await this.discoveryNode.getHealthyDiscoveryProviderEndpoint(0)
    return `${host}${BASE_PATH}${path}`
  }
}
