export const RAW = Symbol('RAW_VALUE')

export interface Raw<T> {
  [RAW]: true
  value: T
}

export function raw<T>(value: T): Raw<T> {
  return {
    [RAW]: true,
    value
  }
}
