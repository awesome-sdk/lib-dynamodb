import { describe, expectTypeOf, it } from 'vitest'

import { defineTable } from '../../src/functions/defineTable'

describe('Table types', () => {
  it('should infer types correctly for valid configuration', () => {
    const table = defineTable({
      name: 'MyTable',
      fields: {
        pk: 'string',
        sk: 'number',
        blob: 'binary',
        type: 'string'
      },
      primaryIndex: {
        hashKey: 'pk',
        rangeKey: 'sk'
      },
      globalIndexes: {
        gsi1: {
          hashKey: 'sk',
          rangeKey: 'pk',
          projection: 'all'
        }
      },
      localIndexes: {
        lsi1: {
          rangeKey: 'blob',
          projection: ['pk']
        }
      },
      ttl: 'sk',
      entityTypeField: 'type'
    })

    const name = table.name

    expectTypeOf(table.name).toBeString()
    expectTypeOf(table.name).toEqualTypeOf<'MyTable'>()

    expectTypeOf(table.fields.pk).toEqualTypeOf<'string'>()
    expectTypeOf(table.primaryIndex.hashKey).toEqualTypeOf<'pk'>()
    expectTypeOf(table.primaryIndex.rangeKey).toEqualTypeOf<'sk'>()

    // Check optional indexes
    expectTypeOf(table.globalIndexes?.gsi1).not.toBeUndefined()
    expectTypeOf(table.globalIndexes?.gsi1.hashKey).toEqualTypeOf<'sk'>()
  })

  it('should fail for invalid configurations', () => {
    // These tests are static type checks. They don't run at runtime but ensure compilation fails.

    defineTable({
      name: 'InvalidTable',
      fields: { pk: 'string' },
      // @ts-expect-error - hashKey must be a valid field
      primaryIndex: { hashKey: 'invalid' }
    })

    defineTable({
      name: 'InvalidTable',
      fields: { pk: 'string' },
      // @ts-expect-error - rangeKey must be a valid field
      primaryIndex: { hashKey: 'pk', rangeKey: 'invalid' }
    })
  })

  it('should enforce fields values restriction', () => {
    defineTable({
      name: 'InvalidFields',
      fields: {
        // @ts-expect-error - fields must be string | number | binary
        wrong: 'boolean'
      },
      primaryIndex: { hashKey: 'wrong' }
    })
  })
})
