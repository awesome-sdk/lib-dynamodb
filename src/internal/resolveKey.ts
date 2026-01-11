import { Entity } from '~/types/Entity'

/**
 * Resolves the native DynamoDB Key from an Entity and input Key.
 * Validates that the input Key matches the Entity's primary index structure.
 *
 * @param entity The Entity definition
 * @param inputKey The structured input key
 * @param tableName The effective table name (for error messages)
 * @returns The native DynamoDB key object
 */
export function resolveKey(
  entity: Entity<any, any, any, any, any, any, any, any, any, any>,
  inputKey: any,
  tableName: string
): Record<string, any> {
  const { table, key } = entity
  const { hashKey: partitionKey, rangeKey: rangeKeyName } = table.primaryIndex

  const nativeKey: Record<string, any> = {
    [partitionKey]: key.hashKey.calculate(inputKey.hash)
  }

  if (rangeKeyName) {
    if (!key.rangeKey) {
      throw new Error(
        `Table ${table.name} has a range key ${rangeKeyName} but Entity ${entity.name} does not define a range key calculator.`
      )
    }

    if ('range' in inputKey && inputKey.range !== undefined) {
      nativeKey[rangeKeyName] = key.rangeKey.calculate(inputKey.range)
    } else {
      throw new Error(`Missing range key for table ${tableName}`)
    }
  }

  return nativeKey
}
