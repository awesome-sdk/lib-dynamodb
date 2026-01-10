import {
  GetCommand as NativeGetCommand,
  GetCommandInput as NativeGetCommandInput,
  GetCommandOutput as NativeGetCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { Entity } from '~/types/Entity'

/**
 * Custom GetCommandInput that allows an optional Entity.
 * - If Entity is NOT provided, TableName is required (standard behavior).
 * - If Entity IS provided, TableName is optional (can be inferred or overridden).
 */
export type GetCommandInput =
  | (NativeGetCommandInput & {
      Entity?: undefined
    })
  | (Omit<NativeGetCommandInput, 'TableName'> & {
      TableName?: string
      Entity: Entity<any, any, any, any, any, any, any, any, any>
    })

export type GetCommandOutput = NativeGetCommandOutput

/**
 * Custom GetCommand wrapper.
 * Currently works as a drop-in replacement for NativeGetCommand.
 * Entity handling logic is not yet implemented.
 */
export class GetCommand extends NativeGetCommand {
  constructor(input: GetCommandInput) {
    if ('Entity' in input && input.Entity && !input.TableName) {
      throw new Error('Entity support not implemented; provide TableName')
    }

    super(input as NativeGetCommandInput)
  }
}
