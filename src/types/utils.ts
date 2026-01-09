import type { Simplify } from 'type-fest'

/**
 * Re-export Simplify as Prettify for backward compatibility.
 *
 * Type utility that improves the readability of complex types in IDE tooltips.
 * Expands object types to show their full structure instead of displaying
 * them as type aliases or intersections.
 *
 * @template T - The type to prettify
 *
 * @example
 * ```ts
 * type Complex = { a: string } & { b: number }
 * type Pretty = Prettify<Complex> // Displays as { a: string; b: number }
 * ```
 */
export type Prettify<T> = Simplify<T>

/**
 * Placeholder type that currently acts as a pass-through.
 *
 * This type is intentionally designed to allow future evolution of the API,
 * such as supporting lazy evaluation or computed inputs without breaking changes.
 *
 * @template T - The input type to be passed through
 *
 * @example
 * ```ts
 * type MyField = Input<string> // Currently just string
 * ```
 */
export type Input<T> = T

/**
 * Union of types that should not be traversed when generating object paths.
 *
 * Includes JavaScript primitives plus Date and Function, which are technically
 * objects but should be treated as leaf values for path generation.
 *
 * Used internally by `IsPlainObject` for type narrowing.
 */
export type NonTraversableType =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function

/**
 * Type predicate that determines if a type is a plain object (not a primitive or array).
 *
 * Returns `true` if the type is an object, `false` for primitives and arrays.
 *
 * @template T - The type to check
 *
 * @example
 * ```ts
 * type A = IsPlainObject<{ foo: string }> // true
 * type B = IsPlainObject<string> // false
 * type C = IsPlainObject<string[]> // false
 * ```
 */
export type IsPlainObject<T> = T extends NonTraversableType
  ? false
  : T extends readonly unknown[]
    ? false
    : T extends object
      ? true
      : false

/**
 * Advanced type utility that converts a union type to an intersection type.
 *
 * This is a powerful type-level operation commonly used for merging
 * multiple types together.
 *
 * Note: We keep a custom implementation rather than using type-fest's version
 * because type-fest adds `& Union` which changes type inference behavior.
 *
 * @template U - The union type to convert
 *
 * @example
 * ```ts
 * type Union = { a: string } | { b: number }
 * type Intersection = UnionToIntersection<Union> // { a: string } & { b: number }
 * ```
 */
export type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I
) => void
  ? I
  : never

/**
 * Resolves a DynamoDB attribute type string to its corresponding TypeScript type.
 *
 * DynamoDB supports 'string', 'number', and 'binary' as key attribute types.
 * This utility maps those to their TypeScript equivalents.
 *
 * @template T - The DynamoDB type string ('string' | 'number' | 'binary')
 *
 * @example
 * ```ts
 * type StringType = ResolveDynamoType<'string'> // string
 * type NumberType = ResolveDynamoType<'number'> // number
 * type BinaryType = ResolveDynamoType<'binary'> // string
 * ```
 */
export type ResolveDynamoType<T extends 'string' | 'number' | 'binary'> = T extends 'number'
  ? number
  : string

/**
 * Enforces that exactly one key from the object T is present.
 *
 * This is useful for mutually exclusive options.
 *
 * @template T - The object type with exclusive keys
 */
export type OneOf<T> = {
  [K in keyof T]-?: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>
}[keyof T]
