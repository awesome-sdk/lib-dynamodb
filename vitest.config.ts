import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    setupFiles: ['tests/vitest.setup.ts']
  }
})

