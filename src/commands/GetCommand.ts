import {
  GetCommand as NativeGetCommand,
  GetCommandInput as NativeGetCommandInput,
  GetCommandOutput as NativeGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { resolveKey } from '~/internal/resolveKey'
import { resolveProjections } from '~/internal/resolveProjections'
import { withDecodeMiddleware } from '~/middleware/decodeMiddleware'
import { Entity } from '~/types/Entity'
import { FieldPath, PickByPaths } from '~/types/FieldPath'
import { InferEntity } from '~/types/InferEntity'
import { Table } from '~/types/Table'

/**
 * Infers the structured Key shape ({ hash, range? }) from an Entity.
 * Also allows for raw(<scalar>) values for direct access.
 */
export type EntityKeyInput<TEntity> =
  TEntity extends Entity<
    infer TTable,
    any,
    infer TItem,
    infer THashKeyFields,
    infer TRangeKeyFields,
    any,
    any,
    any,
    any
  >
    ? TTable extends Table<infer TFields>
      ? {
          hash: PickByPaths<TItem, THashKeyFields[number]>
        } & (TTable['primaryIndex']['rangeKey'] extends string
          ? {
              range: PickByPaths<TItem, TRangeKeyFields[number]>
            }
          : {})
      : never
    : never

/**
 * Custom GetCommandInput that allows an optional Entity.
 * - If Entity is NOT provided, TableName is required (standard behavior).
 * - If Entity IS provided, TableName is optional (can be inferred or overridden).
 * - If Entity IS provided, Key must match the Entity's key structure.
 * - If Entity IS provided, AttributesToGet must be valid field paths (dot or bracket notation) of the Entity.
 * - If Entity IS provided, ProjectionExpression and ExpressionAttributeNames are disallowed.
 */
export type GetCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined,
  TAttributesToGet extends readonly string[] | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>
    ? Omit<
        NativeGetCommandInput,
        | 'TableName'
        | 'Key'
        | 'AttributesToGet'
        | 'ProjectionExpression'
        | 'ExpressionAttributeNames'
      > & {
        TableName?: string
        Entity: TEntity
        Key: EntityKeyInput<TEntity>
        AttributesToGet?: TAttributesToGet extends readonly FieldPath<InferEntity<TEntity>>[]
          ? TAttributesToGet
          : readonly FieldPath<InferEntity<TEntity>>[]
        ProjectionExpression?: never
        ExpressionAttributeNames?: never
      }
    : NativeGetCommandInput & {
        Entity?: undefined
        // Ensure strictly no Entity implies no custom AttributesToGet logic
      }

export type GetCommandOutput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined,
  TAttributesToGet extends readonly string[] | undefined = undefined
> = NativeGetCommandOutput &
  (TEntity extends Entity<any, any, any, any, any, any, any, any, any>
    ? {
        DecodedItem?: TAttributesToGet extends readonly string[]
          ? PickByPaths<InferEntity<TEntity>, TAttributesToGet[number]>
          : InferEntity<TEntity>
      }
    : {})

/**
 * Custom GetCommand wrapper.
 * Currently works as a drop-in replacement for NativeGetCommand.
 * Entity handling logic is not yet implemented.
 */
export class GetCommand<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined,
  const TAttributesToGet extends readonly string[] | undefined = undefined
> extends NativeGetCommand {
  private entity?: Entity<any, any, any, any, any, any, any, any, any, any>
  private middlewareAdded = false

  constructor(input: GetCommandInput<TEntity, TAttributesToGet>) {
    if (!('Entity' in input) || !input.Entity) {
      super(input as NativeGetCommandInput)
      return
    }

    const { Entity: entity, Key, TableName, AttributesToGet, ...rest } = input
    const { table } = entity
    const effectiveTableName = TableName ?? table.name

    const nativeKey = resolveKey(entity, Key, effectiveTableName)

    // Handle AttributesToGet -> ProjectionExpression conversion for proper nested path support
    let projectionExpression: string | undefined
    let expressionAttributeNames: Record<string, string> | undefined
    let attributesToGetNative: string[] | undefined

    if (AttributesToGet) {
      if (entity) {
        const result = resolveProjections(AttributesToGet as unknown as string[])
        projectionExpression = result.ProjectionExpression
        expressionAttributeNames = result.ExpressionAttributeNames
      } else {
        // Pass through if legacy (though types might block this, runtime safety)
        attributesToGetNative = AttributesToGet as unknown as string[]
      }
    }

    super({
      TableName: effectiveTableName,
      Key: nativeKey,
      ProjectionExpression: projectionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      AttributesToGet: attributesToGetNative,
      ...rest
    } as NativeGetCommandInput)

    this.entity = entity

    if (this.entity) {
      if (this.middlewareAdded) {
        return
      }

      withDecodeMiddleware(this.middlewareStack, this.entity, effectiveTableName, 'GetCommand')
      this.middlewareAdded = true
    }
  }
}
