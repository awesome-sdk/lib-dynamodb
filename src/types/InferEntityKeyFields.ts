import { Entity } from '~/types/Entity'
import { PickByPaths } from '~/types/FieldPath'
import { InferEntity } from '~/types/InferEntity'
import { Prettify } from '~/types/utils'

// --- Internal Helpers ---

/** @internal */
type PickByPathsOrEmpty<T, P> = [P] extends [never] ? {} : PickByPaths<T, Extract<P, string>>

/** @internal */
type LocalIndexesOf<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['localIndexes'],
  Record<string, any>
>

/** @internal */
type GlobalIndexesOf<T extends Entity<any, any, any, any, any, any, any, any, any>> = Extract<
  T['globalIndexes'],
  Record<string, any>
>

// --- Primary Key Field Inference ---

/**
 * Infers the subset of entity fields required for the hash key calculation.
 *
 * @template T - The Entity type
 *
 * @example
 * ```ts
 * type HashFields = InferHashKeyFields<typeof userEntity>
 * // Result: fields referenced in hashKey.fields
 * ```
 */
export type InferHashKeyFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  Prettify<PickByPathsOrEmpty<InferEntity<T>, T['key']['hashKey']['fields'][number]>>

/**
 * Infers the subset of entity fields required for the range key calculation.
 *
 * Returns an empty object if the entity has no range key.
 *
 * @template T - The Entity type
 */
export type InferRangeKeyFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  Prettify<
    T['key'] extends { rangeKey: { fields: readonly unknown[] } }
      ? PickByPathsOrEmpty<InferEntity<T>, T['key']['rangeKey']['fields'][number]>
      : {}
  >

/**
 * Infers the combined subset of entity fields required for primary key calculation.
 *
 * Combines both hash key and range key fields.
 *
 * @template T - The Entity type
 */
export type InferKeyFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  Prettify<InferHashKeyFields<T> & InferRangeKeyFields<T>>

// --- Local Index Inference ---

/**
 * Extracts the names of all local secondary indexes defined on an entity.
 *
 * @template T - The Entity type
 * @returns Union of local index names, or never if none defined
 */
export type InferLocalIndexNames<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  NonNullable<T['localIndexes']> extends Record<string, any>
    ? Extract<keyof NonNullable<T['localIndexes']>, string>
    : never

/**
 * Infers a map of all local index range key fields for an entity.
 *
 * @template T - The Entity type
 * @returns Object mapping index names to their required field subsets
 */
export type InferLocalIndexFields<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  InferLocalIndexNames<T> extends never
    ? {}
    : LocalIndexesOf<T> extends Record<string, { rangeKey: { fields: readonly unknown[] } }>
      ? {
          [K in keyof LocalIndexesOf<T>]: Prettify<
            PickByPathsOrEmpty<InferEntity<T>, LocalIndexesOf<T>[K]['rangeKey']['fields'][number]>
          >
        }
      : {}

/**
 * Infers the subset of entity fields required for a specific local index range key.
 *
 * @template T - The Entity type
 * @template TIndexName - The name of the local index
 */
export type InferLocalIndexRangeKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends InferLocalIndexNames<T>
> =
  LocalIndexesOf<T> extends Record<string, { rangeKey: { fields: readonly unknown[] } }>
    ? Prettify<
        PickByPathsOrEmpty<
          InferEntity<T>,
          LocalIndexesOf<T>[TIndexName]['rangeKey']['fields'][number]
        >
      >
    : {}

// --- Global Index Inference ---

/**
 * Extracts the names of all global secondary indexes defined on an entity.
 *
 * @template T - The Entity type
 * @returns Union of global index names, or never if none defined
 */
export type InferGlobalIndexNames<T extends Entity<any, any, any, any, any, any, any, any, any>> =
  T['globalIndexes'] extends Record<string, any> ? Extract<keyof T['globalIndexes'], string> : never

/**
 * Infers the subset of entity fields required for a specific global index hash key.
 *
 * @template T - The Entity type
 * @template TIndexName - The name of the global index
 */
export type InferGlobalIndexHashKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> =
  GlobalIndexesOf<T> extends Record<string, { hashKey: { fields: readonly unknown[] } }>
    ? Prettify<
        PickByPathsOrEmpty<
          InferEntity<T>,
          GlobalIndexesOf<T>[TIndexName]['hashKey']['fields'][number]
        >
      >
    : {}

/**
 * Infers the subset of entity fields required for a specific global index range key.
 *
 * Returns an empty object if the index has no range key.
 *
 * @template T - The Entity type
 * @template TIndexName - The name of the global index
 */
export type InferGlobalIndexRangeKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> =
  GlobalIndexesOf<T> extends Record<string, any>
    ? GlobalIndexesOf<T>[TIndexName] extends { rangeKey: { fields: readonly unknown[] } }
      ? Prettify<
          PickByPathsOrEmpty<
            InferEntity<T>,
            GlobalIndexesOf<T>[TIndexName]['rangeKey']['fields'][number]
          >
        >
      : {}
    : {}

/**
 * Infers the combined subset of entity fields required for a specific global index.
 *
 * Combines both hash key and range key fields for the index.
 *
 * @template T - The Entity type
 * @template TIndexName - The name of the global index
 */
export type InferGlobalIndexKeyFields<
  T extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends InferGlobalIndexNames<T>
> = Prettify<
  InferGlobalIndexHashKeyFields<T, TIndexName> & InferGlobalIndexRangeKeyFields<T, TIndexName>
>
