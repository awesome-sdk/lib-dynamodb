import type { Paths } from 'type-fest'

import { Prettify, UnionToIntersection } from '~/types/utils'

/**
 * Extracts all valid paths from an object type.
 * - Uses dot notation for property access (e.g., 'metadata.version')
 * - Uses bracket notation for array indices (e.g., 'history[0].action')
 *
 * Powered by type-fest's Paths with bracketNotation: true.
 * Only returns string paths (filters out numeric indices).
 *
 * @template T - The object type to extract paths from
 *
 * @example
 * ```ts
 * type User = { id: string; address: { street: string; city: string } }
 * type UserPaths = FieldPath<User>
 * // Result: "id" | "address" | "address.street" | "address.city"
 * ```
 */
export type FieldPath<T> = Extract<Paths<T, { bracketNotation: true }>, string>

/**
 * Extracts valid dot-notation paths for key fields (hashKey/rangeKey).
 * - Only supports dot notation for nested properties
 * - Does NOT support array indices or bracket notation
 * - Only includes leaf paths (terminal values, not intermediate objects)
 *
 * This is more restrictive than FieldPath and is specifically for key field definitions.
 *
 * @template T - The object type to extract paths from
 *
 * @example
 * ```ts
 * type User = { id: string; address: { street: string }; tags: string[] }
 * type KeyPaths = KeyFieldPath<User>
 * // Result: "id" | "address.street"
 * // Note: "tags" is excluded (arrays not supported), "address" is excluded (not a leaf)
 * ```
 */
export type KeyFieldPath<T> = Extract<
  Paths<T, { bracketNotation: false; leavesOnly: true }>,
  string
>

/**
 * Internal helper that creates a property with appropriate optionality.
 *
 * If the property is optional in the source type, it remains optional.
 * Otherwise it becomes required.
 *
 * @internal
 */
type Prop<T, K extends keyof T, V> = {} extends Pick<T, K> ? { [P in K]?: V } : { [P in K]: V }

/**
 * Extracts a subset of an object type based on a single dot-notation path.
 *
 * Preserves the nested structure leading to the specified field,
 * maintaining proper optionality at each level.
 *
 * @template T - The source object type
 * @template P - The dot-notation path string
 *
 * @example
 * ```ts
 * type User = { id: string; address: { street: string } }
 * type AddressStreet = PickByPath<User, "address.street">
 * // Result: { address: { street: string } }
 * ```
 */
export type PickByPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Prop<T, Head, PickByPath<NonNullable<T[Head]>, Rest>>
    : never
  : P extends keyof T
    ? Prop<T, P, T[P]>
    : never

/**
 * Extracts a subset of an object type based on multiple dot-notation paths.
 *
 * Merges multiple path selections into a single type, preserving the
 * nested structure for all specified paths.
 *
 * @template T - The source object type
 * @template P - Union of dot-notation path strings
 *
 * @example
 * ```ts
 * type User = { id: string; name: string; address: { street: string } }
 * type Selected = PickByPaths<User, "id" | "address.street">
 * // Result: { id: string; address: { street: string } }
 * ```
 */
export type PickByPaths<T, P extends string> = Prettify<
  UnionToIntersection<P extends unknown ? PickByPath<T, P> : never>
>

/**
 * Extracts the value type at a specific dot-notation path.
 *
 * @template T - The source object type
 * @template P - The dot-notation path string
 */
// Extract nested path value
export type ValueAt<T, P extends string> =
  // Array element with nested path: "items[0].prop"
  P extends `${infer Head}[${number}].${infer Rest}`
    ? Head extends keyof T
      ? NonNullable<T[Head]> extends (infer U)[]
        ? ValueAt<U, Rest>
        : never
      : never
    : // Nested object path: "address.street"
      P extends `${infer Head}.${infer Rest}`
      ? Head extends keyof T
        ? ValueAt<NonNullable<T[Head]>, Rest>
        : never
      : // Array element path: "items[0]"
        P extends `${infer Head}[${number}]`
        ? Head extends keyof T
          ? NonNullable<T[Head]> extends (infer U)[]
            ? U
            : never
          : never
        : // Bracket key path: "meta['key']"
          P extends `${infer Head}['${infer Key}']`
          ? Head extends keyof T
            ? NonNullable<T[Head]> extends Record<string, infer V>
              ? V
              : never
            : never
          : // Base case: simple key
            P extends keyof T
            ? T[P]
            : never
