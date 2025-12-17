# Test Suite

This directory contains the comprehensive test suite for the video content agent project.

## Structure

- `unit/` - Unit tests for individual components
  - `agents/` - Tests for agent-specific functionality


- `fixtures/` - Test data and mock responses
- `mocks/` - Mock implementations for external services
- `utils/` - Test utilities and helper functions


## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```



## Framework

- **Testing Framework**: Vitest
- **Property Testing**: fast-check
- **Coverage**: @vitest/coverage-v8
- **Environment**: Node.js with TypeScript support