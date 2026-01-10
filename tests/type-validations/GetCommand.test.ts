import { describe, expect, test } from 'vitest'

import { GetCommand } from '~/index'
import { Entity } from '~/types/Entity'

describe('GetCommand Input Types', () => {
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

  test('TableName is optional when Entity is provided', () => {
    const entity = {} as unknown as Entity<any, any, any, any, any, any, any, any, any>

    // Valid type without TableName, but throws at runtime
    expect(() => {
      new GetCommand({
        Entity: entity,
        Key: { pk: '1', sk: '2' }
      })
    }).toThrow()

    // Valid with TableName
    new GetCommand({
      TableName: 'MyTable',
      Entity: entity,
      Key: { pk: '1', sk: '2' }
    })
  })

  test('Entity must be a valid Entity type', () => {
    expect(() => {
      new GetCommand({
        // @ts-expect-error - Invalid Entity
        Entity: 'not-an-entity',
        Key: { pk: '1', sk: '2' }
      })
    }).toThrow()
  })

  test('Works as drop-in replacement (legacy usage)', () => {
    new GetCommand({
      TableName: 'LegacyTable',
      Key: { id: 123 }
    })
  })
})
