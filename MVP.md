# @awesome-sdk/lib-dynamodb — MVP Development Task List

## 0) Why this MVP exists

The goal is to ship a package that can be used as a **drop-in replacement** for
`@aws-sdk/lib-dynamodb`, while enabling **incremental adoption** of entity-based,
type-safe encoding/decoding (Zod + schema-first modeling) with minimal code
changes.

Target npm package: `@awesome-sdk/lib-dynamodb`

## 1) MVP goals (must-haves)

### G1 — Drop-in compatibility (default path)

- Existing code that currently does:
  - `import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'`
  - `await dynamo.send(new GetCommand({ TableName, Key, ... }))`
- Must work the same after changing only the import source to:
  - `import { DynamoDBDocumentClient, GetCommand } from '@awesome-sdk/lib-dynamodb'`
- No behavior changes when no “awesome” features are used.

### G2 — Incremental adoption (opt-in path)

Add an **entity-aware mode** that is opt-in per operation (per command instance),
to provide:

- Key calculation from domain key args (e.g. `{ id } → { pk, sk }`)
- Optional mapping boundary (encode/decode)
- Optional discriminator handling (single-table friendly)
- Strong TypeScript inference for inputs/outputs when entity-mode is used

### G3 — Keep the official mental model

- Primary UX remains: `client.send(new XCommand(input))`
- No separate “service/actions runner” required for the new public API.

## 2) Explicit non-goals (for MVP)

- Full parity coverage for _every_ DynamoDB command in entity-mode (MVP supports
  a small subset; all others remain pass-through).
- Automatic Zod validation on every read/write (can be opt-in later).
- A complete single-table abstraction (MVP focuses on the command drop-in layer).

## 3) MVP scope

### S1 — Commands supported in entity-mode (MVP)

- `GetCommand`
- `PutCommand`
- `QueryCommand`

Everything else:

- Re-export from `@aws-sdk/lib-dynamodb` unchanged
- Works as a normal DocumentClient command (no entity behavior)

### S2 — Entity primitives (MVP)

Keep the “entity” surface minimal but sufficient:

- `defineTable(...)`
- `defineEntity(...)`
- `defineKey(...)` (or equivalent)
- `encode(entity, input) → internalItem`
- `decode(entity, internalItem) → externalItem`

If existing Zodynamo internals are reused, MVP should still document and export
only what is needed for the new command-first API.

## 4) Proposed public API (MVP)

### 4.1 Drop-in exports

Export the same names users already import from `@aws-sdk/lib-dynamodb`:

- `DynamoDBDocumentClient`
- `GetCommand`, `PutCommand`, `QueryCommand`, and all other commands/utilities

For drop-in, existing callsites should compile and run without changes.

### 4.2 Entity-mode: minimal structural changes

Add an entity-mode input variant to the supported commands:

```ts
await dynamo.send(
  new GetCommand({
    Entity: UserEntity,
    Key: { id: 'some-id' },
    ConsistentRead: true
  })
)
```

Notes:

- `TableName` becomes optional when `Entity` is present:
  - `TableName ??= Entity.table.name`
  - Still allow `TableName` override for multi-tenancy.
- The `Key` shape becomes **domain key args** when `Entity` is present.

## 5) Design decision: how to get strong inference

### Problem

If we merely re-export AWS’s `GetCommand` and “add `Entity` to the input type”,
TypeScript cannot reliably infer the entity-specific types from the constructor
call, because AWS command classes are not generic over `Entity`.

### MVP decision (recommended)

Implement **our own command classes** (exported with the same names) that:

- Are source-compatible for existing raw usage
- Add an entity-aware constructor overload that **captures `E`**
- Extend the AWS command class at runtime so they still work with
  `DynamoDBDocumentClient.send(...)`

This preserves drop-in usage and enables strong typing for entity-mode.

## 6) Runtime behavior requirements (MVP)

### 6.1 No feature usage → strict pass-through

When a supported command is used without `Entity`:

- Do not modify `input`
- Do not modify output
- No extra attributes are written or removed

### 6.2 Entity usage → encode/decode boundary

When `Entity` is present:

**Get**

- Encode: convert domain key args to DynamoDB `Key` and select correct table name.
- Send: forward a _real_ AWS `GetCommand` input (strip `Entity`).
- Decode:
  - Convert `Item` (internal) to external/domain shape using entity mapping.
  - Handle “missing item” as `Item: undefined`.

**Put**

- Encode:
  - Convert external/domain item to internal DynamoDB item (keys, indexes,
    discriminator, TTL, mapping).
- Send: forward a real AWS `PutCommand` input.
- Decode:
  - If DynamoDB returns `Attributes`, decode them back to external shape.

**Query**

- Encode:
  - Support querying primary key and (optionally) index helpers if available in
    the entity/table model.
  - For MVP, prefer limiting entity-mode query to:
    - “partition key required” (+ optional range condition)
    - optional projection
- Decode:
  - Decode returned items into external shape.

### 6.3 Projection behavior (MVP)

Projection and “partial results” must be explicitly defined:

- Option A (strict): if projection is used, decoding still runs but returns
  a partial external shape and does not require missing fields.
- Option B (safe): if projection is used, return `unknown` unless user opts into
  `decodePartial: true`.

MVP should pick one policy and test it thoroughly.

### 6.4 Error behavior (MVP)

- If entity-mode decoding fails (e.g. decode transform throws), surface a
  dedicated error type with:
  - entity name
  - table name
  - operation
  - original error as `cause`
- DynamoDB client errors must be propagated unchanged.

## 7) Type system requirements (MVP)

### 7.1 Strict TS settings (non-negotiable)

- `strict: true`, `noUncheckedIndexedAccess`, `noImplicitAny`
- Avoid `any` (use `unknown`)
- Avoid `as` in library code unless localized and justified

### 7.2 Command input types (MVP)

For each supported command, define a union input:

- **Raw mode**: identical to AWS input type
- **Entity mode**: includes `Entity: E` and swaps some fields:
  - `TableName?: string`
  - `Key: DomainKeyArgs<E>` (Get)
  - `Item: ExternalItem<E>` (Put)

### 7.3 Command output types (MVP)

Define strongly typed outputs when `Entity` mode is used. Two viable options:

**Option 1 (minimal callsite changes): replace `Item`**

- In entity-mode, `Get` returns output where:
  - `Item` is external/domain shape
  - add `RawItem?: Record<string, unknown>` (optional escape hatch)

**Option 2 (least surprising): keep `Item` raw**

- Add `DecodedItem`/`DecodedItems` fields for entity-mode results.

MVP should pick one and apply consistently across `Get`, `Put`, and `Query`.

### 7.4 Multi-entity decode (future, not MVP)

For MVP, decoding should assume a single `Entity` per command. Multi-entity
query decode can be added later via:

- discriminator-based registry, or
- explicit `Entities: [A, B]` option

## 8) Implementation tasks (detailed)

### 8.1 Package rename + metadata

- Update `package.json`:
  - `"name": "@awesome-sdk/lib-dynamodb"`
  - Repository URL, keywords, description
  - Ensure `exports` and `types` point to built artifacts correctly
- Update `README.md` to reflect the new package name and new API (command-first).
- Ensure build output (tsdown) produces ESM/CJS + typings correctly.

### 8.2 Public entrypoint structure

- `src/index.ts` should:
  - Re-export everything from `@aws-sdk/lib-dynamodb` except overridden symbols
  - Export overridden:
    - `DynamoDBDocumentClient`
    - `GetCommand`, `PutCommand`, `QueryCommand` (our enhanced versions)
  - Export minimal modeling primitives (table/entity/key) required for MVP

Acceptance criteria:

- Import parity: common imports from `@aws-sdk/lib-dynamodb` also exist here.

### 8.3 Enhanced commands (Get/Put/Query)

For each enhanced command:

- Implement a class with the same exported name that extends the AWS command.
- Provide constructor overloads:
  - raw mode: accepts AWS input type (unchanged)
  - entity mode: accepts the entity-aware input (typed, captures `E`)
- Store enough metadata for runtime mapping:
  - whether entity-mode is active
  - the entity instance (if provided)
  - the original input

Acceptance criteria:

- `new GetCommand({ TableName, Key })` behaves identically to AWS.
- `new GetCommand({ Entity, Key: domainKey })` compiles with inferred key types.

### 8.4 Enhanced `DynamoDBDocumentClient`

Implement an enhanced `DynamoDBDocumentClient` that:

- Mirrors AWS construction:
  - `static from(client: DynamoDBClient, translateConfig?)`
- Exposes `send(command)`:
  - If command is an enhanced command in entity-mode:
    - transform input → AWS input
    - delegate to the underlying AWS DocumentClient
    - post-process output (decode) and return enhanced output type
  - Else: delegate directly (strict pass-through)

Acceptance criteria:

- Any non-enhanced command works unchanged.
- Enhanced commands in raw mode work unchanged.
- Enhanced commands in entity-mode encode/decode correctly.

### 8.5 Encode/decode + modeling reuse

Decide whether to:

- (A) Reuse existing Zodynamo entity/table internals, but re-export a minimal set
  under the new package, or
- (B) Extract a minimal modeling core dedicated to the command-first API

MVP tasks:

- Implement/verify:
  - primary key derivation (hash + optional sort)
  - optional tableName override
  - encode transforms (external → internal)
  - decode transforms (internal → external)

Acceptance criteria:

- Deterministic keys and mapping match current fixture expectations.

### 8.6 Tests (required for MVP)

#### Runtime unit tests (`tests/runtime`)

Add/modify tests to cover:

- Drop-in behavior:
  - `send(new GetCommand(rawInput))` passes through unchanged
  - No extra fields are sent to DynamoDB
- Entity-mode behavior:
  - Key calculation and correct `TableName` resolution
  - Mapping transforms (encode/decode)
  - Projection policy behavior (chosen option)
  - Error cases (decode error, DynamoDB error passthrough)

Testing style requirements:

- Four-layer `describe` structure: Class → Method → Input → Flow scopes
- Mocks via `vitest.fn()`

#### Type validation tests (`tests/type-validations`)

Add tests for:

- Drop-in compatibility types:
  - Existing AWS-style usage compiles without changes
- Entity-mode inference:
  - `Key` accepts only required domain key args
  - `Item`/`DecodedItem` types match the entity external schema
- Negative cases:
  - Wrong key fields rejected
  - Providing both raw and entity key shapes rejected (if enforced)

### 8.7 Documentation (MVP)

Update `README.md` with:

- Installation snippet for `@awesome-sdk/lib-dynamodb`
- “Drop-in mode” examples (no entity)
- “Entity-mode” examples (Get/Put/Query)
- Clear explanation of:
  - tableName override / multi-tenancy
  - projection behavior policy
  - error behavior

## 9) Milestones and exit criteria

### M1 — Drop-in package skeleton

Exit criteria:

- `pnpm typecheck` passes
- `pnpm test` passes
- `pnpm format` passes
- Consumers can replace imports and run existing code (tests simulate this)

### M2 — Entity-mode for GetCommand

Exit criteria:

- Typed domain `Key` inference
- Correct key encoding + decoding on output
- Projection policy implemented and tested

### M3 — Entity-mode for PutCommand

Exit criteria:

- Typed `Item` inference
- Correct encode on write
- Return value decode (if present)

### M4 — Entity-mode for QueryCommand

Exit criteria:

- Minimal query builder support (partition required; optional range)
- Decoded items output with predictable typing
- StartKey typing (if supported) is correct

## 9.5) Release checklist (MVP)

- Update `CHANGELOG.md` (initial “MVP” entry).
- Ensure package metadata is correct:
  - `name: @awesome-sdk/lib-dynamodb`
  - `license`, `repository`, `homepage`, `bugs`
  - `exports` contains ESM/CJS/types
- Verify consumers do not need `skipLibCheck` to use the package.
- Add a “compatibility” doc note:
  - AWS SDK v3 version(s) supported/tested (pin or peer strategy).
- Dry-run publish:
  - `pnpm pack` and inspect tarball contents (must include `dist/`, `README.md`, `LICENSE`).
- Publish under scope:
  - Confirm `@awesome-sdk` org permissions and default access (public/private).

## 10) Open decisions (must resolve early)

- Output strategy: replace `Item` vs add `DecodedItem(s)` - Add DecodedItem(s).
- Projection policy: strict vs opt-in partial decode
- How much of the existing modeling API is re-exported vs replaced
