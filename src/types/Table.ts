/**
 * Placeholder for now. This is intentionally a pass-through type so the API can evolve later (for example, to support lazy or computed inputs).
 */
import { Input } from '~/types/utils'

/**
 * Describes the logical schema of a DynamoDB table as understood by this library.
 *
 * This configuration is used **only** for:
 * - Runtime validation
 * - Type-safe query construction
 * - Index-aware access patterns
 *
 * ⚠️ This type does **not** create, modify, or deploy DynamoDB tables or indexes.
 * The actual table and indexes must already exist in DynamoDB.
 *
 * The structure intentionally follows the shape of SST's `DynamoArgs`
 * to remain familiar, while being strictly limited to client-side concerns.
 */
export interface Table<TFields extends Record<string, 'string' | 'number' | 'binary'>> {
  /**
   * The name of the DynamoDB table.
   *
   * This value is passed through to DynamoDB API calls and is not validated
   * against AWS at runtime.
   */
  name: string

  /**
   * Optional field name used to store an entity discriminator.
   *
   * When provided, this can be used by higher-level abstractions in the library
   * to differentiate between multiple entity types stored in the same table.
   */
  entityTypeField?: Input<
    keyof {
      [K in keyof TFields as TFields[K] extends 'string' ? K : never]: unknown
    }
  >

  /**
   * Defines the subset of table attributes that are relevant for keys and indexes.
   *
   * You do **not** need to define all attributes stored in the table here—only
   * those that participate in:
   * - Primary keys
   * - Global secondary indexes
   * - Local secondary indexes
   *
   * The attribute types are limited to DynamoDB key-compatible types:
   * `"string"`, `"number"`, and `"binary"`.
   *
   * @example
   * ```ts
   * {
   *   fields: {
   *     userId: "string",
   *     noteId: "string",
   *     createdAt: "number"
   *   }
   * }
   * ```
   */
  fields: Input<TFields>

  /**
   * Describes the table's primary index (partition key and optional sort key).
   *
   * This definition is used for:
   * - Type-safe key condition expressions
   * - Validation of query and get operations
   *
   * The keys defined here must exist in `fields`.
   *
   * @example
   * ```ts
   * {
   *   primaryIndex: {
   *     hashKey: "userId",
   *     rangeKey: "noteId"
   *   }
   * }
   * ```
   */
  primaryIndex: Input<{
    /**
     * The partition (hash) key of the table.
     */
    hashKey: Input<keyof NoInfer<TFields>>

    /**
     * The optional sort (range) key of the table.
     */
    rangeKey?: Input<keyof NoInfer<TFields>>
  }>

  /**
   * Describes the table's global secondary indexes (GSIs).
   *
   * These definitions are used to enable:
   * - Index-aware query builders
   * - Compile-time validation of index access patterns
   *
   * This configuration assumes the indexes already exist in DynamoDB.
   *
   * @example
   * ```ts
   * {
   *   globalIndexes: {
   *     CreatedAtIndex: {
   *       hashKey: "userId",
   *       rangeKey: "createdAt"
   *     }
   *   }
   * }
   * ```
   */
  globalIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * The partition key of the global secondary index.
         */
        hashKey: Input<keyof NoInfer<TFields>>

        /**
         * The optional sort key of the global secondary index.
         */
        rangeKey?: Input<keyof NoInfer<TFields>>

        /**
         * Describes which attributes are projected into the index.
         *
         * This information is used for validation and documentation purposes
         * only; it does not affect runtime behavior in DynamoDB.
         *
         * @default "all"
         *
         * @example
         * ```ts
         * projection: "keys-only"
         * ```
         *
         * ```ts
         * projection: ["noteId"]
         * ```
         */
        projection?: Input<'all' | 'keys-only' | Input<string>[]>
      }>
    >
  >

  /**
   * Describes the table's local secondary indexes (LSIs).
   *
   * Local secondary indexes always share the same partition key as the
   * table's primary index. Only the sort key differs.
   *
   * These definitions are used purely for query validation and typing.
   *
   * @example
   * ```ts
   * {
   *   localIndexes: {
   *     CreatedAtIndex: {
   *       rangeKey: "createdAt"
   *     }
   *   }
   * }
   * ```
   */
  localIndexes?: Input<
    Record<
      string,
      Input<{
        /**
         * The sort key of the local secondary index.
         */
        rangeKey: Input<keyof NoInfer<TFields>>

        /**
         * Describes which attributes are projected into the index.
         *
         * This is informational and used for type-safety only.
         *
         * @default "all"
         */
        projection?: Input<'all' | 'keys-only' | Input<string>[]>
      }>
    >
  >

  /**
   * The attribute name used to store the Time To Live (TTL) timestamp.
   *
   * This field is expected to contain a Unix timestamp in seconds.
   *
   * The presence of this configuration allows the library to:
   * - Validate writes involving TTL fields
   * - Provide stronger typing for expiration-related helpers
   *
   * DynamoDB TTL behavior itself is managed entirely by AWS.
   *
   * @example
   * ```ts
   * {
   *   ttl: "expireAt"
   * }
   * ```
   */
  ttl?: Input<
    keyof {
      [K in keyof TFields as TFields[K] extends 'number' ? K : never]: unknown
    }
  >
}
