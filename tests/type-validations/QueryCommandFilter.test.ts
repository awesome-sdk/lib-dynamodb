import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { FilterCondition, QueryCommand } from '~/commands/QueryCommand'
import { unsafePath } from '~/expressions/unsafePath'
import { defineEntity, defineTable } from '~/index'

describe('QueryCommand Entity Mode - FilterExpression DSL', () => {
  const table = defineTable({
    name: 'TestTable',
    fields: {
      pk: 'string',
      sk: 'string',
      gsiPk: 'string',
      gsiSk: 'number'
    },
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
      isActive: z.boolean(),
      tags: z.array(z.string()),
      scores: z.array(z.number()),
      meta: z.object({
        version: z.number(),
        flags: z.object({
          beta: z.boolean()
        })
      }),
      history: z.array(
        z.object({
          action: z.string(),
          timestamp: z.number()
        })
      )
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

  /**
   * Helper: create a minimal valid query in Entity mode (primary index).
   * FilterExpression is the focus, so KCE is always valid.
   */

  const base = (FilterExpression: FilterCondition<typeof entity>) =>
    new QueryCommand({
      Entity: entity,
      KeyConditionExpression: { hash: { value: 'USER#1' } },
      FilterExpression
    })

  describe('Leaf: comparison operators', () => {
    test('eq', () => {
      base({ attr: 'age', eq: 18 })
      base({ attr: 'email', eq: 'a@b.com' })
      base({ attr: 'isActive', eq: true })

      // @ts-expect-error - wrong type for number field
      base({ attr: 'age', eq: '18' })

      // @ts-expect-error - wrong type for boolean field
      base({ attr: 'isActive', eq: 'true' })
    })

    test('ne', () => {
      base({ attr: 'age', ne: 18 })
      base({ attr: 'email', ne: 'a@b.com' })
      base({ attr: 'isActive', ne: false })
    })

    test('lt / lte / gt / gte (for sortable types)', () => {
      base({ attr: 'age', lt: 50 })
      base({ attr: 'age', lte: 50 })
      base({ attr: 'age', gt: 18 })
      base({ attr: 'age', gte: 18 })

      base({ attr: 'email', lt: 'm' })
      base({ attr: 'email', gte: 'a' })

      // @ts-expect-error - boolean not sortable for comparison ops
      base({ attr: 'isActive', gt: true })
    })

    test('between', () => {
      base({ attr: 'age', between: [18, 65] })
      base({ attr: 'email', between: ['a', 'z'] })

      // @ts-expect-error - mixed types inside between
      base({ attr: 'age', between: [18, '65'] })

      // @ts-expect-error - wrong element type for string path
      base({ attr: 'email', between: ['a', 1] })

      // @ts-expect-error - between requires tuple/array
      base({ attr: 'age', between: 123 })
    })

    test('in', () => {
      base({ attr: 'email', in: ['a@b.com', 'b@b.com'] })
      base({ attr: 'age', in: [1, 2, 3] })
      base({ attr: 'isActive', in: [true, false] })

      // @ts-expect-error - wrong element type
      base({ attr: 'age', in: ['1', '2'] })

      // @ts-expect-error - in requires array
      base({ attr: 'age', in: 123 })
    })
  })

  describe('Leaf: string operators', () => {
    test('beginsWith (string only)', () => {
      base({ attr: 'email', beginsWith: 'admin' })
      // @ts-expect-error - not string
      base({ attr: 'meta.flags.beta', beginsWith: 'x' })

      // @ts-expect-error - beginsWith value must be string
      base({ attr: 'email', beginsWith: 123 })

      // @ts-expect-error - beginsWith not allowed for number fields
      base({ attr: 'age', beginsWith: '1' })
    })

    test('contains for string fields', () => {
      base({ attr: 'email', contains: '@' })

      // @ts-expect-error - contains for string requires string needle
      base({ attr: 'email', contains: 123 })
    })
  })

  describe('Leaf: collection contains', () => {
    test('contains for string[] (element type)', () => {
      base({ attr: 'tags', contains: 'admin' })

      // @ts-expect-error - tags is string[] so element must be string
      base({ attr: 'tags', contains: 123 })
    })

    test('contains for number[] (element type)', () => {
      base({ attr: 'scores', contains: 10 })

      // @ts-expect-error - scores is number[] so element must be number
      base({ attr: 'scores', contains: '10' })
    })

    test('contains is not valid for boolean (example)', () => {
      // @ts-expect-error - contains not allowed for boolean
      base({ attr: 'isActive', contains: true })
    })
  })

  describe('Leaf: existence and type operators', () => {
    test('exists', () => {
      base({ attr: 'meta', exists: true })
      base({ attr: 'meta.flags.beta', exists: false })

      // @ts-expect-error - exists requires boolean
      base({ attr: 'meta', exists: 'yes' })
    })

    test('type', () => {
      // Choose ONE style and keep it consistent.
      // Here: DynamoDB type letters.
      base({ attr: 'meta', type: 'M' }) // map
      base({ attr: 'age', type: 'N' }) // number
      base({ attr: 'email', type: 'S' }) // string
      base({ attr: 'tags', type: 'L' }) // list (DDB list)

      // @ts-expect-error - invalid type literal
      base({ attr: 'meta', type: 'oops' })
    })
  })

  describe('Leaf: nested paths and array indices', () => {
    test('nested dot paths', () => {
      base({ attr: 'meta.version', eq: 1 })
      base({ attr: 'meta.flags.beta', eq: true })

      // @ts-expect-error - wrong type
      base({ attr: 'meta.version', eq: '1' })
    })

    test('array index paths', () => {
      // If your path type supports [number] indexing:
      base({ attr: 'history[0].action', eq: 'LOGIN' })
      base({ attr: 'history[1].timestamp', gt: 123 })

      // If you also allow indexing tags:
      base({ attr: 'tags[0]', eq: 'admin' })

      // @ts-expect-error - wrong type
      base({ attr: 'history[0].timestamp', eq: 'not-a-number' })

      // NOTE: Many libraries cannot type-check negative or float indices.
      // If you allow them at runtime, DO NOT mark them ts-expect-error here.
      // If you want to ban them, add runtime validation tests instead.
    })

    test('invalid paths are rejected', () => {
      // @ts-expect-error - invalid top-level field
      base({ attr: 'nope', eq: 1 })

      // @ts-expect-error - invalid nested field
      base({ attr: 'meta.nope', eq: 1 })

      // @ts-expect-error - invalid array nested field
      base({ attr: 'history[0].nope', eq: 'x' })
    })
  })

  describe('Logical composition: and / or / not', () => {
    test('and', () => {
      base({
        and: [
          { attr: 'age', gte: 18 },
          { attr: 'meta.version', eq: 1 },
          { attr: 'tags', contains: 'admin' }
        ]
      })
    })

    test('or', () => {
      base({
        or: [
          { attr: 'email', beginsWith: 'admin' },
          { attr: 'tags', contains: 'admin' }
        ]
      })
    })

    test('not', () => {
      base({
        not: { attr: 'isActive', eq: true }
      })
    })

    test('deep nesting', () => {
      base({
        and: [
          { attr: 'age', gte: 18 },
          {
            or: [
              { attr: 'tags', contains: 'admin' },
              {
                not: {
                  and: [
                    { attr: 'email', beginsWith: 'test' },
                    { attr: 'meta.flags.beta', eq: true }
                  ]
                }
              }
            ]
          }
        ]
      })
    })
  })

  describe('Structural constraints: leaf rules', () => {
    test('exactly one operator is allowed in a leaf', () => {
      // @ts-expect-error - multiple operators not allowed
      base({ attr: 'age', eq: 1, lt: 2 })

      // @ts-expect-error - must include an operator
      base({ attr: 'age' })
    })

    test('attr is required for leaf nodes', () => {
      // @ts-expect-error - missing attr
      base({ eq: 1 })
    })

    test('unknown operator keys are rejected', () => {
      // @ts-expect-error - invalid operator
      base({ attr: 'age', nope: 1 })
    })

    test('logical nodes must not contain attr', () => {
      // If you enforce strict object shapes:
      // @ts-expect-error - cannot mix logical + leaf fields
      base({ and: [{ attr: 'age', eq: 1 }], attr: 'age', eq: 1 })
    })
  })

  describe('unsafePath escape hatch', () => {
    test('unsafePath allows any attribute path string', () => {
      base({ attr: unsafePath('weird_attr'), eq: 'x' })
      base({ attr: unsafePath("meta['any[char]-you.want!']"), contains: 'x' })
      base({ attr: unsafePath('history[-1].action'), eq: 'LOGIN' })
    })

    test('unsafePath still enforces operator keys and single-operator rule', () => {
      // @ts-expect-error - unknown operator key still not allowed
      base({ attr: unsafePath('x'), invalidOp: 1 })

      // @ts-expect-error - multiple operators still not allowed
      base({ attr: unsafePath('x'), eq: 1, lt: 2 })

      // @ts-expect-error - missing operator
      base({ attr: unsafePath('x') })
    })

    test('unsafePath relaxes value typing to unknown (examples that would fail on typed paths)', () => {
      // Normally, age is number and this would be a type error.
      // With unsafePath, we allow it (unknown).
      base({ attr: unsafePath('age'), eq: '18' })

      // beginsWith requires string input, but you might still want to keep operator-specific typing.
      // Choose one:
      // (A) Keep operator payload typing strict even for unsafePath -> beginsWith must still be string.
      //
      // Below assumes (A) strict operator payload typing:
      base({ attr: unsafePath('any'), beginsWith: 'a' })
      // @ts-expect-error - beginsWith payload must still be string
      base({ attr: unsafePath('any'), beginsWith: 123 })
    })
  })

  describe('Runtime validation (optional, if you throw)', () => {
    test('runtime: reject non-object FilterExpression shapes', () => {
      expect(
        () =>
          new QueryCommand({
            Entity: entity,
            KeyConditionExpression: { hash: { value: 'USER#1' } },
            // runtime invalid (if you validate)
            FilterExpression: 'age > 18' as any
          })
      ).toThrow()
    })

    test('runtime: reject empty AND/OR arrays (if you validate)', () => {
      expect(() =>
        base({
          and: []
        })
      ).toThrow()

      expect(() =>
        base({
          or: []
        })
      ).toThrow()
    })
  })
})
