import { MiddlewareStack } from '@aws-sdk/types'

import { DecodeError } from '~/errors/DecodeError'
import { Entity } from '~/types/Entity'

/**
 * Adds a middleware to the stack that decodes the native DynamoDB output
 * (Item or Attributes) into a typed DecodedItem/DecodedAttributes
 * using the Entity's transform.decode function.
 *
 * @param stack The middleware stack to add to
 * @param entity The Entity definition
 * @param tableName The effective table name (for error context)
 * @param operation The operation name (e.g. 'GetCommand', 'PutCommand')
 */
export function withDecodeMiddleware(
  stack: MiddlewareStack<any, any>,
  entity: Entity<any, any, any, any, any, any, any, any, any, any>,
  tableName: string,
  operation: string
): void {
  /*
   * We use an instance property on the command to track if middleware is added,
   * but since this function is standalone, we rely on the caller to manage idempotency
   * if needed. However, standard middleware stacking usually happens once per command instance.
   */
  stack.add(
    (next: any) => async (args: any) => {
      const result = await next(args)
      const output = result.output

      if (!output) return result

      try {
        if (output.Item) {
          if (entity.transform) {
            output.DecodedItem = entity.transform.decode(output.Item)
          } else {
            output.DecodedItem = entity.schema.parse(output.Item)
          }
        }

        if (output.Attributes) {
          if (entity.transform) {
            output.DecodedAttributes = entity.transform.decode(output.Attributes)
          } else {
            output.DecodedAttributes = entity.schema.parse(output.Attributes)
          }
        }
      } catch (error) {
        throw new DecodeError(entity.name, tableName, operation, error)
      }

      return result
    },
    {
      step: 'initialize',
      priority: 'low'
    }
  )
}
