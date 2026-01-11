import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Readable } from 'stream'
import { describe, expect, test, vi } from 'vitest'

import { DecodeError } from '~/errors/DecodeError'
import { GetCommand as AwesomeGetCommand } from '~/index'
import { Entity } from '~/types/Entity'

// Mock Entity Setup
const mockTable = {
  name: 'TestTable',
  primaryIndex: {
    hashKey: 'pk',
    rangeKey: 'sk'
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
  encode: vi.fn(item => item),
  decode: vi.fn(item => ({ ...item, decoded: true }))
}

const mockEntity = {
  name: 'TestEntity',
  table: mockTable,
  key: mockKey,
  transform: mockTransform
} as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

const mockEntityNoRange = {
  name: 'TestEntityNoRange',
  table: { ...mockTable, primaryIndex: { hashKey: 'pk' } },
  key: { hashKey: mockKey.hashKey },
  transform: mockTransform
} as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

// Helper to create stream from object
const streamFrom = (obj: any) => Readable.from([JSON.stringify(obj)])

describe('GetCommand Runtime', () => {
  test('AwesomeGetCommand is separate but compatible with native input', () => {
    const cmd = new AwesomeGetCommand({ TableName: 'T', Key: { pk: '1' } })
    expect(cmd).toBeInstanceOf(AwesomeGetCommand)
    expect(cmd).toBeInstanceOf(GetCommand)
  })

  test('Infers TableName from Entity', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    // Access input via any cast to check internal state passed to super
    const input = (cmd as any).input
    expect(input.TableName).toBe('TestTable')
  })

  test('Calculates Native Key from Entity Helpers', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    const input = (cmd as any).input
    expect(input.Key).toEqual({
      pk: 'USER#123',
      sk: 'SORT#abc'
    })
  })

  test('Calculates Native Key with Falsy Range Value', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 0 } } as any
    })

    const input = (cmd as any).input
    expect(input.Key).toEqual({
      pk: 'USER#123',
      sk: 'SORT#0'
    })
  })

  test('Calculates Native Key (Hash Only)', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntityNoRange,
      Key: { hash: { id: '123' } } as any
    })

    const input = (cmd as any).input
    expect(input.Key).toEqual({
      pk: 'USER#123'
    })
  })

  test('Throw error if missing range key in input for table with range key', () => {
    expect(() => {
      new AwesomeGetCommand({
        Entity: mockEntity, // Has range key
        Key: { hash: { id: '123' } } as any // Missing range
      })
    }).toThrow(/Missing range key/)
  })

  test('Strips Entity from native input', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    const input = (cmd as any).input
    expect(input.Entity).toBeUndefined()
  })

  test('Translates AttributesToGet to ProjectionExpression and ExpressionAttributeNames', () => {
    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any,
      AttributesToGet: ['id', 'profile.name', 'items[0].id']
    } as any)

    const input = (cmd as any).input
    expect(input.ProjectionExpression).toBe('#p0_0, #p1_0.#p1_1, #p2_0[0].#p2_2')
    expect(input.ExpressionAttributeNames).toEqual({
      '#p0_0': 'id',
      '#p1_0': 'profile',
      '#p1_1': 'name',
      '#p2_0': 'items',
      '#p2_2': 'id'
    })
    expect(input.AttributesToGet).toBeUndefined()
  })

  test('Adds deserialization middleware and correctly decodes item', async () => {
    const mockItem = {
      pk: { S: 'USER#123' },
      sk: { S: 'SORT#abc' },
      id: { S: '123' },
      sort: { S: 'abc' }
    }

    const mockRequestHandler = {
      handle: async () => ({
        response: {
          statusCode: 200,
          headers: {},
          body: streamFrom({ Item: mockItem })
        }
      })
    }

    const client = new DynamoDBClient({
      requestHandler: mockRequestHandler as any,
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' }
    })
    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomeGetCommand({
      Entity: mockEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    const result = (await docClient.send(cmd)) as any

    expect(mockTransform.decode).toHaveBeenCalledWith(
      expect.objectContaining({ id: '123', sort: 'abc' })
    )
    expect(result.DecodedItem).toEqual(expect.objectContaining({ decoded: true }))
  })

  test('Wraps decode errors', async () => {
    const errorEntity = {
      ...mockEntity,
      transform: {
        encode: (x: any) => x,
        decode: () => {
          throw new Error('Decode Error')
        }
      }
    } as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

    const mockItem = {
      pk: { S: 'USER#123' },
      sk: { S: 'SORT#abc' },
      id: { S: '123' },
      sort: { S: 'abc' }
    }

    const mockRequestHandler = {
      handle: async () => ({
        response: {
          statusCode: 200,
          headers: {},
          body: streamFrom({ Item: mockItem })
        }
      })
    }

    const client = new DynamoDBClient({
      requestHandler: mockRequestHandler as any,
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' }
    })
    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomeGetCommand({
      Entity: errorEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    await expect(docClient.send(cmd)).rejects.toThrow(DecodeError)
  })

  test('Decodes item using schema validaton when no transform is present', async () => {
    const schemaEntity = {
      name: 'SchemaEntity',
      table: mockTable,
      key: mockKey,
      schema: {
        parse: vi.fn(item => ({ ...item, parsed: true }))
      }
    } as unknown as Entity<any, any, any, any, any, any, any, any, any, any>

    const mockItem = {
      pk: { S: 'USER#123' },
      sk: { S: 'SORT#abc' },
      id: { S: '123' },
      sort: { S: 'abc' }
    }

    const mockRequestHandler = {
      handle: async () => ({
        response: {
          statusCode: 200,
          headers: {},
          body: streamFrom({ Item: mockItem })
        }
      })
    }

    const client = new DynamoDBClient({
      requestHandler: mockRequestHandler as any,
      region: 'local',
      credentials: { accessKeyId: 'foo', secretAccessKey: 'bar' }
    })
    const docClient = DynamoDBDocumentClient.from(client)

    const cmd = new AwesomeGetCommand({
      Entity: schemaEntity,
      Key: { hash: { id: '123' }, range: { sort: 'abc' } } as any
    })

    const result = (await docClient.send(cmd)) as any

    expect(schemaEntity.schema.parse).toHaveBeenCalledWith(
      expect.objectContaining({ id: '123', sort: 'abc' })
    )
    expect(result.DecodedItem).toEqual(expect.objectContaining({ parsed: true }))
  })
})
