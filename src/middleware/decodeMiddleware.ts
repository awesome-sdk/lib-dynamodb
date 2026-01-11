import { MiddlewareStack } from '@aws-sdk/types'

import { DecodeError } from '~/errors/DecodeError'
import { Entity } from '~/types/Entity'

/**
 * Adds a middleware to the stack that decodes the native DynamoDB output Item
 * into a typed DecodedItem using the Entity's transform.decode function.
 *
 * @param stack The middleware stack to add to
 * @param entity The Entity definition
 * @param tableName The effective table name (for error context)
 */
export function withDecodeMiddleware(
  stack: MiddlewareStack<any, any>,
  entity: Entity<any, any, any, any, any, any, any, any, any, any>,
  tableName: string
): void {
  /*
   * We use an instance property on the command to track if middleware is added,
   * but since this function is standalone, we rely on the caller to manage idempotency
   * if needed. However, standard middleware stacking usually happens once per command instance.
   */
  stack.add(
    (next: any) => async (args: any) => {
      const result = await next(args)
      if (result.output?.Item) {
        try {
          if (entity.transform) {
            result.output.DecodedItem = entity.transform.decode(result.output.Item)
          } else {
            result.output.DecodedItem = entity.schema.parse(result.output.Item)
          }
        } catch (error) {
          throw new DecodeError(entity.name, tableName, 'GetCommand', error)
        }
      }
      return result
    },
    {
      step: 'deserialize',
      priority: 'high'
    }
  )
}
