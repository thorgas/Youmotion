module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '\\.harness\\.[jt]sx?$'],
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(?:(?:jest-)?react-native[^@]*|expo[^@]*|xstate|effect|@react-native\\+[^@]+|@react-native-community\\+[^@]+|@expo\\+[^@]+|@expo-google-fonts\\+[^@]+|@xstate\\+[^@]+)@)',
    'node_modules/(?!.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|@xstate/.*|xstate|effect|react-native-svg)',
  ],
  collectCoverageFrom: ['src/features/**/*.{ts,tsx}', '!**/*.harness.ts', '!**/*.perf.ts', '!**/index.ts'],
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 75, statements: 75 } },
};
