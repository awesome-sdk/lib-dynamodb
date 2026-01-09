import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

describe('defineEntity localIndexes typing', () => {
  test('accepts local index definitions with correct key types', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' }
      }
    })

    const entity = defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), createdAt: z.number() }),
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
        }
      }
    })

    expectTypeOf(entity.localIndexes).not.toBeUndefined()
    expectTypeOf(entity.localIndexes).exclude(undefined).toBeObject()
    expectTypeOf(entity.localIndexes).exclude(undefined).toHaveProperty('LSI1')
  })

  test('rejects unknown local index names', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' }
      }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), createdAt: z.number() }),
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
        // @ts-expect-error - LSI2 is not defined on the table
        LSI2: {
          rangeKey: {
            fields: ['createdAt'],
            calculate: ({ createdAt }: { createdAt: number }) => createdAt
          }
        }
      }
    })
  })

  test('rejects wrong local index key return types', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' }
      }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string(), createdAt: z.number() }),
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
            // @ts-expect-error - local index range key should return number
            calculate: ({ createdAt }) => `${createdAt}`
          }
        }
      }
    })
  })

  test('rejects local indexes when table has none', () => {
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
        }
      },
      // @ts-expect-error - local indexes are not configured on the table
      localIndexes: {
        LSI1: {
          rangeKey: {
            fields: ['id'],
            calculate: ({ id }: { id: string }) => `IDX#${id}`
          }
        }
      }
    })
  })

  test('rejects local index fields not in schema', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', lsi1sk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      localIndexes: {
        LSI1: { rangeKey: 'lsi1sk' }
      }
    })

    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
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
            // @ts-expect-error - missingField is not in schema
            fields: ['missingField'],
            calculate: () => 'oops'
          }
        }
      }
    })
  })
})
