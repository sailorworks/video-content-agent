import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Environment configuration
    environment: 'node',
    
    // Test file patterns
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // Setup files
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    
    // TypeScript support
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds (Requirements 8.1, 8.2)
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 90,
        statements: 80
      },
      
      // Coverage exclusions (Requirements 8.4)
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        'tests/**',
        'vitest.config.ts'
      ]
    },
    
    // Performance configuration (Requirements 1.4)
    testTimeout: 30000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporter: ['verbose']
  }
})