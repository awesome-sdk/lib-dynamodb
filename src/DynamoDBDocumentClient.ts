import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClientCommand,
  DynamoDBDocumentClient as LibDynamoDBDocumentClient,
  TranslateConfig
} from '@aws-sdk/lib-dynamodb'

import { AwesomeCommand } from './types/command'

export class DynamoDBDocumentClient {
  readonly originalClient: LibDynamoDBDocumentClient

  private constructor(client: LibDynamoDBDocumentClient) {
    this.originalClient = client
  }

  static from(
    client: DynamoDBClient | LibDynamoDBDocumentClient,
    translateConfig?: TranslateConfig
  ): DynamoDBDocumentClient {
    // If it is already a LibDynamoDBDocumentClient, return wrapped
    if (client instanceof LibDynamoDBDocumentClient) {
      return new DynamoDBDocumentClient(client)
    }

    // If it is a DynamoDBClient (has config, middlewareStack, but is NOT a LibDocClient)
    // We must wrap it using Lib.from()
    if (client instanceof DynamoDBClient) {
      return new DynamoDBDocumentClient(LibDynamoDBDocumentClient.from(client, translateConfig))
    }

    // Checking for mock: duck-typing
    // It must have 'send' and NOT be a DynamoDBClient
    // (If it was DynamoDBClient it would be caught above)
    // We assume if it's not an instance of DynamoDBClient but has send, it's a mock of DocumentClient
    if (
      typeof client === 'object' &&
      client !== null &&
      'send' in client &&
      typeof (client as any).send === 'function'
    ) {
      return new DynamoDBDocumentClient(client as unknown as LibDynamoDBDocumentClient)
    }

    // Fallback or error?
    // Upstream 'from' usually throws if input is invalid.
    // We'll try to pass it to Lib.from just in case, or throw.
    // But safely:
    return new DynamoDBDocumentClient(
      LibDynamoDBDocumentClient.from(client as DynamoDBClient, translateConfig)
    )
  }

  get config() {
    return this.originalClient.config
  }

  get middlewareStack(): any {
    return this.originalClient.middlewareStack
  }

  destroy(): void {
    this.originalClient.destroy()
  }

  send(command: AwesomeCommand): Promise<any>
  send(
    command: DynamoDBDocumentClientCommand<any, any, any, any, any>,
    options?: any,
    cb?: any
  ): Promise<any> | void
  send(command: any, optionsOrCb?: any, cb?: any): Promise<any> | void {
    if (this.isAwesomeCommand(command)) {
      throw new Error('Custom command handling not yet implemented')
    }

    return this.originalClient.send(command, optionsOrCb, cb)
  }

  private isAwesomeCommand(command: any): command is AwesomeCommand {
    return (
      typeof command === 'object' &&
      command !== null &&
      '_tag' in command &&
      command._tag === 'AwesomeCommand'
    )
  }
}
