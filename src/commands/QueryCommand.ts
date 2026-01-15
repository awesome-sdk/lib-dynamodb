import {
  QueryCommand as NativeQueryCommand,
  QueryCommandInput as NativeQueryCommandInput,
  QueryCommandOutput as NativeQueryCommandOutput
} from '@aws-sdk/lib-dynamodb'

import { UnsafePath } from '~/expressions/unsafePath'
import { withDecodeMiddleware } from '~/middleware/decodeMiddleware'
import { Entity } from '~/types/Entity'
import {
  EntityGlobalIndexHashKeyValue,
  EntityGlobalIndexRangeKeyValue,
  EntityHashKeyValue,
  EntityLocalIndexRangeKeyValue,
  EntityRangeKeyValue,
  GlobalIndexName,
  LocalIndexName
} from '~/types/EntityKey'
import { FieldPath, PickByPaths, ValueAt } from '~/types/FieldPath'
import { InferEntity } from '~/types/InferEntity'

/**
 * Union of all queryable index names (Global + Local) for a given Entity's table.
 */
export type EntityIndexNames<TEntity> =
  TEntity extends Entity<infer TTable, any, any, any, any, any, any, any, any>
    ? GlobalIndexName<TTable> | LocalIndexName<TTable>
    : never

// --- Hash Condition (Partition Key) ---

/**
 * Hash Condition (Partition Key)
 * - Mandatory
 * - Equality only
 * - `value`: Raw value (already calculated strings/numbers)
 * - `from`: Calculation input (Entity field subset)
 */
type HashCondition<TItem, THashKeyDefinition extends { fields: any }, THashKeyValue> =
  | { value: THashKeyValue; from?: never }
  | { from: PickByPaths<TItem, THashKeyDefinition['fields'][number]>; value?: never }

// --- Range Condition (Sort Key) ---

/**
 * Range Condition (Sort Key)
 * - Optional
 * - One condition only
 * - `eq`, `lt`, `lte`, `gt`, `gte`, `beginsWith`, `between`
 * - `from`: Exact equality via calculation
 */
type RangeCondition<TItem, TRangeKeyDefinition extends { fields: any }, TRangeKeyValue> =
  | {
      eq: TRangeKeyValue
      lt?: never
      lte?: never
      gt?: never
      gte?: never
      beginsWith?: never
      between?: never
      from?: never
    }
  | {
      lt: TRangeKeyValue
      eq?: never
      lte?: never
      gt?: never
      gte?: never
      beginsWith?: never
      between?: never
      from?: never
    }
  | {
      lte: TRangeKeyValue
      eq?: never
      lt?: never
      gt?: never
      gte?: never
      beginsWith?: never
      between?: never
      from?: never
    }
  | {
      gt: TRangeKeyValue
      eq?: never
      lt?: never
      lte?: never
      gte?: never
      beginsWith?: never
      between?: never
      from?: never
    }
  | {
      gte: TRangeKeyValue
      eq?: never
      lt?: never
      lte?: never
      gt?: never
      beginsWith?: never
      between?: never
      from?: never
    }
  | {
      beginsWith: string
      eq?: never
      lt?: never
      lte?: never
      gt?: never
      gte?: never
      between?: never
      from?: never
    }
  | {
      between: [TRangeKeyValue, TRangeKeyValue]
      eq?: never
      lt?: never
      lte?: never
      gt?: never
      gte?: never
      beginsWith?: never
      from?: never
    }
  | {
      from: PickByPaths<TItem, TRangeKeyDefinition['fields'][number]>
      eq?: never
      lt?: never
      lte?: never
      gt?: never
      gte?: never
      beginsWith?: never
      between?: never
    }

// --- Index Logic ---

/**
 * Resolves the Key Condition Type for the Primary Index.
 */
type PrimaryIndexKeyCondition<TEntity extends Entity<any, any, any, any, any, any, any, any, any>> =
  TEntity extends Entity<infer TTable, any, infer TItem, any, any, any, any, any, any>
    ? {
        hash: HashCondition<TItem, TEntity['key']['hashKey'], EntityHashKeyValue<TTable>>
      } & (TEntity['key']['rangeKey'] extends { fields: any }
        ? {
            range?: RangeCondition<TItem, TEntity['key']['rangeKey'], EntityRangeKeyValue<TTable>>
          }
        : { range?: never })
    : never

/**
 * Resolves the Key Condition Type for a Global Secondary Index.
 */
type GlobalIndexKeyCondition<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends GlobalIndexName<TEntity['table']>
> =
  TEntity extends Entity<
    infer TTable,
    any,
    infer TItem,
    any,
    any,
    infer TGlobalIndexes,
    any,
    any,
    any
  >
    ? TGlobalIndexes extends Record<string, any>
      ? TGlobalIndexes[TIndexName] extends infer TGsiDef
        ? TGsiDef extends { hashKey: any }
          ? {
              hash: HashCondition<
                TItem,
                TGsiDef['hashKey'],
                EntityGlobalIndexHashKeyValue<TTable, TIndexName>
              >
            } & (TGsiDef extends { rangeKey: any }
              ? TGsiDef['rangeKey'] extends { fields: any }
                ? {
                    range?: RangeCondition<
                      TItem,
                      TGsiDef['rangeKey'],
                      EntityGlobalIndexRangeKeyValue<TTable, TIndexName>
                    >
                  }
                : { range?: never }
              : { range?: never })
          : never
        : never
      : never
    : never

/**
 * Resolves the Key Condition Type for a Local Secondary Index.
 * LSIs share the Primary Hash Key.
 */
type LocalIndexKeyCondition<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends LocalIndexName<TEntity['table']>
> =
  TEntity extends Entity<infer TTable, any, infer TItem, any, any, any, any, any, any>
    ? {
        // LSI shares primary hash key definition and value type
        hash: HashCondition<TItem, TEntity['key']['hashKey'], EntityHashKeyValue<TTable>>
      } & (Exclude<TEntity['localIndexes'], undefined> extends infer TLocalIndexes
        ? TLocalIndexes extends Record<string, any>
          ? TLocalIndexes[TIndexName] extends infer TLsiDef
            ? TLsiDef extends { rangeKey: any }
              ? TLsiDef['rangeKey'] extends { fields: any }
                ? {
                    range?: RangeCondition<
                      TItem,
                      TLsiDef['rangeKey'],
                      EntityLocalIndexRangeKeyValue<TTable, TIndexName>
                    >
                  }
                : { range?: never }
              : { range?: never }
            : never
          : never
        : never)
    : never

/**
 * Typed KeyConditionExpression using logical keys { hash, range }.
 * Requires:
 * - Partition Key: Equality check (shorthand value allowed)
 * - Range Key (if present): Optional condition (eq, lt, etc.)
 */
export type KeyCondition<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any>,
  TIndexName extends EntityIndexNames<TEntity> | undefined
> = TIndexName extends undefined
  ? PrimaryIndexKeyCondition<TEntity>
  : TIndexName extends GlobalIndexName<TEntity['table']>
    ? GlobalIndexKeyCondition<TEntity, TIndexName>
    : TIndexName extends LocalIndexName<TEntity['table']>
      ? LocalIndexKeyCondition<TEntity, TIndexName>
      : never

// --- Filter Expression Helpers ---

type DDBType = 'S' | 'N' | 'B' | 'SS' | 'NS' | 'BS' | 'M' | 'L' | 'NULL' | 'BOOL'

type SortableValue = string | number

type AllOperatorKeys =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'beginsWith'
  | 'between'
  | 'contains'
  | 'in'
  | 'exists'
  | 'type'

type OperatorPayloads<TValue> = {
  eq: TValue
  ne: TValue
  lt: TValue
  lte: TValue
  gt: TValue
  gte: TValue
  beginsWith: string
  between: [TValue, TValue]
  contains: TValue extends (infer U)[] ? U : string
  in: TValue[]
  exists: boolean
  type: DDBType
}

type OneOperator<TValue, K extends AllOperatorKeys> = {
  [P in K]: OperatorPayloads<TValue>[P]
} & {
  [P in Exclude<AllOperatorKeys, K>]?: never
}

type AllowedOperators<TValue> =
  | OneOperator<TValue, 'eq'>
  | OneOperator<TValue, 'ne'>
  | (TValue extends SortableValue ? OneOperator<TValue, 'lt'> : never)
  | (TValue extends SortableValue ? OneOperator<TValue, 'lte'> : never)
  | (TValue extends SortableValue ? OneOperator<TValue, 'gt'> : never)
  | (TValue extends SortableValue ? OneOperator<TValue, 'gte'> : never)
  | (TValue extends string ? OneOperator<TValue, 'beginsWith'> : never)
  | (TValue extends SortableValue ? OneOperator<TValue, 'between'> : never)
  | OneOperator<TValue, 'in'>
  | OneOperator<TValue, 'exists'>
  | OneOperator<TValue, 'type'>
  | (TValue extends string | any[] ? OneOperator<TValue, 'contains'> : never)

type LeafCondition<TItem> =
  | ({ attr: UnsafePath } & AllowedOperators<any>)
  | (FieldPath<TItem> extends infer P
      ? P extends string
        ? { attr: P } & AllowedOperators<ValueAt<TItem, P>>
        : never
      : never)

type LogicalNode<TItem> =
  | { and: FilterConditionNode<TItem>[]; or?: never; not?: never; attr?: never }
  | { or: FilterConditionNode<TItem>[]; and?: never; not?: never; attr?: never }
  | { not: FilterConditionNode<TItem>; and?: never; or?: never; attr?: never }

type FilterConditionNode<TItem> =
  | (LeafCondition<TItem> & { and?: never; or?: never; not?: never })
  | (LogicalNode<TItem> & { [K in AllOperatorKeys]?: never })

/**
 * Typed FilterExpression.
 */
export type FilterCondition<TEntity> =
  TEntity extends Entity<any, any, infer TItem, any, any, any, any, any, any>
    ? FilterConditionNode<TItem>
    : never

/**
 * Custom QueryCommandInput that allows an optional Entity.
 */
export type QueryCommandInput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined,
  TIndexName extends EntityIndexNames<TEntity> | undefined = undefined
> =
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any>
    ? Omit<
        NativeQueryCommandInput,
        | 'TableName'
        | 'IndexName'
        | 'KeyConditionExpression'
        | 'FilterExpression'
        | 'ExpressionAttributeNames'
        | 'ExpressionAttributeValues'
      > & {
        TableName?: string
        Entity: TEntity
        IndexName?: TIndexName
        KeyConditionExpression: KeyCondition<TEntity, TIndexName>
        FilterExpression?: FilterCondition<TEntity>
        ExpressionAttributeNames?: never
        ExpressionAttributeValues?: never
      }
    : NativeQueryCommandInput & {
        Entity?: undefined
      }

export type QueryCommandOutput<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined
> = NativeQueryCommandOutput &
  (TEntity extends Entity<any, any, any, any, any, any, any, any, any, any>
    ? {
        DecodedItems?: InferEntity<TEntity>[]
      }
    : {})

/**
 * Custom QueryCommand wrapper.
 */
export class QueryCommand<
  TEntity extends Entity<any, any, any, any, any, any, any, any, any, any> | undefined = undefined,
  const TIndexName extends EntityIndexNames<TEntity> | undefined = undefined
> extends NativeQueryCommand {
  private entity?: Entity<any, any, any, any, any, any, any, any, any, any>
  private middlewareAdded = false

  constructor(input: QueryCommandInput<TEntity, TIndexName>) {
    if (!('Entity' in input) || !input.Entity) {
      super(input as NativeQueryCommandInput)
      return
    }

    const {
      Entity: entity,
      TableName,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      KeyConditionExpression: _kce,
      FilterExpression,
      ...rest
    } = input
    const { table } = entity
    const effectiveTableName = TableName ?? table.name

    if (FilterExpression) {
      if (typeof FilterExpression !== 'object' || FilterExpression === null) {
        throw new Error('FilterExpression must be an object')
      }
      const fe = FilterExpression as any
      if ('and' in fe && Array.isArray(fe.and) && fe.and.length === 0) {
        throw new Error('Empty and array is not allowed')
      }
      if ('or' in fe && Array.isArray(fe.or) && fe.or.length === 0) {
        throw new Error('Empty or array is not allowed')
      }
    }

    // Runtime implementation of expression building is out of scope for this task.
    // We pass empty strings or raw values for now just to satisfy the super call,
    // assuming the user knows this is currently just for type testing.
    // In a real implementation, we would compile the ASTs here.

    super({
      TableName: effectiveTableName,
      ...rest
    } as NativeQueryCommandInput)

    this.entity = entity

    if (this.entity) {
      if (this.middlewareAdded) {
        return
      }

      withDecodeMiddleware(this.middlewareStack, this.entity, effectiveTableName, 'QueryCommand')
      this.middlewareAdded = true
    }
  }
}
