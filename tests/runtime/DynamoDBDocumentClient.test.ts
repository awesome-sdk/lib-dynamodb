import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  DynamoDBDocumentClient as LibDynamoDBDocumentClient
} from '@aws-sdk/lib-dynamodb'
import { describe, expect, test, vi } from 'vitest'

import { AwesomeCommand } from '~/commands/AwesomeCommand'
import { DynamoDBDocumentClient } from '~/index'

import { createMockDocClient } from './createMockDocClient'

describe('DynamoDBDocumentClient Runtime', () => {
  test('forwards built-in commands to original client', async () => {
    const mockOriginalClient = createMockDocClient({
      send: vi.fn().mockResolvedValue({ Item: { pk: '123' } })
    }) as unknown as LibDynamoDBDocumentClient

    const client = DynamoDBDocumentClient.from(mockOriginalClient)
    const command = new GetCommand({ TableName: 'test', Key: { pk: '123' } })

    const result = await client.send(command)

    expect(mockOriginalClient.send).toHaveBeenCalledTimes(1)
    expect(mockOriginalClient.send).toHaveBeenCalledWith(command, undefined, undefined)
    expect(result).toEqual({ Item: { pk: '123' } })
  })

  test('throws error for unimplemented custom commands', async () => {
    const mockOriginalClient = createMockDocClient() as unknown as LibDynamoDBDocumentClient

    const client = DynamoDBDocumentClient.from(mockOriginalClient)

    class CustomCommand implements AwesomeCommand {
      readonly _tag = 'AwesomeCommand'
    }
    const command = new CustomCommand()

    expect(() => client.send(command)).toThrow('Custom command handling not yet implemented')
    expect(mockOriginalClient.send).not.toHaveBeenCalled()
  })

  test('from(DynamoDBClient) wraps it in LibDynamoDBDocumentClient', () => {
    const ddbClient = new DynamoDBClient({})
    const mockLibClient = createMockDocClient() as unknown as LibDynamoDBDocumentClient
    const fromSpy = vi.spyOn(LibDynamoDBDocumentClient, 'from').mockReturnValue(mockLibClient)

    const docClient = DynamoDBDocumentClient.from(ddbClient)

    expect(fromSpy).toHaveBeenCalledWith(ddbClient, undefined)
    expect(docClient.originalClient).toBe(mockLibClient)
  })

  test('passes through arbitrary objects (regression test)', async () => {
    const mockOriginalClient = createMockDocClient() as unknown as LibDynamoDBDocumentClient

    const client = DynamoDBDocumentClient.from(mockOriginalClient)

    // Passing a plain object that is valid for the underlying client (e.g. unknown command style or loose typing)
    // or simply checking it doesn't crash or get mistaken for AwesomeCommand
    const someObj = { some: 'command' } as any

    await client.send(someObj)

    expect(mockOriginalClient.send).toHaveBeenCalledWith(someObj, undefined, undefined)
  })

  test('supports callback overload', () => {
    const mockOriginalClient = createMockDocClient() as unknown as LibDynamoDBDocumentClient

    const client = DynamoDBDocumentClient.from(mockOriginalClient)
    const command = new GetCommand({ TableName: 't', Key: {} })
    const cb = () => {}

    client.send(command, cb)
    expect(mockOriginalClient.send).toHaveBeenCalledWith(command, cb, undefined)

    client.send(command, {}, cb)
    expect(mockOriginalClient.send).toHaveBeenCalledWith(command, {}, cb)
  })

  test('exposes properties', () => {
    const ddbClient = new DynamoDBClient({})
    const client = DynamoDBDocumentClient.from(ddbClient)
    // Lib client has config and middlewareStack
    expect(client.config).toBeDefined()
    expect(client.middlewareStack).toBeDefined()
  })
})
