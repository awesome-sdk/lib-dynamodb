import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'

describe('InferDynamoItem', () => {
  test('infers internal dynamo item type correctly', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type',
      ttl: 'expireAt'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: value => `USER#${value.id}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      entityType: 'USER',
      ttl: domain => (domain.name.length > 5 ? 3600 : 3800)
    })

    type Internal = InferDynamoItem<typeof entity>

    expectTypeOf<Internal>().toEqualTypeOf<{
      id: string
      name: string
      pk: string
      sk: string
      type: 'USER'
      expireAt: number
    }>()
  })

  test('infers internal dynamo item type correctly for index fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: {
        pk: 'string',
        sk: 'string',
        type: 'string',
        expireAt: 'number',
        GSI1pk: 'string',
        GSI1sk: 'string'
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'GSI1pk', rangeKey: 'GSI1sk' }
      },
      localIndexes: {
        LSI1: { rangeKey: 'sk' }
      },
      entityTypeField: 'type',
      ttl: 'expireAt'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: value => `USER#${value.id}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: value => `USER#${value.id}`
          },
          rangeKey: {
            fields: [],
            calculate: () => 'PROFILE'
          }
        }
      },
      entityType: 'USER',
      ttl: domain => (domain.name.length > 5 ? 3600 : 3800)
    })

    type Internal = InferDynamoItem<typeof entity>

    expectTypeOf<Internal>().toEqualTypeOf<{
      id: string
      name: string
      pk: string
      sk: string
      type: 'USER'
      expireAt: number
      GSI1pk: string
      GSI1sk: string
    }>()
  })

  test('infers internal dynamo item type correctly for local index fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: {
        pk: 'string',
        sk: 'string',
        type: 'string',
        LSI1sk: 'string'
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'LSI1sk' }
      },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: value => `USER#${value.id}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      localIndexes: {
        LSI1: {
          rangeKey: {
            fields: ['name'],
            calculate: value => value.name
          }
        }
      },
      entityType: 'USER'
    })

    type Internal = InferDynamoItem<typeof entity>

    expectTypeOf<Internal>().toEqualTypeOf<{
      id: string
      name: string
      pk: string
      sk: string
      type: 'USER'
      LSI1sk: string
    }>()
  })

  test('uses ttl callback return type for ttl field', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', expireAt: 'number' },
      primaryIndex: { hashKey: 'pk' },
      ttl: 'expireAt'
    })

    const numberOnly = defineEntity(table, {
      name: 'NumberOnly',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `NUMBER#${id}`
        }
      },
      ttl: () => 3600
    })

    type NumberOnlyInternal = InferDynamoItem<typeof numberOnly>

    expectTypeOf<NumberOnlyInternal>().toEqualTypeOf<{
      id: string
      pk: string
      expireAt: number
    }>()

    const undefinedOnly = defineEntity(table, {
      name: 'UndefinedOnly',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `UNDEFINED#${id}`
        }
      },
      ttl: () => undefined
    })

    type UndefinedOnlyInternal = InferDynamoItem<typeof undefinedOnly>

    expectTypeOf<UndefinedOnlyInternal>().toEqualTypeOf<{
      id: string
      pk: string
      expireAt?: undefined
    }>()
  })
})
