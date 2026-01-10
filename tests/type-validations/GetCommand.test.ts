import { GetCommandInput as NativeGetCommandInput } from '@aws-sdk/lib-dynamodb'
import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { GetCommand, type GetCommandInput, defineEntity, defineTable } from '~/index'

describe('GetCommand Input Types', () => {
  const table = defineTable({
    name: 'TestTable',
    fields: { pk: 'string', sk: 'string' },
    primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
  })

  const entity = defineEntity(table, {
    name: 'User',
    schema: z.object({ id: z.string(), email: z.string() }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
      rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
    }
  })

  const simpleTable = defineTable({
    name: 'SimpleTable',
    fields: { pk: 'string' },
    primaryIndex: { hashKey: 'pk' }
  })

  const simpleEntity = defineEntity(simpleTable, {
    name: 'Item',
    schema: z.object({ id: z.string() }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => `ITEM#${id}` }
    }
  })

  test('TableName is required when Entity is missing', () => {
    // @ts-expect-error - TableName is required
    new GetCommand({
      Key: { pk: '1', sk: '2' }
    })

    // Valid
    new GetCommand({
      TableName: 'MyTable',
      Key: { pk: '1', sk: '2' }
    })
  })

  test('Requires structured Key used when Entity provided', () => {
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: {
        hash: { id: '1' },
        range: { email: 'a@b.com' }
      }
    })

    new GetCommand({
      TableName: 'T',
      Entity: entity,
      // @ts-expect-error - mismatched key structure (expecting hash/range)
      Key: { pk: '1', sk: '2' }
    })
  })

  test('Accepts RawKey when Entity provided', () => {
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      RawKey: { pk: '1', sk: '2' }
    })
  })

  test('Forbids mixing Key and RawKey', () => {
    // @ts-expect-error - cannot provide bothKey and RawKey
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: 'a' } },
      RawKey: { pk: '1', sk: '2' }
    })
  })

  test('Forbids missing both Key and RawKey', () => {
    // @ts-expect-error - must provide one
    new GetCommand({
      TableName: 'T',
      Entity: entity
    })
  })

  test('Infers correct shape for Hash-Only entity', () => {
    new GetCommand({
      TableName: 'T',
      Entity: simpleEntity,
      Key: {
        hash: { id: '1' }
      }
    })

    new GetCommand({
      TableName: 'T',
      Entity: simpleEntity,
      Key: {
        hash: { id: '1' },
        // @ts-expect-error - range: undefined also strictly forbidden
        range: undefined
      }
    })

    new GetCommand({
      TableName: 'T',
      Entity: simpleEntity,
      Key: {
        hash: { id: '1' },
        // @ts-expect-error - range not allowed
        range: { something: 'else' }
      }
    })
  })

  test('RawKey is rejected when Entity is missing', () => {
    new GetCommand({
      TableName: 'MyTable',
      // @ts-expect-error - RawKey not valid without Entity
      RawKey: { pk: '1', sk: '2' }
    })
  })

  test('Rejects missing Range key for Hash+Range Entity', () => {
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      // @ts-expect-error - missing range
      Key: {
        hash: { id: '1' }
      }
    })
  })

  test('RawKey matches NativeGetCommandInput Key', () => {
    type Input = GetCommandInput<typeof entity>
    type RawKeyType = Extract<Input, { RawKey: any }>['RawKey']

    expectTypeOf<RawKeyType>().toEqualTypeOf<NativeGetCommandInput['Key']>()
  })

  test('Works as drop-in replacement (legacy usage)', () => {
    new GetCommand({
      TableName: 'LegacyTable',
      Key: { id: 123 }
    })
  })
})
