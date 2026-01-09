import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import {
  InferLocalIndexFields,
  InferLocalIndexNames,
  InferLocalIndexRangeKeyFields
} from '../../src/types/InferEntityKeyFields'

describe('InferEntityLocalIndexes', () => {
  test('infers local index names and fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'string', lsi2sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' },
        LSI2: { rangeKey: 'lsi2sk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        createdAt: z.string(),
        metrics: z.object({ score: z.number() })
      }),
      key: {
        hashKey: {
          fields: ['id'],
          calculate: ({ id }) => `USER#${id}`
        },
        rangeKey: {
          fields: ['id'],
          calculate: ({ id }) => `PROFILE#${id}`
        }
      },
      localIndexes: {
        LSI1: {
          rangeKey: {
            fields: ['createdAt'],
            calculate: ({ createdAt }) => createdAt
          }
        },
        LSI2: {
          rangeKey: {
            fields: ['metrics.score'],
            calculate: ({ metrics }) => metrics.score
          }
        }
      }
    })

    type Names = InferLocalIndexNames<typeof entity>
    type IndexFields = InferLocalIndexFields<typeof entity>
    type Lsi1Fields = InferLocalIndexRangeKeyFields<typeof entity, 'LSI1'>
    type Lsi2Fields = InferLocalIndexRangeKeyFields<typeof entity, 'LSI2'>

    expectTypeOf<Names>().toEqualTypeOf<'LSI1' | 'LSI2'>()
    expectTypeOf<Lsi1Fields>().toEqualTypeOf<{ createdAt: string }>()
    expectTypeOf<Lsi2Fields>().toEqualTypeOf<{ metrics: { score: number } }>()
    expectTypeOf<IndexFields>().toEqualTypeOf<{
      readonly LSI1: {
        createdAt: string
      }
      readonly LSI2: {
        metrics: {
          score: number
        }
      }
    }>()
  })

  test('infers no local index names when none are defined', () => {
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
      }
    })

    expectTypeOf<InferLocalIndexNames<typeof entity>>().toBeNever()
    expectTypeOf<InferLocalIndexFields<typeof entity>>().toEqualTypeOf<{}>()
  })
})
