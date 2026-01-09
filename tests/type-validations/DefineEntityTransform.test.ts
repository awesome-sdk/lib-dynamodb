import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import { InferDynamoItem } from '../../src/types/InferDynamoItem'

describe('Entity transform', () => {
  const table = defineTable({
    name: 'TestTable',
    fields: { pk: 'string', sk: 'string' },
    primaryIndex: { hashKey: 'pk', rangeKey: 'sk' }
  })

  test('accepts valid transform', () => {
    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), name: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
        rangeKey: { fields: [], calculate: () => 'PROFILE' }
      },
      transform: {
        encode: input => {
          // input should be { id: string, name: string, pk: string, sk: string }
          expectTypeOf(input).toMatchTypeOf<{
            id: string
            name: string
            pk: string
            sk: string
          }>()

          return {
            ...input,
            extra: input.id + input.name
          }
        },
        decode: input => {
          // input is ReturnType of encode
          expectTypeOf(input).toMatchTypeOf<{
            id: string
            name: string
            pk: string
            sk: string
            extra: string
          }>()
          return {
            id: input.id,
            name: input.name
          }
        }
      }
    })

    type Item = InferDynamoItem<typeof entity>

    expectTypeOf<Item>().toEqualTypeOf<{
      id: string
      name: string
      pk: string
      sk: string
      extra: string
    }>()
  })

  test('enforces encode input type', () => {
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
        rangeKey: { fields: [], calculate: () => 'PROFILE' }
      },
      transform: {
        encode: input => {
          // @ts-expect-error - invalid field
          const _invalid = input.invalid
          return input
        },
        decode: input => ({ id: input.id })
      }
    })
  })

  test('enforces encode return type includes keys', () => {
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
        rangeKey: { fields: [], calculate: () => 'PROFILE' }
      },
      transform: {
        // @ts-expect-error - must return input with pk/sk
        encode: input => {
          return { id: input.id }
        },
        decode: input => {
          // Since encode failed constraint, TInternal fallback might cause strict check issues
          // Just return something valid to satisfy decode signature if possible
          // @ts-expect-error - TInternal might be broken
          return { id: input.id }
        }
      }
    })
  })

  test('enforces decode output matches schema', () => {
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
        rangeKey: { fields: [], calculate: () => 'PROFILE' }
      },
      transform: {
        encode: input => input,
        // @ts-expect-error - must return { id: string }
        decode: input => {
          return { wrong: 'field' }
        }
      }
    })
  })

  test('supports index fields in transform', () => {
    const tableWithGsi = defineTable({
      name: 'TableWithGsi',
      fields: { pk: 'string', gsiPk: 'string' },
      primaryIndex: { hashKey: 'pk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsiPk' }
      }
    })

    defineEntity(tableWithGsi, {
      name: 'Item',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => `ITEM#${id}` }
      },
      globalIndexes: {
        GSI1: {
          hashKey: { fields: ['id'], calculate: ({ id }) => `GSI#${id}` }
        }
      },
      transform: {
        encode: input => {
          // Should include gsiPk
          expectTypeOf(input).toHaveProperty('gsiPk')
          expectTypeOf(input.gsiPk).toBeString()
          return input
        },
        decode: input => ({ id: input.id })
      }
    })
  })
})
