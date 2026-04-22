module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Relax strict null checks so test stubs are easier to construct
        tsconfig: { strict: false },
      },
    ],
  },
};
