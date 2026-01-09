import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import {
  InferGlobalIndexHashKeyFields,
  InferGlobalIndexKeyFields,
  InferGlobalIndexNames,
  InferGlobalIndexRangeKeyFields
} from '../../src/types/InferEntityKeyFields'

describe('InferEntityGlobalIndexes', () => {
  test('infers global index names and fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', gsi1pk: 'string', gsi1sk: 'number', gsi2pk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
        GSI2: { hashKey: 'gsi2pk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        score: z.number(),
        email: z.string(),
        street: z.object({ name: z.string() })
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
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }) => `USER#${id}`
          },
          rangeKey: {
            fields: ['score'],
            calculate: ({ score }) => score
          }
        },
        GSI2: {
          hashKey: {
            fields: ['email'],
            calculate: ({ email }) => `EMAIL#${email}`
          }
        }
      }
    })

    type Names = InferGlobalIndexNames<typeof entity>
    type HashFields = InferGlobalIndexHashKeyFields<typeof entity, 'GSI1'>
    type RangeFields = InferGlobalIndexRangeKeyFields<typeof entity, 'GSI1'>
    type Gsi1Fields = InferGlobalIndexKeyFields<typeof entity, 'GSI1'>
    type Gsi2Fields = InferGlobalIndexKeyFields<typeof entity, 'GSI2'>

    expectTypeOf<Names>().toEqualTypeOf<'GSI1' | 'GSI2'>()
    expectTypeOf<HashFields>().toEqualTypeOf<{ id: string }>()
    expectTypeOf<RangeFields>().toEqualTypeOf<{ score: number }>()
    expectTypeOf<Gsi1Fields>().toEqualTypeOf<{ id: string; score: number }>()
    expectTypeOf<Gsi2Fields>().toEqualTypeOf<{ email: string }>()
  })

  test('infers no global index names when none are defined', () => {
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

    type Names = InferGlobalIndexNames<typeof entity>
    expectTypeOf<Names>().toBeNever()
  })
})
