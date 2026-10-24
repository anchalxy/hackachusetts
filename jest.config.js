/**
 * Jest config scoped to pure-logic unit/property tests under src/lib.
 *
 * These tests run in plain Node (no Expo/React Native runtime). Modules that
 * reach for the RN runtime at import time (theme/css, expo-sqlite, react) are
 * stubbed in __mocks__ / moduleNameMapper so the pure functions can be imported
 * in isolation.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.pbt.test.ts', '**/*.test.ts'],
  moduleNameMapper: {
    // expo-sqlite kv-store -> in-memory stub
    '^expo-sqlite/kv-store$': '<rootDir>/test/mocks/kv-store.ts',
    // theme pulls in RN StyleSheet; only t.points is needed by rewards
    '^@/ui/theme$': '<rootDir>/test/mocks/theme.ts',
    // expo-notifications is native-only (ESM build); report-events only needs alertReportChange
    '^@/lib/device-notifications$': '<rootDir>/test/mocks/device-notifications.ts',
    // generic @/ alias
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { allowImportingTsExtensions: false, types: ['jest', 'node'] } }],
  },
};
