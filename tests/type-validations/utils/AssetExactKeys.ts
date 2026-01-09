export type AssertExactKeys<T, K extends PropertyKey> = keyof T extends K
  ? K extends keyof T
    ? true
    : never
  : never
