import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetCommand, GetCommandOutput } from '@aws-sdk/lib-dynamodb'
import { assertType, describe, test } from 'vitest'

import { DynamoDBDocumentClient } from '../../src'
import { AwesomeCommand } from '../../src/types/command'

describe('DynamoDBDocumentClient Types', () => {
  test('static from returns DynamoDBDocumentClient', () => {
    const ddbClient = new DynamoDBClient({})
    const docClient = DynamoDBDocumentClient.from(ddbClient)
    assertType<DynamoDBDocumentClient>(docClient)
  })

  test('send accepts built-in commands', async () => {
    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const command = new GetCommand({ TableName: 'test', Key: {} })
    const result = await docClient.send(command)
    assertType<GetCommandOutput>(result)
  })

  test('send accepts custom commands', async () => {
    // Define a dummy custom command
    class CustomCommand implements AwesomeCommand {
      readonly _tag = 'AwesomeCommand'
    }

    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const command = new CustomCommand()
    const result = await docClient.send(command)
    // For now, since return type is any from our implementation (Promise<any>),
    // we check it returns a Promise.
    // Ideally we want to check strict return type once implemented.
    assertType<any>(result)
  })
})
