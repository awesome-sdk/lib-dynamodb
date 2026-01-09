import { ZodSchema, z } from 'zod'

import {
  Entity,
  EntityGlobalIndexesDefinition,
  EntityLocalIndexesDefinition,
  EntityTransform
} from '~/types/Entity'
import { EntityGeneratedFields } from '~/types/EntityGeneratedFields'
import {
  EntityHashKeyValue,
  EntityRangeKeyValue,
  GlobalIndexName,
  LocalIndexName
} from '~/types/EntityKey'
import { KeyFieldPath, PickByPaths } from '~/types/FieldPath'
import { Table } from '~/types/Table'

export type { EntityKey } from '~/types/EntityKey'

type KeyPartDefinition<
  TSchema extends ZodSchema,
  TKeyFields extends readonly KeyFieldPath<z.infer<TSchema>>[],
  TResult
> = {
  fields: TKeyFields
  calculate: (item: PickByPaths<z.infer<TSchema>, TKeyFields[number]>) => TResult
}

type EntityTypeOption<
  TTable extends Table<any>,
  TEntityType extends string | undefined
> = TTable extends { entityTypeField: string } ? Exclude<TEntityType, undefined> : never

type EntityKeyDefinition<
  TTable extends Table<any>,
  TSchema extends ZodSchema,
  THashKeyFields extends readonly KeyFieldPath<z.infer<TSchema>>[],
  TRangeKeyFields extends readonly KeyFieldPath<z.infer<TSchema>>[]
> = {
  hashKey: KeyPartDefinition<TSchema, THashKeyFields, EntityHashKeyValue<TTable>>
} & (TTable['primaryIndex']['rangeKey'] extends string
  ? { rangeKey: KeyPartDefinition<TSchema, TRangeKeyFields, EntityRangeKeyValue<TTable>> }
  : { rangeKey?: never })

type EntityLocalIndexRangeKeyFields<TTable extends Table<any>, TSchema extends ZodSchema> = Partial<
  Record<LocalIndexName<TTable>, readonly KeyFieldPath<z.infer<TSchema>>[]>
>

type EntityTtlConstraint<TTable extends Table<any>> = TTable['ttl'] extends keyof TTable['fields']
  ? {}
  : { ttl?: never }

export function defineEntity<
  TTable extends Table<any>,
  TName extends string,
  TSchema extends ZodSchema,
  const THashKeyFields extends readonly KeyFieldPath<z.infer<TSchema>>[],
  const TRangeKeyFields extends readonly KeyFieldPath<z.infer<TSchema>>[] = [],
  const TGlobalIndexes extends Partial<Record<GlobalIndexName<TTable>, any>> = {},
  const TLocalIndexRangeKeyFields extends EntityLocalIndexRangeKeyFields<TTable, TSchema> = {},
  TTtl extends ((domain: z.infer<TSchema>) => number | undefined) | undefined = (
    domain: z.infer<TSchema>
  ) => number | undefined,
  const TEntityType extends string | undefined = undefined,
  /*
   * TInternal is inferred from the transform.encode return type.
   * It is constrained to ensure checks on required fields.
   */
  TInternal extends
    | EntityGeneratedFields<
        TTable,
        TGlobalIndexes,
        EntityLocalIndexesDefinition<TTable, z.infer<TSchema>, TLocalIndexRangeKeyFields>,
        TTtl,
        TEntityType
      >
    | undefined = undefined
>(
  table: TTable,
  options: {
    name: TName
    schema: TSchema
    key: EntityKeyDefinition<TTable, TSchema, THashKeyFields, TRangeKeyFields>
    entityType?: EntityTypeOption<TTable, TEntityType>
    ttl?: TTtl
    transform?: EntityTransform<
      z.infer<TSchema>,
      EntityGeneratedFields<
        TTable,
        TGlobalIndexes,
        EntityLocalIndexesDefinition<TTable, z.infer<TSchema>, TLocalIndexRangeKeyFields>,
        TTtl,
        TEntityType
      >,
      TInternal
    >
  } & EntityTtlConstraint<TTable> &
    (GlobalIndexName<TTable> extends never
      ? { globalIndexes?: never }
      : {
          globalIndexes?: TGlobalIndexes & EntityGlobalIndexesDefinition<TTable, z.infer<TSchema>>
        }) &
    (LocalIndexName<TTable> extends never
      ? { localIndexes?: never }
      : {
          localIndexes?: EntityLocalIndexesDefinition<
            TTable,
            z.infer<TSchema>,
            TLocalIndexRangeKeyFields
          >
        })
): Omit<
  Entity<
    TTable,
    TName,
    z.infer<TSchema>,
    THashKeyFields,
    TRangeKeyFields,
    TGlobalIndexes,
    TLocalIndexRangeKeyFields,
    TTtl,
    TEntityType,
    undefined extends TInternal
      ? undefined
      : EntityTransform<
          z.infer<TSchema>,
          EntityGeneratedFields<
            TTable,
            TGlobalIndexes,
            EntityLocalIndexesDefinition<TTable, z.infer<TSchema>, TLocalIndexRangeKeyFields>,
            TTtl,
            TEntityType
          >,
          TInternal
        >,
    z.input<TSchema>
  >,
  'globalIndexes'
> &
  ([keyof TGlobalIndexes] extends [never]
    ? { globalIndexes?: never }
    : { globalIndexes: TGlobalIndexes }) {
  return {
    table,
    name: options.name,
    schema: options.schema,
    key: options.key,
    globalIndexes: options.globalIndexes,
    localIndexes: options.localIndexes,
    entityType: options.entityType,
    ttl: options.ttl,
    transform: options.transform
  } as any
}
