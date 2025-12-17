import { vi } from 'vitest'
import { mockComposioClient } from './MockComposioClient.js'
import { mockResponseManager } from './MockResponseManager.js'
import { mockCallTracker } from '../utils/MockCallTracker.js'

/**
 * Central mock setup that integrates all mock infrastructure components.
 * This file provides a unified interface for configuring mocks across all tests.
 * 
 * Requirements: 2.1, 2.2, 2.3 - Complete API mocking infrastructure
 */

// Mock the Composio client at the module level
vi.mock('../../src/services/client.js', async () => {
  const { mockComposioClient, createToolkitSession, getActiveConnectionId, getHeyGenConnectionId } = await import('./MockComposioClient.js')
  
  return {
    composio: mockComposioClient,
    COMPOSIO_USER_ID: 'test-user-123',
    createToolkitSession,
    getActiveConnectionId,
    getHeyGenConnectionId
  }
})

// Mock the OpenAI agents library to prevent real API calls
vi.mock('@openai/agents', () => ({
  Agent: vi.fn().mockImplementation(() => ({
    // Mock agent implementation
  })),
  run: vi.fn().mockResolvedValue({
    finalOutput: 'Mock agent response'
  }),
  hostedMcpTool: vi.fn().mockReturnValue({
    type: 'mock-tool',
    name: 'mock-mcp-tool'
  })
}))

/**
 * Sets up all mocks with default configurations
 */
export function setupMocks(): void {
  // Reset all mock states
  mockComposioClient.reset()
  mockResponseManager.reset()
  mockCallTracker.reset()
  
  // Set up default responses
  mockResponseManager.setupDefaultResponses()
  
  // Configure the mock client to use the response manager
  setupMockClientIntegration()
}

/**
 * Sets up error scenarios for testing error handling
 */
export function setupErrorScenarios(): void {
  mockResponseManager.setupErrorScenarios()
}

/**
 * Integrates the mock client with the response manager and call tracker
 */
function setupMockClientIntegration(): void {
  // Override the mock client's response methods to use the response manager
  const originalProxyExecute = mockComposioClient.proxyExecute.bind(mockComposioClient)
  
  mockComposioClient.proxyExecute = async (params) => {
    try {
      // Check if response manager has a configured response
      if (mockResponseManager.hasResponse(params.toolkit, params.action)) {
        const response = mockResponseManager.getResponse(params.toolkit, params.action)
        
        // Record the call
        const call = {
          service: params.toolkit,
          endpoint: params.action,
          method: 'POST',
          params: params.params,
          timestamp: new Date(),
          response
        }
        
        mockResponseManager.recordCall(call)
        mockCallTracker.recordCall(call)
        
        return {
          success: true,
          data: response
        }
      }
      
      // Fall back to default mock client behavior
      return await originalProxyExecute(params)
    } catch (error) {
      // Record the error call
      const call = {
        service: params.toolkit,
        endpoint: params.action,
        method: 'POST',
        params: params.params,
        timestamp: new Date(),
        error: error as Error
      }
      
      mockResponseManager.recordCall(call)
      mockCallTracker.recordCall(call)
      
      throw error
    }
  }
}

/**
 * Configures mock responses for a specific test scenario
 */
export function configureMockScenario(scenario: MockScenario): void {
  setupMocks() // Reset first
  
  // Apply scenario-specific configurations
  for (const [service, endpoints] of Object.entries(scenario.responses || {})) {
    for (const [endpoint, response] of Object.entries(endpoints)) {
      mockResponseManager.setResponse(service, endpoint, response)
    }
  }
  
  // Apply error configurations
  for (const [service, endpoints] of Object.entries(scenario.errors || {})) {
    for (const [endpoint, error] of Object.entries(endpoints)) {
      mockResponseManager.setError(service, endpoint, new Error(error))
    }
  }
  
  // Apply response sequences for polling scenarios
  for (const [service, endpoints] of Object.entries(scenario.sequences || {})) {
    for (const [endpoint, sequence] of Object.entries(endpoints)) {
      mockResponseManager.setResponseSequence(service, endpoint, sequence)
    }
  }
}

/**
 * Gets the current mock state for inspection
 */
export function getMockState(): MockState {
  return {
    callHistory: mockCallTracker.getCallHistory(),
    callSummary: mockCallTracker.getCallSummary(),
    expectations: mockCallTracker.verifyExpectations()
  }
}

/**
 * Generates a detailed report of all mock interactions
 */
export function generateMockReport(): string {
  return mockCallTracker.generateReport()
}

// Export all mock components for direct access when needed
export { mockComposioClient } from './MockComposioClient.js'
export { mockResponseManager } from './MockResponseManager.js'
export { mockCallTracker } from '../utils/MockCallTracker.js'

// Export utility functions
export {
  assertApiCalled,
  assertApiNotCalled,
  assertApiCalledWith
} from '../utils/MockCallTracker.js'

// Type definitions
export interface MockScenario {
  name?: string
  description?: string
  responses?: {
    [service: string]: {
      [endpoint: string]: any
    }
  }
  errors?: {
    [service: string]: {
      [endpoint: string]: string
    }
  }
  sequences?: {
    [service: string]: {
      [endpoint: string]: any[]
    }
  }
}

export interface MockState {
  callHistory: any[]
  callSummary: any
  expectations: any[]
}

// Pre-defined scenarios for common test cases
export const MockScenarios = {
  SUCCESS: {
    name: 'All APIs Success',
    description: 'All API calls return successful responses',
    responses: {
      youtube: {
        search: {
          items: [
            {
              id: { videoId: 'success-video-1' },
              snippet: { title: 'Successful Mock Video' },
              statistics: { viewCount: '1000000' }
            }
          ]
        }
      },
      twitter: {
        search: {
          data: [
            {
              id: '1234567890',
              text: 'Successful mock tweet',
              public_metrics: { like_count: 1000 }
            }
          ]
        }
      }
    }
  },
  
  AUTHENTICATION_FAILURE: {
    name: 'Authentication Failures',
    description: 'All APIs return authentication errors',
    errors: {
      youtube: {
        search: 'Authentication failed: Invalid API key'
      },
      twitter: {
        search: 'Authentication failed: Token expired'
      },
      elevenlabs: {
        generate: 'Authentication failed: Invalid API key'
      }
    }
  },
  
  HEYGEN_POLLING: {
    name: 'HeyGen Polling Workflow',
    description: 'Simulates HeyGen video generation with polling',
    responses: {
      heygen: {
        generate: {
          video_id: 'polling-video-123',
          status: 'processing'
        }
      }
    },
    sequences: {
      heygen: {
        status: [
          { status: 'processing', progress: 25 },
          { status: 'processing', progress: 50 },
          { status: 'processing', progress: 75 },
          { 
            status: 'completed', 
            progress: 100,
            video_url: 'https://heygen.com/videos/completed-video.mp4'
          }
        ]
      }
    }
  }
} as const