module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Relax strict null checks so test stubs are easier to construct.
        // diagnostics: false suppresses TS errors in production source files
        // that are not relevant to what is being tested (e.g. complex generics
        // in supabase client types that only materialise under ts-jest's
        // compilation context).
        tsconfig: { strict: false },
        diagnostics: false,
      },
    ],
  },
};
