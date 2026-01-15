/**
 * An opaque wrapper for attribute paths that bypasses strict type checking.
 */
export type UnsafePath = {
  readonly _tag: 'UnsafePath'
  readonly path: string
}

/**
 * Escape hatch to allow arbitrary attribute paths in filter expressions
 * that are not necessarily representable by the Entity's Zod schema
 * (e.g., deeply nested dynamic keys, specific array indices, etc.).
 */
export function unsafePath(path: string): UnsafePath {
  return { _tag: 'UnsafePath', path }
}
