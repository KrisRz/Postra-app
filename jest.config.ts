export default {
  roots: ['<rootDir>/apps', '<rootDir>/libraries'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  // CI runs `pnpm build` before `pnpm test`, so never treat compiled output
  // (.next chunks, dist/) as tests.
  testPathIgnorePatterns: ['/node_modules/', '/\\.next/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironment: 'node',
  clearMocks: true,
  // Transpile-only (isolatedModules): compile TS/TSX for tests without full
  // type-checking, so a strict-tsc error in unrelated app code can't break the
  // test run. jsx is set for component tests that opt into the jsdom env.
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: { jsx: 'react-jsx', esModuleInterop: true },
      },
    ],
  },
  // Coverage from source only. Restricting to {ts,tsx} already skips compiled
  // .js output, and the explicit negations + ignore patterns keep the reporter
  // away from .next (its sectioned source maps crash the reporter and time the
  // job out) and dist/.
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'libraries/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.{spec,test}.{ts,tsx}',
    '!**/.next/**',
    '!**/dist/**',
    '!**/node_modules/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/\\.next/', '/dist/', '/coverage/'],
};
