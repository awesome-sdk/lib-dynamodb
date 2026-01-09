import { ZodynamoError } from './ZodynamoError'

/**
 * Error thrown when an item is not found during a FindOne operation
 * where .orThrow() was called.
 */
export class ItemNotFoundError extends ZodynamoError {
  constructor(
    public readonly entityName: string,
    public readonly key: Record<string, unknown>
  ) {
    super(`Item not found for entity "${entityName}"`)
  }
}
