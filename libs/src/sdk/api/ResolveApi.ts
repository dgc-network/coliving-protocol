import {
  HTTPHeaders,
  ContentList,
  RequiredError,
  Agreement,
  User
} from './generated/default'
import {
  ResolveApi as GeneratedResolveApi,
  ResolveRequest
} from './generated/default/apis/resolveApi'

export class ResolveApi extends GeneratedResolveApi {
  /**
   * Resolves a provided Coliving app URL to the API resource it represents
   */
  async resolve<T extends Agreement | ContentList | User>(
    requestParameters: ResolveRequest
  ): Promise<T> {
    if (requestParameters.url === null || requestParameters.url === undefined) {
      throw new RequiredError(
        'agreementId',
        'Required parameter requestParameters.url was null or undefined when calling resolve.'
      )
    }

    const queryParameters: any = {}

    if (requestParameters.url !== undefined) {
      queryParameters.url = requestParameters.url
    }

    const headerParameters: HTTPHeaders = {}

    return await this.request({
      path: `/resolve`,
      method: 'GET',
      headers: headerParameters,
      query: queryParameters
    })
  }
}
