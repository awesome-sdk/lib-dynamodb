import { assertType, describe, test } from 'vitest'
import { z } from 'zod'

import { PutCommand, PutCommandOutput } from '~/commands/PutCommand'
import { defineEntity, defineTable } from '~/index'

describe('PutCommand Input Types', () => {
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
      age: z.number().default(0)
    }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
      rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
    }
  })

  test('TableName is required when Entity is missing (legacy)', () => {
    // @ts-expect-error - TableName required
    new PutCommand({
      Item: { pk: '1', sk: '2' }
    })

    // Valid
    new PutCommand({
      TableName: 'T',
      Item: { pk: '1', sk: '2', random: 'field' }
    })
  })

  test('TableName is optional when Entity is provided', () => {
    new PutCommand({
      Entity: entity,
      Item: { id: '1', email: 'e' }
    })

    new PutCommand({
      TableName: 'Override',
      Entity: entity,
      Item: { id: '1', email: 'e' }
    })
  })

  test('Item must match Entity input schema', () => {
    new PutCommand({
      Entity: entity,
      Item: { id: '1', email: 'e', age: 10 }
    })

    // Optional field with default
    new PutCommand({
      Entity: entity,
      Item: { id: '1', email: 'e' }
    })

    // @ts-expect-error - missing required field email
    new PutCommand({ Entity: entity, Item: { id: '1' } })

    // @ts-expect-error - extra field not in schema
    new PutCommand({ Entity: entity, Item: { id: '1', email: 'e', extra: true } })
  })

  test('DecodedAttributes inference', () => {
    type Output = PutCommandOutput<typeof entity>

    // Check presence
    assertType<Output['DecodedAttributes']>({ id: '1', email: 'e', age: 0 })

    type LegacyOutput = PutCommandOutput
    // @ts-expect-error - DecodedAttributes missing in legacy
    type Bad = LegacyOutput['DecodedAttributes']
  })
})
