import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupMocks } from '../mocks/index.js'

// Global test setup
beforeAll(async () => {
  // Set up test environment variables
  process.env.NODE_ENV = 'test'
  
  // Mock environment variables that might be missing (Requirements 1.5)
  if (!process.env.COMPOSIO_API_KEY) {
    process.env.COMPOSIO_API_KEY = 'test-api-key'
  }
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'test-openai-key'
  }
  if (!process.env.COMPOSIO_USER_ID) {
    process.env.COMPOSIO_USER_ID = 'test-user-123'
  }
  
  // Additional auth config IDs for testing
  process.env.YOUTUBE_AUTH_CONFIG_ID = 'test-youtube-auth'
  process.env.TWITTER_AUTH_CONFIG_ID = 'test-twitter-auth'
  process.env.EXA_AUTH_CONFIG_ID = 'test-exa-auth'
})

afterAll(async () => {
  // Clean up after all tests
})

beforeEach(() => {
  // Reset mock state before each test (Requirements 2.1, 2.2, 2.3)
  setupMocks()
})

afterEach(() => {
  // Clean up after each test - mocks are reset in beforeEach
})