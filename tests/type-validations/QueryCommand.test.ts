import { assertType, describe, test } from 'vitest'
import { z } from 'zod'

import { QueryCommand, QueryCommandOutput } from '~/commands/QueryCommand'
import { defineEntity, defineTable } from '~/index'

describe('QueryCommand Input Types', () => {
  const table = defineTable({
    name: 'TestTable',
    fields: { pk: 'string', sk: 'string', gsiPk: 'string', gsiSk: 'number' },
    primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    globalIndexes: {
      GSI1: { hashKey: 'gsiPk', rangeKey: 'gsiSk' }
    }
  })

  const entity = defineEntity(table, {
    name: 'User',
    schema: z.object({
      id: z.string(),
      email: z.string(),
      age: z.number(),
      tags: z.array(z.string()),
      meta: z.object({ version: z.number() })
    }),
    key: {
      hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
      rangeKey: { fields: ['email'], calculate: ({ email }) => `EMAIL#${email}` }
    },
    globalIndexes: {
      GSI1: {
        hashKey: { fields: ['email'], calculate: ({ email }) => email },
        rangeKey: { fields: ['age'], calculate: ({ age }) => age }
      }
    }
  })

  test('Legacy Mode', () => {
    // Valid legacy
    new QueryCommand({
      TableName: 'T',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': '1' }
    })

    // @ts-expect-error - TableName required
    new QueryCommand({
      KeyConditionExpression: 'pk = :pk'
    })
  })

  test('Entity Mode: Primary Index (Implicit)', () => {
    // Valid Raw Value
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { value: 'USER#1' }
      }
    })

    // Valid Calculated Hash
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { from: { id: '1' } }
      }
    })

    // Valid Hash + Range (Raw)
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { value: 'USER#1' },
        range: { eq: 'EMAIL#text' }
      }
    })

    // Valid Hash + Range (Calculated)
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { from: { id: '1' } },
        range: { from: { email: 'a@b.com' } }
      }
    })

    // Valid Range Operators
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { value: 'USER#1' },
        range: { beginsWith: 'EMAIL#' }
      }
    })

    new QueryCommand({
      Entity: entity,
      // @ts-expect-error - missing partition key (hash)
      KeyConditionExpression: {
        range: { beginsWith: 'EMAIL#' }
      }
    })

    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        // @ts-expect-error - from field mismatch
        hash: { from: { email: 'wrong' } },
        range: { beginsWith: 'EMAIL#' }
      }
    })

    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: {
        hash: { value: 'USER#1' },
        // @ts-expect-error - only one range condition allowed
        range: { gt: 'A', lt: 'Z' }
      }
    })
    new QueryCommand({
      Entity: entity,
      // @ts-expect-error - legacy string not allowed in Entity mode
      KeyConditionExpression: 'pk = :pk'
    })
  })

  test('Entity Mode: GSI Selection', () => {
    // Valid GSI request (Calculated)
    new QueryCommand({
      Entity: entity,
      IndexName: 'GSI1',
      KeyConditionExpression: {
        hash: { from: { email: 'test@example.com' } },
        range: { gt: 18 }
      }
    })

    // Valid GSI request (Raw)
    new QueryCommand({
      Entity: entity,
      IndexName: 'GSI1',
      KeyConditionExpression: {
        hash: { value: 'test@example.com' },
        range: { from: { age: 20 } }
      }
    })

    new QueryCommand({
      Entity: entity,
      IndexName: 'GSI1',
      KeyConditionExpression: {
        // @ts-expect-error - Wrong keys for GSI (primary keys not allowed)
        hash: { from: { id: '1' } }
      }
    })
  })

  test('Entity Mode: FilterExpression', () => {
    // Valid Simple Filter
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: { hash: { value: 'USER#1' } },
      FilterExpression: { attr: 'age', gte: 18 }
    })

    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: { hash: { value: 'USER#1' } },
      FilterExpression: { attr: 'age', eq: 18 }
    })
  })

  test('Entity Mode: Output Inference', () => {
    type Output = QueryCommandOutput<typeof entity>

    // Check DecodedItems
    assertType<Output['DecodedItems']>(
      [] as {
        id: string
        email: string
        age: number
        tags: string[]
        meta: { version: number }
      }[]
    )
  })

  describe('Variant Analysis', () => {
    test('Hash-Only Primary Index', () => {
      const table = defineTable({
        name: 'SimpleTable',
        fields: { pk: 'string' },
        primaryIndex: { hashKey: 'pk' }
      })

      const simpleEntity = defineEntity(table, {
        name: 'SimpleUser',
        schema: z.object({ id: z.string() }),
        key: {
          hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` }
        }
      })

      // Valid
      new QueryCommand({
        Entity: simpleEntity,
        KeyConditionExpression: { hash: { value: 'USER#1' } }
      })

      new QueryCommand({
        Entity: simpleEntity,
        KeyConditionExpression: {
          hash: { value: 'USER#1' },
          // @ts-expect-error - range key not allowed for this table
          range: { gt: '123' }
        }
      })
    })

    test('Hash-Only GSI', () => {
      const table = defineTable({
        name: 'GsiTable',
        fields: { pk: 'string', sk: 'string', gsiPk: 'string' },
        primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
        globalIndexes: {
          GSI_HASH_ONLY: { hashKey: 'gsiPk' }
        }
      })

      const gsiEntity = defineEntity(table, {
        name: 'GsiEntity',
        schema: z.object({ id: z.string(), email: z.string() }),
        key: {
          hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
          rangeKey: { fields: ['email'], calculate: ({ email }) => email }
        },
        globalIndexes: {
          GSI_HASH_ONLY: {
            hashKey: { fields: ['email'], calculate: ({ email }) => email }
          }
        }
      })

      // Valid GSI Query
      new QueryCommand({
        Entity: gsiEntity,
        IndexName: 'GSI_HASH_ONLY',
        KeyConditionExpression: {
          hash: { value: 'test@example.com' }
        }
      })

      new QueryCommand({
        Entity: gsiEntity,
        IndexName: 'GSI_HASH_ONLY',
        KeyConditionExpression: {
          hash: { value: 'test@example.com' },
          // @ts-expect-error - range key not allowed for this GSI
          range: { gt: '123' }
        }
      })
    })

    test('LSI Selection', () => {
      const table = defineTable({
        name: 'LsiTable',
        fields: { pk: 'string', sk: 'string', lsiSk: 'number' },
        primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
        localIndexes: {
          LSI1: { rangeKey: 'lsiSk' }
        }
      })

      const lsiEntity = defineEntity(table, {
        name: 'LsiEntity',
        schema: z.object({ id: z.string(), date: z.string(), count: z.number() }),
        key: {
          hashKey: { fields: ['id'], calculate: ({ id }) => `USER#${id}` },
          rangeKey: { fields: ['date'], calculate: ({ date }) => date }
        },
        localIndexes: {
          LSI1: {
            rangeKey: { fields: ['count'], calculate: ({ count }) => count }
          }
        }
      })

      // Valid LSI Query
      // Must use Primary Hash Key + LSI Range Key
      new QueryCommand({
        Entity: lsiEntity,
        IndexName: 'LSI1',
        KeyConditionExpression: {
          hash: { value: 'USER#1' },
          range: { gt: 100 }
        }
      })

      new QueryCommand({
        TableName: 'st',
        KeyConditions: {
          pk: {
            ComparisonOperator: 'EQ',
            AttributeValueList: ['USER#1']
          }
        }
      })

      // Valid LSI Query with Calculated Hash
      new QueryCommand({
        Entity: lsiEntity,
        IndexName: 'LSI1',
        KeyConditionExpression: {
          hash: { from: { id: '1' } },
          range: { from: { count: 50 } }
        }
      })

      new QueryCommand({
        Entity: lsiEntity,
        IndexName: 'LSI1',
        KeyConditionExpression: {
          // @ts-expect-error - invalid hash key interaction (must match primary)
          hash: { value: 123 }, // pk is string
          range: { gt: 10 }
        }
      })
    })
  })
})
