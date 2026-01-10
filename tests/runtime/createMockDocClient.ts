import type { Mock } from 'vitest'
import { vi } from 'vitest'

export type MockDocClientSend = (
  command: unknown,
  optionsOrCb?: unknown,
  cb?: unknown
) => unknown

export type MockDocClient = {
  send: Mock<MockDocClientSend>
  destroy: Mock<() => void>
  config: unknown
  middlewareStack: unknown
}

export function createMockDocClient(overrides?: Partial<MockDocClient>): MockDocClient {
  const base: MockDocClient = {
    send: vi.fn<MockDocClientSend>(),
    destroy: vi.fn<() => void>(),
    config: {},
    middlewareStack: {}
  }

  return { ...base, ...overrides }
}
