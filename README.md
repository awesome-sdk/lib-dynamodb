# lib-dynamodb

> ⚠️ **Note**: This project is currently in development. There are no official releases available yet.

A drop-in replacement for @aws-sdk/lib-dynamodb with optional, incremental adoption of schema-first entities (Zod) for type-safe key generation and domain mapping—while keeping the familiar DynamoDBDocumentClient.send(new Command()) API.

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

- Full parity coverage for *every* DynamoDB command in entity-mode (MVP supports
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

## 5) Runtime behavior requirements (MVP)

### 5.1 No feature usage → strict pass-through

When a supported command is used without `Entity`:

- Do not modify `input`
- Do not modify output
- No extra attributes are written or removed

### 5.2 Entity usage → encode/decode boundary

When `Entity` is present:

**Get**
- Encode: convert domain key args to DynamoDB `Key` and select correct table name.
- Send: forward a *real* AWS `GetCommand` input (strip `Entity`).
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
