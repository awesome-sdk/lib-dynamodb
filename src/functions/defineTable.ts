import { Table } from '~/types/Table'

export function defineTable<
  const TFields extends Record<string, 'string' | 'number' | 'binary'>,
  const TOptions extends Table<TFields>
>(options: TOptions & { fields: TFields }) {
  return {
    ...options,
    name: options.name
  } as const
}
