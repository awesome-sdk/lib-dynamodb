import { assertType, describe, test } from 'vitest'
import { z } from 'zod'

import { defineEntity } from '~/functions/defineEntity'
import { defineTable } from '~/functions/defineTable'
import { RequiredKeyFieldPath } from '~/types/FieldPath'

describe('RequiredKeyFieldPath', () => {
  type Simple = { a: string; b?: string }
  type Nested = { a: { b: string; c?: string }; d: string }
  type WithArray = { a: string[]; b: { c: string }[] }

  test('excludes optional fields', () => {
    assertType<RequiredKeyFieldPath<Simple>>('a')
    // @ts-expect-error
    assertType<RequiredKeyFieldPath<Simple>>('b')
  })

  test('excludes nested optional fields', () => {
    assertType<RequiredKeyFieldPath<Nested>>('a.b')
    assertType<RequiredKeyFieldPath<Nested>>('d')
    // @ts-expect-error
    assertType<RequiredKeyFieldPath<Nested>>('a.c')
  })

  test('excludes arrays', () => {
    // @ts-expect-error
    assertType<RequiredKeyFieldPath<WithArray>>('a')
    // @ts-expect-error
    assertType<RequiredKeyFieldPath<WithArray>>('b')
  })
})

describe('defineEntity Key Validation', () => {
  const table = defineTable({
    name: 'T',
    fields: { pk: 'string' },
    primaryIndex: { hashKey: 'pk' }
  })

  test('allows required fields', () => {
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string() }),
      key: {
        hashKey: { fields: ['id'], calculate: ({ id }) => id }
      }
    })
  })

  test('forbids optional fields as keys', () => {
    defineEntity(table, {
      name: 'User',
      schema: z.object({ id: z.string().optional() }),
      key: {
        hashKey: {
          // @ts-expect-error - optional field not allowed
          fields: ['id'],
          calculate: (item: any) => item.id ?? ''
        }
      }
    })
  })
})
