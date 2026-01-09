import z from 'zod'

import { Entity } from '~/types/Entity'

/**
 * Infers the TypeScript type from an Entity's Zod schema.
 *
 * This is a convenience wrapper around `z.infer` that extracts the
 * schema type from an Entity definition. Use this when you need the
 * user-facing type without the additional DynamoDB key fields.
 *
 * @template T - The Entity type to infer from
 *
 * @example
 * ```ts
 * const userEntity = defineEntity(table, {
 *   schema: z.object({ id: z.string(), name: z.string() }),
 *   // ... rest of config
 * })
 *
 * type User = InferEntity<typeof userEntity>
 * // Result: { id: string; name: string }
 * ```
 */
export type InferEntity<T extends Entity<any, any, any, any, any, any, any, any, any, any, any>> =
  z.infer<T['schema']>

/**
 * Infers the TypeScript input type from an Entity's Zod schema.
 *
 * This captures the type expected *before* any Zod transformations or defaults.
 * Use this for write operations (Put, Update) where the user provides input.
 *
 * @template T - The Entity type to infer from
 */
export type InferEntityInput<
  T extends Entity<any, any, any, any, any, any, any, any, any, any, any>
> = z.input<T['schema']>
