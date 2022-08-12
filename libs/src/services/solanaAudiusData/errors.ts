import { ProgramError } from '@project-serum/anchor'
import * as ColivingData from '@audius/anchor-audius-data'

/**
 * All errors returned by Anchor Coliving Data
 */

export const CustomColivingDataErrors = new Map(
  ColivingData.idl.errors.map(({ code, msg }) => [code, msg])
)
export const colivingDataErrorMapping = {
  fromErrorCode: (errorCode: number) => {
    const programError = ProgramError.parse(
      `"Custom":${errorCode.toString()}}`,
      CustomColivingDataErrors
    )
    if (programError === null) return 'UNKNOWN'
    return programError.msg
  }
}
