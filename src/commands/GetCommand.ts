import {
  GetCommand as NativeGetCommand,
  GetCommandInput as NativeGetCommandInput,
  GetCommandOutput as NativeGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { Raw } from '~/functions/raw'
import { Entity } from '~/types/Entity'
import { PickByPaths } from '~/types/FieldPath'
import { Table } from '~/types/Table'

type ResolveScalar<T> = T extends 'number' ? number : T extends 'binary' ? Uint8Array : string

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
          hash:
            | PickByPaths<TItem, THashKeyFields[number]>
            | Raw<ResolveScalar<TFields[TTable['primaryIndex']['hashKey']]>>
        } & (TTable['primaryIndex']['rangeKey'] extends string
          ? {
              range:
                | PickByPaths<TItem, TRangeKeyFields[number]>
                | Raw<ResolveScalar<TFields[TTable['primaryIndex']['rangeKey']]>>
            }
          : {})
      : never
    : never

/**
 * Custom GetCommandInput that allows an optional Entity.
 * - If Entity is NOT provided, TableName is required (standard behavior).
 * - If Entity IS provided, TableName is optional (can be inferred or overridden).
 * - If Entity IS provided, Key must match the Entity's key structure (with raw support).
 */
export type GetCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any> | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>
    ? Omit<NativeGetCommandInput, 'TableName' | 'Key'> & {
        TableName?: string
        Entity: TEntity
        Key: EntityKeyInput<TEntity>
      }
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

    // @ts-expect-error - We are passing input that might have Entity/Key structure which native doesn't expect.
    super(input)
  }
}
