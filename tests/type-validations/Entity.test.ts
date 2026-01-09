import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

describe('Entity types', () => {
  test('requires entityType when configured on table', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk' },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      },
      entityType: 'USER'
    })

    expectTypeOf(entity.entityType).toEqualTypeOf<'USER'>()
  })

  test('forbids entityType when NOT configured on table', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      },
      // @ts-expect-error
      entityType: 'USER'
    })
  })

  test('enforces strict key return type', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: () =>
            // @ts-expect-error - must return string pk
            123
        }
      }
    })
  })

  test('requires rangeKey definition when table has range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      // @ts-expect-error - rangeKey required for this table
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      }
    })
  })

  test('forbids rangeKey definition when table has no range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        },
        // @ts-expect-error - no rangeKey on this table
        rangeKey: {
          fields: ['id'],
          calculate: (item: { id: string }) => `USER#${item.id}`
        }
      }
    })
  })

  test('validates nested key field paths', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type'
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        address: z.object({ street: z.string() })
      }),
      key: {
        hashKey: {
          // @ts-expect-error - invalid nested path
          fields: ['address.nope'],
          calculate: () => 'USER#1'
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      }
    })
  })

  test('ttl receives correct domain type', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk' },
      ttl: 'expireAt'
    })

    defineEntity(table, {
      name: 'Score',
      schema: z.object({ id: z.string(), score: z.number() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `SCORE#${id}`
        }
      },
      ttl: domain => {
        // Should have access to schema-inferred type
        const _id: string = domain.id
        const _score: number = domain.score
        // @ts-expect-error - invalid field
        const _invalid = domain.invalidField
        return domain.score > 15 ? 3600 : undefined
      }
    })
  })

  test('ttl return type is number | undefined', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk' },
      ttl: 'expireAt'
    })

    defineEntity(table, {
      name: 'Score',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `SCORE#${id}`
        }
      },
      // @ts-expect-error - must return number | undefined, not string
      ttl: () => 'invalid'
    })
  })

  test('ttl field is optional', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk' },
      ttl: 'expireAt'
    })

    // Should not error when ttl is omitted
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        }
      }
    })
  })

  test('ttl requires table ttl field', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' }
    })

    defineEntity(table, {
      name: 'Score',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `SCORE#${id}`
        }
      },
      // @ts-expect-error - table has no ttl field configured
      ttl: () => 3600
    })
  })
})
