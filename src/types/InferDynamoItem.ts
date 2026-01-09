import { Entity, EntityTransform } from '~/types/Entity'
import { EntityGeneratedFields } from '~/types/EntityGeneratedFields'
import { InferEntity } from '~/types/InferEntity'
import { Prettify } from '~/types/utils'

type DefaultDynamoItem<T extends Entity<any, any, any, any, any, any, any, any, any, any>> =
  Prettify<
    InferEntity<T> &
      EntityGeneratedFields<
        T['table'],
        Extract<T['globalIndexes'], Record<string, any>>,
        Extract<T['localIndexes'], Record<string, any>>,
        T['ttl'],
        T['entityType']
      >
  >

/**
 * Infers the complete DynamoDB item type for an Entity.
 *
 * This type combines three components:
 * 1. The base entity schema fields (from Zod schema)
 * 2. The DynamoDB primary key fields (pk/sk or custom names)
 * 3. The entity type discriminator field (if configured)
 *
 * Use this when you need the full shape of what's actually stored in
 * the DynamoDB table, including all internal key fields.
 *
 * @template T - The Entity type to infer from
 *
 * @example
 * ```ts
 * const userEntity = defineEntity(table, {
 *   schema: z.object({ id: z.string(), name: z.string() }),
 *   key: { hashKey: { fields: ['id'], calculate: ... } },
 *   entityType: 'USER'
 * })
 *
 * type UserItem = InferDynamoItem<typeof userEntity>
 * // Result: { id: string; name: string; pk: string; sk?: string; type?: 'USER' }
 * ```
 */
export type InferDynamoItem<T extends Entity<any, any, any, any, any, any, any, any, any, any>> = [
  Exclude<T['transform'], undefined>
] extends [never]
  ? DefaultDynamoItem<T>
  : Exclude<T['transform'], undefined> extends EntityTransform<any, any, infer R>
    ? R
    : DefaultDynamoItem<T>
