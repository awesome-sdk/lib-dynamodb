import {
  GetCommand as NativeGetCommand,
  GetCommandInput as NativeGetCommandInput,
  GetCommandOutput as NativeGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { Entity } from '~/types/Entity'
import { PickByPaths } from '~/types/FieldPath'

/**
 * Infers the structured Key shape ({ hash, range? }) from an Entity.
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
    ? {
        hash: PickByPaths<TItem, THashKeyFields[number]>
      } & (TTable['primaryIndex']['rangeKey'] extends string
        ? { range: PickByPaths<TItem, TRangeKeyFields[number]> }
        : {})
    : never

/**
 * Enforces mutual exclusivity between structured Key and RawKey.
 */
export type EntityKeyOrRawKeyInput<TEntity> =
  | {
      Key: EntityKeyInput<TEntity>
      RawKey?: undefined
    }
  | {
      Key?: undefined
      RawKey: NativeGetCommandInput['Key']
    }

/**
 * Custom GetCommandInput that allows an optional Entity.
 * - If Entity is NOT provided, TableName is required (standard behavior).
 * - If Entity IS provided, TableName is optional (can be inferred or overridden).
 * - If Entity IS provided, Key must match the Entity's key structure OR RawKey must be provided.
 */
export type GetCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>
    ? Omit<NativeGetCommandInput, 'TableName' | 'Key'> & {
        TableName?: string
        Entity: TEntity
      } & EntityKeyOrRawKeyInput<TEntity>
    : NativeGetCommandInput & {
        Entity?: undefined
      }

export type GetCommandOutput = NativeGetCommandOutput

/**
 * Custom GetCommand wrapper.
 * Currently works as a drop-in replacement for NativeGetCommand.
 * Entity handling logic is not yet implemented.
 */
export class GetCommand<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined
> extends NativeGetCommand {
  constructor(input: GetCommandInput<TEntity>) {
    // Runtime check for Entity support
    if ('Entity' in input && input.Entity && !input.TableName) {
      throw new Error('Entity support not implemented; provide TableName')
    }

    // @ts-expect-error - We are passing input that might have Entity/RawKey which native doesn't expect.
    // In a real implementation we would transform this input to NativeGetCommandInput.
    // For now, we just pass it through as we haven't implemented the logic yet.
    // And since we only support dropped-in replacements for now which match NativeGetCommandInput, this is "safe" for legacy usage.
    super(input)
  }
}
