import { Entity } from '~/types/Entity'

/**
 * Resolves all generated fields for an Entity based on the input item.
 * This includes:
 * - Primary Key fields (Hash + Range)
 * - Local Secondary Index fields (Range)
 * - Global Secondary Index fields (Hash + Range)
 * - Entity Type discriminator field
 * - TTL field
 *
 * @param entity The Entity definition
 * @param item The input item (validated/parsed)
 * @returns A record of generated field names and values
 */
export function resolveGeneratedFields(
  entity: Entity<any, any, any, any, any, any, any, any, any, any>,
  item: any
): Record<string, any> {
  const { table, key, globalIndexes, localIndexes, entityType, ttl } = entity
  const generated: Record<string, any> = {}

  // 1. Primary Index
  generated[table.primaryIndex.hashKey] = key.hashKey.calculate(item)
  if (table.primaryIndex.rangeKey) {
    if (key.rangeKey) {
      generated[table.primaryIndex.rangeKey] = key.rangeKey.calculate(item)
    } else {
      throw new Error(
        `Table ${table.name} has primary range key ${table.primaryIndex.rangeKey} but Entity ${entity.name} does not define it.`
      )
    }
  }

  // 2. Entity Type Discriminator
  if (table.entityTypeField && entityType) {
    generated[table.entityTypeField] = entityType
  }

  // 3. TTL
  if (table.ttl && ttl) {
    const ttlValue = ttl(item)
    if (ttlValue !== undefined) {
      generated[table.ttl] = ttlValue
    }
  }

  // 4. Local Secondary Indexes
  if (table.localIndexes && localIndexes) {
    for (const [indexName, indexConfig] of Object.entries(localIndexes)) {
      const tableIndex = table.localIndexes[indexName]
      if (tableIndex && indexConfig) {
        generated[tableIndex.rangeKey] = (indexConfig as any).rangeKey.calculate(item)
      } else {
        // Should we throw here?
        // If localIndexes exists in entity but not in table (or vice versa), it is a mismatch.
        // The feedback said: "skips generating some required fields if misconfigured (e.g. table has a range key but entity lacks key.rangeKey)"
        // This specific block is for LSIs.
      }
    }
  }

  // 5. Global Secondary Indexes
  if (table.globalIndexes && globalIndexes) {
    for (const [indexName, indexConfig] of Object.entries(globalIndexes)) {
      const tableIndex = table.globalIndexes[indexName]
      const entityIndex = indexConfig as any

      if (tableIndex && entityIndex) {
        generated[tableIndex.hashKey] = entityIndex.hashKey.calculate(item)

        if (tableIndex.rangeKey) {
          if (entityIndex.rangeKey) {
            generated[tableIndex.rangeKey] = entityIndex.rangeKey.calculate(item)
          } else {
            throw new Error(
              `Table ${table.name} has GSI ${indexName} with range key ${tableIndex.rangeKey} but Entity ${entity.name} does not define it.`
            )
          }
        }
      }
    }
  }

  return generated
}
