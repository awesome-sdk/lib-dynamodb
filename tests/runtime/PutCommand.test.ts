import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Readable } from 'stream'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { DecodeError } from '~/errors/DecodeError'
import { PutCommand as AwesomePutCommand } from '~/index'
import { Entity } from '~/types/Entity'

// Mock Entity Setup
const mockTable = {
  name: 'TestTable',
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk'
  },
  entityTypeField: '_et',
  ttl: 'expireAt',
  globalIndexes: {
    GSI1: {
      hashKey: 'gsi1pk',
      rangeKey: 'gsi1sk'
    }
  },
  localIndexes: {
    LSI1: {
      rangeKey: 'lsi1sk'
    }
  },
  fields: {
    pk: 'string',
    sk: 'string',
    gsi1pk: 'string',
    gsi1sk: 'string',
    lsi1sk: 'string',
    _et: 'string',
    expireAt: 'number'
  }
}

const mockKey = {
  hashKey: {
    fields: ['id'],
    calculate: (item: any) => `USER#${item.id}`
  },
  rangeKey: {
    fields: ['sort'],
    calculate: (item: any) => `SORT#${item.sort}`
  }
}

const mockTransform = {
  encode: vi.fn(item => ({ ...item, encoded: true })),
  decode: vi.fn(item => ({ ...item, decoded: true }))
}

const mockEntity = {
  name: 'TestEntity',
  table: mockTable,
  key: mockKey,
  entityType: 'User',
  ttl: (item: any) => item.ttlInSeconds,
  globalIndexes: {
    GSI1: {
      hashKey: { calculate: (item: any) => `GSI1#${item.email}` },
      rangeKey: { calculate: (item: any) => `GSI1SORT#${item.createdAt}` }
    }
  },
  localIndexes: {
    LSI1: {
      rangeKey: { calculate: (item: any) => `LSI1SORT#${item.status}` }
    }
  },
  schema: {
    parse: vi.fn(item => ({ ...item, parsed: true })) // Simulate zod parse
  },
  transform: mockTransform
} as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

describe('PutCommand Runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('AwesomePutCommand is compatible with native input', () => {
    const cmd = new AwesomePutCommand({ TableName: 'T', Item: { pk: '1' } })
    expect(cmd).toBeInstanceOf(AwesomePutCommand)
    expect(cmd).toBeInstanceOf(PutCommand)
    const input = (cmd as any).input
    expect(input.TableName).toBe('T')
    expect(input.Item).toEqual({ pk: '1' })
  })

  test('Infers TableName and Generates Fields', () => {
    const inputItem = {
      id: '123',
      sort: 'abc',
      email: 'test@example.com',
      createdAt: '2023-01-01',
      status: 'active',
      ttlInSeconds: 1234567890
    }

    const cmd = new AwesomePutCommand({
      Entity: mockEntity,
      Item: inputItem
    } as any)

    const input = (cmd as any).input
    expect(input.TableName).toBe('TestTable')

    // Expect schema.parse to have been called with input Item
    expect(mockEntity.schema.parse).toHaveBeenCalledWith(inputItem)

    const item = input.Item
    // Check Generated Fields
    expect(item.pk).toBe('USER#123')
    expect(item.sk).toBe('SORT#abc')
    expect(item._et).toBe('User')
    expect(item.expireAt).toBe(1234567890)
    expect(item.gsi1pk).toBe('GSI1#test@example.com')
    expect(item.gsi1sk).toBe('GSI1SORT#2023-01-01')
    expect(item.lsi1sk).toBe('LSI1SORT#active')
  })

  test('Encodes Item using Transform', () => {
    const inputItem = { id: '123', sort: 'abc' }
    const cmd = new AwesomePutCommand({
      Entity: mockEntity,
      Item: inputItem
    } as any)

    const input = (cmd as any).input

    // Check Entity stripped
    expect(input.Entity).toBeUndefined()

    // Check if transform.encode was called
    expect(mockTransform.encode).toHaveBeenCalled()
    // Helper adds 'encoded: true'
    expect(input.Item.encoded).toBe(true)
    // Check generated fields still present
    expect(input.Item.pk).toBe('USER#123')
  })

  test('Overwrites generated fields even if encode changes them', () => {
    const badTransform = {
      encode: (item: any) => ({ ...item, pk: 'BAD_PK' }), // Try to overwrite PK
      decode: (item: any) => item
    }
    const badEntity = { ...mockEntity, transform: badTransform } as any

    const cmd = new AwesomePutCommand({
      Entity: badEntity,
      Item: { id: '123' }
    } as any)

    const input = (cmd as any).input
    expect(input.Item.pk).toBe('USER#123') // Should be the generated one
  })

  test('TableName override works', () => {
    const cmd = new AwesomePutCommand({
      Entity: mockEntity,
      TableName: 'OverrideTable',
      Item: { id: '123' }
    } as any)
    const input = (cmd as any).input
    expect(input.TableName).toBe('OverrideTable')
  })

  test('Falls back to schema parsing for output if transform is missing', async () => {
    // Setup Entity without transform
    const noTransformEntity = { ...mockEntity, transform: undefined } as any

    const client = new DynamoDBClient({
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' },
      requestHandler: {
        handle: async () => ({
          response: {
            statusCode: 200,
            headers: {},
            body: Readable.from([JSON.stringify({ Attributes: { pk: { S: 'USER#123' } } })])
          }
        })
      } as any
    })
    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomePutCommand({
      Entity: noTransformEntity,
      Item: { id: '123' },
      ReturnValues: 'ALL_NEW'
    } as any)

    const result = (await docClient.send(cmd)) as any
    // schema.parse was mocked to add { parsed: true }
    expect(noTransformEntity.schema.parse).toHaveBeenCalled()
    expect(result.DecodedAttributes.parsed).toBe(true)
  })

  test('Wraps decode errors on Attributes', async () => {
    const errorEntity = {
      ...mockEntity,
      transform: {
        encode: (x: any) => x,
        decode: () => {
          throw new Error('Decode Error')
        }
      }
    } as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

    const client = new DynamoDBClient({
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' },
      requestHandler: {
        handle: async () => ({
          response: {
            statusCode: 200,
            headers: {},
            body: Readable.from([JSON.stringify({ Attributes: { pk: { S: 'USER#123' } } })])
          }
        })
      } as any
    })

    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomePutCommand({
      Entity: errorEntity,
      Item: { id: '123' },
      ReturnValues: 'ALL_NEW'
    } as any)

    await expect(docClient.send(cmd)).rejects.toThrow(DecodeError)
  })

  test('Decodes Attributes successfully', async () => {
    const client = new DynamoDBClient({
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' },
      requestHandler: {
        handle: async () => ({
          response: {
            statusCode: 200,
            headers: {},
            body: Readable.from([JSON.stringify({ Attributes: { pk: { S: 'USER#123' } } })])
          }
        })
      } as any
    })
    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomePutCommand({
      Entity: mockEntity,
      Item: { id: '123' },
      ReturnValues: 'ALL_NEW'
    } as any)

    const result = (await docClient.send(cmd)) as any
    expect(result.DecodedAttributes).toEqual(expect.objectContaining({ decoded: true }))
  })
})
