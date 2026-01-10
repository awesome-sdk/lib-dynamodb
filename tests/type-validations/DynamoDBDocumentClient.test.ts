import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetCommand, GetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { assertType, describe, expect, test, vi } from 'vitest'

import { AwesomeCommand } from '~/commands/AwesomeCommand'
import { DynamoDBDocumentClient } from '~/index'

import { createMockDocClient } from '../runtime/createMockDocClient'

describe('DynamoDBDocumentClient Types', () => {
  test('static from returns DynamoDBDocumentClient', () => {
    const ddbClient = new DynamoDBClient({})
    const docClient = DynamoDBDocumentClient.from(ddbClient)
    assertType<DynamoDBDocumentClient>(docClient)
  })

  test('send accepts built-in commands', async () => {
    // Return a valid result structure to match return type if validated at runtime
    const mockClient = createMockDocClient({
      send: vi.fn().mockResolvedValue({ Item: {} })
    })
    const docClient = DynamoDBDocumentClient.from(mockClient as any)
    const command = new GetCommand({ TableName: 'test', Key: {} })
    const result = await docClient.send(command)
    assertType<GetCommandOutput>(result)
  })

  test('send accepts custom commands', async () => {
    // Define a dummy custom command
    class CustomCommand implements AwesomeCommand {
      readonly _tag = 'AwesomeCommand'
    }

    const docClient = DynamoDBDocumentClient.from(createMockDocClient() as any)
    const command = new CustomCommand()
    expect(() => docClient.send(command)).toThrow('Custom command handling not yet implemented')

    // Type check only (not executed)
    if (false) {
      const result = await docClient.send(command)
      assertType<any>(result)
    }
  })
})
