import { assertType, describe, expect, test } from 'vitest'
import { z } from 'zod'

import { GetCommandOutput } from '~/commands/GetCommand'
import { GetCommand, defineEntity, defineTable } from '~/index'

describe('GetCommand Input Types', () => {
  const table = defineTable({
    name: 'TestTable',
    fields: { pk: 'string', sk: 'string' },
    primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
  })

  const entity = defineEntity(table, {
    name: 'User',
    schema: z.object({
      id: z.string(),
      email: z.string(),
      profile: z.object({ age: z.number() }).optional()
    }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
      rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
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
      Key: { pk: '1', sk: '2' },
      ProjectionExpression: 'id',
      AttributesToGet: ['id']
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

    expect(() => {
      new GetCommand({
        TableName: 'T',
        Entity: entity,
        // @ts-expect-error - mismatched key structure (expecting hash/range)
        Key: { pk: '1' }
      })
    }).toThrow()
  })

  test('Rejects plain scalar values in Key (no Raw support)', () => {
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: {
        // @ts-expect-error - plain scalar not allowed
        hash: 'USER#1',
        range: { email: 'a@b.com' }
      }
    })
  })

  test('AttributesToGet validation', () => {
    // Valid paths
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: '2' } },
      AttributesToGet: ['id', 'email', 'profile']
    })

    // Nested path
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: '2' } },
      AttributesToGet: ['profile.age']
    })

    // Invalid path
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: '2' } },
      // @ts-expect-error - 'invalid' is not a path
      AttributesToGet: ['invalid']
    })
  })

  test('DecodedItem inference', () => {
    // Case 1: No AttributesToGet -> Full Entity
    type FullOutput = GetCommandOutput<typeof entity>
    assertType<FullOutput['DecodedItem']>({ id: '1', email: '2' })
    assertType<FullOutput['DecodedItem']>({ id: '1', email: '2', profile: { age: 1 } })

    // Use assertType to check assignability
    const fullItem: FullOutput['DecodedItem'] = { id: '1', email: '2' }
    assertType<{ id: string; email: string; profile?: { age: number } } | undefined>(fullItem)

    // Case 2: Selected Attributes -> Narrowed Entity
    type NarrowedOutput = GetCommandOutput<typeof entity, ['id', 'profile.age']>
    const narrowedItem: NarrowedOutput['DecodedItem'] = { id: '1', profile: { age: 1 } }

    // Should allow selected fields
    assertType<{ id: string; profile?: { age: number } } | undefined>(narrowedItem)

    // Should NOT have 'email'
    // @ts-expect-error - email is not selected
    narrowedItem?.email
  })

  test('DecodedItem is NOT present when Entity is missing (legacy mode)', () => {
    type LegacyOutput = GetCommandOutput
    // @ts-expect-error - DecodedItem should not exist
    type Item = LegacyOutput['DecodedItem']
  })

  test('Bracket notation paths are allowed in AttributesToGet', () => {
    const complexEntity = defineEntity(table, {
      name: 'Complex',
      schema: z.object({ id: z.string(), items: z.array(z.object({ id: z.string() })) }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `COMPLEX#${id}` },
        rangeKey: { fields: ['id'], calculate: ({ id }) => `COMPLEX#${id}` }
      }
    })

    const cmd = new GetCommand({
      TableName: 'T',
      Entity: complexEntity,
      Key: { hash: { id: '1' }, range: { id: '1' } },
      AttributesToGet: ['items[0].id', 'items[1]']
    })

    type Output = GetCommandOutput<typeof complexEntity, ['items[0].id', 'items[1]']>

    // Verify inference
    assertType<Output['DecodedItem']>({
      items: [
        { id: 'sub-id' }, // from items[0].id
        { id: 'full-item' } // from items[1]
      ]
    })
  })

  test('Rejects ProjectionExpression/ExpressionAttributeNames when Entity is provided', () => {
    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: 'a@b.com' } },
      // @ts-expect-error - ProjectionExpression not allowed in entity mode
      ProjectionExpression: 'foo'
    })

    new GetCommand({
      TableName: 'T',
      Entity: entity,
      Key: { hash: { id: '1' }, range: { email: 'a@b.com' } },
      // @ts-expect-error - ExpressionAttributeNames not allowed in entity mode
      ExpressionAttributeNames: { '#foo': 'bar' }
    })
  })

  test('Rejects missing Range key for Hash+Range Entity', () => {
    expect(() => {
      new GetCommand({
        TableName: 'T',
        Entity: entity,
        // @ts-expect-error - missing range
        Key: { hash: { id: '1' } }
      })
    }).toThrow('Missing range key')
  })

  test('Rejects range key for Hash-Only Entity', () => {
    const table = defineTable({
      name: 'H',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })
    const hEntity = defineEntity(table, {
      name: 'HE',
      schema: z.object({ id: z.string() }),
      key: { hashKey: { fields: ['id'], calculate: ({ id }) => id } }
    })

    new GetCommand({
      TableName: 'T',
      Entity: hEntity,
      Key: {
        hash: { id: '1' },
        // @ts-expect-error - range not allowed
        range: { something: 'else' }
      }
    })
  })

  test('Legacy support works', () => {
    new GetCommand({
      TableName: 'T',
      Key: { pk: '1' }
    })
  })
})
