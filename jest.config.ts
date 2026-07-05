export default {
  roots: ['<rootDir>/apps', '<rootDir>/libraries'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
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
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx,js,jsx}',
    'libraries/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
  ],
};
