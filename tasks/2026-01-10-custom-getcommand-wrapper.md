# Custom `GetCommand` Wrapper With Optional `Entity`

## Goal

Add a custom `GetCommand` wrapper that is a drop-in replacement for `@aws-sdk/lib-dynamodb`’s `GetCommand`, while extending the input type with an optional `Entity` and making `TableName` conditionally optional.

## Context

This package aims to be a drop-in replacement for `@aws-sdk/lib-dynamodb` with incremental adoption of entity-based modeling. `GetCommand` should remain compatible by default, but allow opt-in entity usage via an added `Entity` parameter.

## Scope

- Create `src/commands/GetCommand.ts` implementing a custom `GetCommand` wrapper.
- Define a custom input type that:
  - Matches the structure of `@aws-sdk/lib-dynamodb`’s `GetCommandInput`.
  - Adds `Entity?: Entity<...>` from `src/types/Entity.ts`.
  - Requires `TableName` when `Entity` is not provided.
  - Allows `TableName` to be omitted when `Entity` is provided.
  - Prefers explicit `TableName` when both `TableName` and `Entity` are provided.
- Update `src/index.ts` exports so consumers importing `GetCommand` from this package receive the custom wrapper.
- Add type-level tests under `tests/type-validations/` to verify:
  - The custom input type is compatible with `GetCommandInput` (structure matches).
  - `TableName` is required when `Entity` is absent.
  - `TableName` is optional when `Entity` is present.
  - Providing both `Entity` and `TableName` is allowed and preserves `TableName` in the input type.

## Out of Scope

- Any runtime behavior changes in `src/DynamoDBDocumentClient.ts` (custom command handling remains unimplemented).
- Any encoding/decoding, schema validation, or key derivation logic for `Entity` in this command.
- Implementing other commands (Put/Update/Delete/etc.).

## Acceptance Criteria

- [x] `src/commands/GetCommand.ts` exists and exports a custom `GetCommand`.
- [x] The custom input type is `GetCommandInput`-compatible and adds `Entity?: Entity<...>`.
- [x] TypeScript enforces `TableName` is required when `Entity` is not provided.
- [x] TypeScript allows omitting `TableName` when `Entity` is provided.
- [x] `src/index.ts` exports the custom `GetCommand` (not the upstream re-export).
- [x] Added type-level tests compile and cover the `TableName`/`Entity` rules.

## Implementation Notes

- Prefer expressing the `TableName` rule using a union of two object shapes rather than complex conditional types:
  - Variant A: `{ TableName: string; Entity?: undefined; ... }`
  - Variant B: `{ TableName?: string; Entity: Entity<...>; ... }`
- Ensure the wrapper remains a drop-in replacement when `Entity` is not used.

## References

- `src/index.ts`
- `src/types/Entity.ts`
- `@aws-sdk/lib-dynamodb` `GetCommand` / `GetCommandInput`

## Review

- [x] **Drop-in exports:** `@aws-sdk/lib-dynamodb` exports `GetCommandInput` and `GetCommandOutput`; this wrapper file only re-exports `NativeGetCommandOutput`, so `import { GetCommandOutput } from '@awesome-sdk/lib-dynamodb'` would currently fail. Consider adding `export type GetCommandOutput = NativeGetCommandOutput` (and avoid exposing `Native*` names publicly unless intentional).
- [x] **Runtime vs type mismatch:** the types allow `{ Entity, Key }` without `TableName`, but the constructor just forwards the input to the native command, so this will likely fail at runtime until entity handling is implemented. Consider a small runtime guard when `Entity` is provided and `TableName` is missing (throw a clear “Entity support not implemented; provide TableName” error), or keep `TableName` required until inference is implemented.
- [x] **Index surface area:** `export * from './commands/GetCommand'` currently exports `NativeGetCommandInput/Output` too; if you want strict drop-in parity, consider exporting only `GetCommand`, `GetCommandInput`, and `GetCommandOutput` from the package root.
- [x] **Type-test import path:** tests import `GetCommand` from `~/commands/GetCommand`; add at least one test that imports from the public entrypoint (`~/index` or package root) to ensure the intended consumer path works.
- [x] **.gitignore:** removal of `AGENTS.md`, `GEMINI.md`, and `.agent` from ignores is fine if you intend to commit them, but the file now lacks a trailing newline.
