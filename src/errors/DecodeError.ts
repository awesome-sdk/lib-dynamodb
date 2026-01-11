import { ZodynamoError } from './ZodynamoError'

export class DecodeError extends ZodynamoError {
  constructor(
    public readonly entityName: string,
    public readonly tableName: string,
    public readonly operation: string,
    public readonly cause: unknown
  ) {
    super(`Failed to decode item from table ${tableName} for entity ${entityName}`)
  }
}
