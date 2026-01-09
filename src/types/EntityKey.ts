import { Table } from '~/types/Table'
import { ResolveDynamoType } from '~/types/utils'

/**
 * Internal helper that resolves a DynamoDB key type from table field configuration.
 * @internal
 */
type KeyValue<TTable extends Table<any>, K extends string> = ResolveDynamoType<
  TTable['fields'][K & keyof TTable['fields']]
>

/** @internal */
type HashKeyField<TTable extends Table<any>> = Extract<TTable['primaryIndex']['hashKey'], string>

/** @internal */
type RangeKeyField<TTable extends Table<any>> = Extract<
  NonNullable<TTable['primaryIndex']['rangeKey']>,
  string
>

/**
 * Extracts the names of all global secondary indexes defined on a table.
 *
 * @template TTable - The table configuration
 * @returns Union of GSI names, or never if table has no global indexes
 */
export type GlobalIndexName<TTable extends Table<any>> =
  TTable['globalIndexes'] extends Record<string, any>
    ? Extract<keyof TTable['globalIndexes'], string>
    : never

/**
 * Extracts the names of all local secondary indexes defined on a table.
 *
 * @template TTable - The table configuration
 * @returns Union of LSI names, or never if table has no local indexes
 */
export type LocalIndexName<TTable extends Table<any>> =
  TTable['localIndexes'] extends Record<string, any>
    ? Extract<keyof TTable['localIndexes'], string>
    : never

/** @internal */
type GlobalIndexHashKeyField<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> =
  TTable['globalIndexes'] extends Record<string, any>
    ? Extract<TTable['globalIndexes'][TIndexName]['hashKey'], string>
    : never

/** @internal */
type GlobalIndexRangeKeyField<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> =
  TTable['globalIndexes'] extends Record<string, any>
    ? Extract<NonNullable<TTable['globalIndexes'][TIndexName]['rangeKey']>, string>
    : never

/** @internal */
type LocalIndexRangeKeyField<TTable extends Table<any>, TIndexName extends LocalIndexName<TTable>> =
  TTable['localIndexes'] extends Record<string, any>
    ? Extract<TTable['localIndexes'][TIndexName]['rangeKey'], string>
    : never

// --- Primary Key Value Types ---

/**
 * Resolves the TypeScript type for a table's hash key value.
 * @template TTable - The table configuration
 */
export type EntityHashKeyValue<TTable extends Table<any>> = KeyValue<TTable, HashKeyField<TTable>>

/**
 * Resolves the TypeScript type for a table's range key value.
 * @template TTable - The table configuration
 */
export type EntityRangeKeyValue<TTable extends Table<any>> = KeyValue<TTable, RangeKeyField<TTable>>

// --- Global Index Value Types ---

/**
 * Resolves the TypeScript type for a global index's hash key value.
 * @template TTable - The table configuration
 * @template TIndexName - The name of the global index
 */
export type EntityGlobalIndexHashKeyValue<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = KeyValue<TTable, GlobalIndexHashKeyField<TTable, TIndexName>>

/**
 * Resolves the TypeScript type for a global index's range key value.
 * @template TTable - The table configuration
 * @template TIndexName - The name of the global index
 */
export type EntityGlobalIndexRangeKeyValue<
  TTable extends Table<any>,
  TIndexName extends GlobalIndexName<TTable>
> = KeyValue<TTable, GlobalIndexRangeKeyField<TTable, TIndexName>>

// --- Local Index Value Types ---

/**
 * Resolves the TypeScript type for a local index's range key value.
 * Local indexes share the table's hash key, so only range key varies.
 *
 * @template TTable - The table configuration
 * @template TIndexName - The name of the local index
 */
export type EntityLocalIndexRangeKeyValue<
  TTable extends Table<any>,
  TIndexName extends LocalIndexName<TTable>
> = KeyValue<TTable, LocalIndexRangeKeyField<TTable, TIndexName>>

// --- Composite Key Types ---

/**
 * Constructs the hash key object type for a table.
 * @template TTable - The table configuration
 */
export type EntityHashKey<TTable extends Table<any>> = {
  [K in HashKeyField<TTable>]: EntityHashKeyValue<TTable>
}

/**
 * Constructs the range key object type for a table (if it has one).
 * @template TTable - The table configuration
 */
export type EntityRangeKey<TTable extends Table<any>> =
  TTable['primaryIndex']['rangeKey'] extends string
    ? {
        [K in RangeKeyField<TTable>]: EntityRangeKeyValue<TTable>
      }
    : {}

/**
 * Constructs the complete primary key object type (hash + range if present).
 * @template TTable - The table configuration
 */
export type EntityKey<TTable extends Table<any>> = EntityHashKey<TTable> & EntityRangeKey<TTable>
