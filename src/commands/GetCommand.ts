import {
  GetCommand as NativeGetCommand,
  GetCommandInput as NativeGetCommandInput,
  GetCommandOutput as NativeGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { Entity } from '~/types/Entity'
import { DotPath, PickByPaths } from '~/types/FieldPath'
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
 * - If Entity IS provided, AttributesToGet must be valid dot-notation paths of the Entity.
 */
export type GetCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined,
  TAttributesToGet extends readonly string[] | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>
    ? Omit<NativeGetCommandInput, 'TableName' | 'Key' | 'AttributesToGet'> & {
        TableName?: string
        Entity: TEntity
        Key: EntityKeyInput<TEntity>
        AttributesToGet?: TAttributesToGet extends readonly DotPath<InferEntity<TEntity>>[]
          ? TAttributesToGet
          : readonly DotPath<InferEntity<TEntity>>[]
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
  constructor(input: GetCommandInput<TEntity, TAttributesToGet>) {
    // Runtime check for Entity support
    if ('Entity' in input && input.Entity && !input.TableName) {
      throw new Error('Entity support not implemented; provide TableName')
    }

    // @ts-expect-error - We are passing input that might have Entity/Key structure which native doesn't expect.
    super(input)
  }
}
