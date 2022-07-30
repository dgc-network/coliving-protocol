import { ProgramError } from '@project-serum/anchor'
import * as AudiusData from '@coliving/anchor-coliving-data'

/**
 * All errors returned by Anchor Coliving Data
 */

export const CustomAudiusDataErrors = new Map(
  AudiusData.idl.errors.map(({ code, msg }) => [code, msg])
)
export const colivingDataErrorMapping = {
  fromErrorCode: (errorCode: number) => {
    const programError = ProgramError.parse(
      `"Custom":${errorCode.toString()}}`,
      CustomAudiusDataErrors
    )
    if (programError === null) return 'UNKNOWN'
    return programError.msg
  }
}
