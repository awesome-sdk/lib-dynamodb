import { describe, expectTypeOf, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '../../src/functions/defineEntity'
import { defineTable } from '../../src/functions/defineTable'

describe('defineEntity globalIndexes typing', () => {
  test('accepts global index definitions with correct key types', () => {
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
      schema: z.object({ id: z.string(), score: z.number(), email: z.string() }),
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

    expectTypeOf(entity.globalIndexes).toBeObject()
    expectTypeOf(entity.globalIndexes).toHaveProperty('GSI1')
    expectTypeOf(entity.globalIndexes).toHaveProperty('GSI2')
  })

  test('rejects unknown global index names', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', gsi1pk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsi1pk' }
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
      globalIndexes: {
        // @ts-expect-error - GSI2 is not defined on the table
        GSI2: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }: { id: string }) => `USER#${id}`
          }
        }
      }
    })
  })

  test('rejects wrong global index key return types', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', gsi1pk: 'number' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsi1pk' }
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
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            // @ts-expect-error - global index hash key should return number
            calculate: ({ id }) => `USER#${id}`
          }
        }
      }
    })
  })

  test('rejects rangeKey when table index has none', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string', sk: 'string', gsi1pk: 'string' },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
      globalIndexes: {
        GSI1: { hashKey: 'gsi1pk' }
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
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }) => `USER#${id}`
          },
          // @ts-expect-error - GSI1 has no range key
          rangeKey: {
            fields: ['id'],
            calculate: ({ id }: { id: string }) => `SORT#${id}`
          }
        }
      }
    })
  })

  test('rejects global indexes when table has none', () => {
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
      // @ts-expect-error - global indexes are not configured on the table
      globalIndexes: {
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }: { id: string }) => `USER#${id}`
          }
        }
      }
    })
  })

  test('rejects global indexes when table requires range key', () => {
    const table = defineTable({
      name: 'TestTable',
      fields: { pk: 'string' },
      primaryIndex: { hashKey: 'pk' },
      globalIndexes: {
        GSI1: { hashKey: 'pk', rangeKey: 'pk' }
      }
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
      globalIndexes: {
        // @ts-expect-error - GSI1 requires range key
        GSI1: {
          hashKey: {
            fields: ['id'],
            calculate: ({ id }: { id: string }) => `USER#${id}`
          }
        }
      }
    })
  })
})
