import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'
import {
  InferHashKeyFields,
  InferKeyFields,
  InferRangeKeyFields
} from '../../src/types/InferEntityKeyFields'

describe('InferEntityKeyFields', () => {
  test('supports nested field paths in key fields', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', type: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      entityTypeField: 'type'
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({
        id: z.string(),
        name: z.string(),
        address: z.object({ street: z.string() })
      }),
      key: {
        hashKey: {
          fields: ['id', 'address.street'],
          calculate: value => `USER#${value.id}#${value.address.street}`
        },
        rangeKey: {
          fields: [],
          calculate: () => 'PROFILE'
        }
      },
      entityType: 'USER'
    })

    type HashFields = InferHashKeyFields<typeof entity>
    type RangeFields = InferRangeKeyFields<typeof entity>
    type AllFields = InferKeyFields<typeof entity>

    expectTypeOf<HashFields>().toEqualTypeOf<{ id: string; address: { street: string } }>()
    expectTypeOf<RangeFields>().toEqualTypeOf<{}>()
    expectTypeOf<AllFields>().toEqualTypeOf<{ id: string; address: { street: string } }>()
  })
})
