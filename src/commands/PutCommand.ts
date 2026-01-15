import {
  PutCommand as NativePutCommand,
  PutCommandInput as NativePutCommandInput,
  PutCommandOutput as NativePutCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { resolveGeneratedFields } from '~/internal/resolveGeneratedFields'
import { withDecodeMiddleware } from '~/middleware/decodeMiddleware'
import { Entity } from '~/types/Entity'
import { InferEntity, InferEntityInput } from '~/types/InferEntity'

/**
 * Custom PutCommandInput that allows an optional Entity.
 */
export type PutCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any>
    ? Omit<NativePutCommandInput, 'TableName' | 'Item'> & {
        TableName?: string
        Entity: TEntity
        Item: InferEntityInput<TEntity>
      }
    : NativePutCommandInput & {
        Entity?: undefined
      }

export type PutCommandOutput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined
> = NativePutCommandOutput &
  (TEntity extends Entity<any, any, any, any, any, any, any, any, any, any>
    ? {
        DecodedAttributes?: InferEntity<TEntity>
      }
    : {})

/**
 * Custom PutCommand wrapper.
 */
export class PutCommand<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined
> extends NativePutCommand {
  private entity?: Entity<any, any, any, any, any, any, any, any, any, any>

  constructor(input: PutCommandInput<TEntity>) {
    if (!('Entity' in input) || !input.Entity) {
      super(input as NativePutCommandInput)
      return
    }

    const { Entity: entity, Item, TableName, ...rest } = input
    const { table, schema, transform } = entity
    const effectiveTableName = TableName ?? table.name

    // 1. Validate & Parse Item
    const parsedItem = schema.parse(Item)

    // 2. Generate Fields (Keys, TTL, Indexes, Discriminator)
    const generatedFields = resolveGeneratedFields(entity, parsedItem)

    // 3. Encode
    // Combine parsed item with generated fields
    const itemWithGenerated = { ...parsedItem, ...generatedFields }

    // If transform exists, encode. Otherwise use identity.
    const encodedItem = transform ? transform.encode(itemWithGenerated) : itemWithGenerated

    // 4. Overwrite generated fields to ensure consistency
    const finalItem = { ...encodedItem, ...generatedFields }

    const superInput = {
      TableName: effectiveTableName,
      Item: finalItem,
      ...rest
    }

    super(superInput as NativePutCommandInput)

    this.entity = entity

    withDecodeMiddleware(this.middlewareStack, this.entity, effectiveTableName, 'PutCommand')
  }
}
