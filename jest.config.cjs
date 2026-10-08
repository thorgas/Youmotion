module.exports = {
  preset: 'jest-expo',
  watchman: false,
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/vendor/', '\\.harness\\.[jt]sx?$'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: { '^.+\\.mjs$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(?:(?:jest-)?react-native[^@]*|expo[^@]*|fbtee|xstate|effect|@nkzw\\+[^@]+|@react-native\\+[^@]+|@react-native-community\\+[^@]+|@expo\\+[^@]+|@expo-google-fonts\\+[^@]+|@xstate\\+[^@]+)@)',
    'node_modules/(?!.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@nkzw/.*|expo-router|fbtee|@xstate/.*|xstate|effect|react-native-svg)',
  ],
  collectCoverageFrom: ['src/features/**/*.{ts,tsx}', '!**/*.harness.{ts,tsx}', '!**/*.perf.ts', '!**/index.ts'],
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 75, statements: 75 } },
};
