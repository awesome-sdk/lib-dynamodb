import { GlobalIndexName, LocalIndexName } from '~/types/EntityKey'
import { Table } from '~/types/Table'
import { Prettify, ResolveDynamoType, UnionToIntersection } from '~/types/utils'

/**
 * Type of the global index definitions passed to defineEntity
 */
type GlobalIndexesDef<TTable extends Table<any>> = Partial<Record<GlobalIndexName<TTable>, any>>

/**
 * Type of the local index definitions passed to defineEntity
 */
type LocalIndexesDef<TTable extends Table<any>> = Partial<Record<LocalIndexName<TTable>, any>>

type ComputeGlobalIndexFields<
  TTable extends Table<any>,
  TGlobalIndexes extends GlobalIndexesDef<TTable>
> = [keyof TGlobalIndexes] extends [never]
  ? {}
  : UnionToIntersection<
      {
        [K in keyof TGlobalIndexes]: TTable['globalIndexes'] extends Record<string, any>
          ? {
              [HK in Extract<
                TTable['globalIndexes'][Extract<K, keyof TTable['globalIndexes']>]['hashKey'],
                string
              >]: ResolveDynamoType<TTable['fields'][HK]>
            } & (TTable['globalIndexes'][Extract<
              K,
              keyof TTable['globalIndexes']
            >]['rangeKey'] extends string
              ? {
                  [RK in Extract<
                    NonNullable<
                      TTable['globalIndexes'][Extract<K, keyof TTable['globalIndexes']>]['rangeKey']
                    >,
                    string
                  >]: ResolveDynamoType<TTable['fields'][RK]>
                }
              : {})
          : {}
      }[keyof TGlobalIndexes]
    >

type ComputeLocalIndexFields<
  TTable extends Table<any>,
  TLocalIndexes extends LocalIndexesDef<TTable>
> = [keyof TLocalIndexes] extends [never]
  ? {}
  : UnionToIntersection<
      {
        [K in keyof TLocalIndexes]: TTable['localIndexes'] extends Record<string, any>
          ? {
              [RK in Extract<
                TTable['localIndexes'][Extract<K, keyof TTable['localIndexes']>]['rangeKey'],
                string
              >]: ResolveDynamoType<TTable['fields'][RK]>
            }
          : {}
      }[keyof TLocalIndexes]
    >

export type EntityGeneratedFields<
  TTable extends Table<any>,
  TGlobalIndexes extends GlobalIndexesDef<TTable>,
  TLocalIndexes extends LocalIndexesDef<TTable>,
  TTtl extends ((domain: any) => number | undefined) | undefined,
  TEntityType extends string | undefined
> = Prettify<
  // Primary Key Fields
  (TTable['primaryIndex']['rangeKey'] extends string
    ? {
        [K in TTable['primaryIndex']['hashKey']]: ResolveDynamoType<TTable['fields'][K]>
      } & {
        [K in TTable['primaryIndex']['rangeKey']]: ResolveDynamoType<TTable['fields'][K]>
      }
    : {
        [K in TTable['primaryIndex']['hashKey']]: ResolveDynamoType<TTable['fields'][K]>
      }) &
    // Global Index Fields
    ComputeGlobalIndexFields<TTable, TGlobalIndexes> &
    // Local Index Fields
    ComputeLocalIndexFields<TTable, TLocalIndexes> &
    // Entity Type Field
    (NonNullable<TEntityType> extends string
      ? TTable['entityTypeField'] extends string
        ? { [K in TTable['entityTypeField']]: NonNullable<TEntityType> }
        : {}
      : {}) &
    // TTL Field
    (Exclude<TTtl, undefined> extends (domain: any) => infer R
      ? TTable['ttl'] extends keyof TTable['fields']
        ? undefined extends R
          ? {
              [K in TTable['ttl']]?: R extends number ? number : R
            }
          : {
              [K in TTable['ttl']]: R extends number ? number : R
            }
        : {}
      : {})
>
