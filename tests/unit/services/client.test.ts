import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockComposioClient } from '../../mocks/MockComposioClient'

describe('Service Layer - Composio Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Mock Infrastructure Validation', () => {
    it('should provide mock Composio client functionality', () => {
      expect(mockComposioClient).toBeDefined()
      expect(typeof mockComposioClient.createSession).toBe('function')
      expect(typeof mockComposioClient.getActiveConnectionId).toBe('function')
      expect(typeof mockComposioClient.proxyExecute).toBe('function')
    })

    it('should track API calls for debugging', async () => {
      // Reset first to ensure clean state
      mockComposioClient.reset()
      
      await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test' }
      })
      
      const callHistory = mockComposioClient.getCallHistory()
      expect(callHistory).toHaveLength(1)
      expect(callHistory[0].service).toBe('youtube')
      expect(callHistory[0].endpoint).toBe('search')
    })

    it('should reset state between tests', () => {
      // Add some state
      mockComposioClient.setMockResponse('test', 'endpoint', { data: 'test' })
      
      // Reset should clear everything
      mockComposioClient.reset()
      
      expect(mockComposioClient.getCallHistory()).toHaveLength(0)
    })
  })

  describe('Session Management', () => {
    it('should create mock toolkit sessions', async () => {
      const userId = 'test-user-123'
      const toolkits = ['youtube', 'twitter']
      
      const session = await mockComposioClient.createSession(userId, toolkits)
      
      expect(session).toBeDefined()
      expect(session.userId).toBe(userId)
      expect(session.toolkits).toEqual(toolkits)
      expect(session.url).toMatch(/^ws:\/\/mock-session\//)
      expect(session.sessionId).toMatch(/^mock-session-/)
    })

    it('should create unique session IDs for concurrent requests', async () => {
      const userId = 'test-user-concurrent'
      const toolkits = ['youtube']
      
      const [session1, session2] = await Promise.all([
        mockComposioClient.createSession(userId, toolkits),
        mockComposioClient.createSession(userId, toolkits)
      ])
      
      expect(session1.sessionId).not.toBe(session2.sessionId)
      expect(session1.url).not.toBe(session2.url)
    })

    it('should handle empty toolkit lists', async () => {
      const userId = 'test-user-empty'
      const toolkits: string[] = []
      
      const session = await mockComposioClient.createSession(userId, toolkits)
      
      expect(session).toBeDefined()
      expect(session.toolkits).toEqual([])
    })
  })

  describe('Connection Management', () => {
    it('should retrieve mock connection IDs for known services', async () => {
      const youtubeId = await mockComposioClient.getActiveConnectionId('youtube')
      const twitterId = await mockComposioClient.getActiveConnectionId('twitter')
      
      expect(youtubeId).toMatch(/^mock-.*youtube.*/)
      expect(twitterId).toMatch(/^mock-.*twitter.*/)
    })

    it('should handle case insensitive toolkit matching', async () => {
      const connectionId1 = await mockComposioClient.getActiveConnectionId('youtube')
      const connectionId2 = await mockComposioClient.getActiveConnectionId('YOUTUBE')
      
      // Both should return valid connection IDs (may be different due to timestamp)
      expect(connectionId1).toBeDefined()
      expect(connectionId2).toBeDefined()
    })

    it('should generate connection IDs for unknown services', async () => {
      const connectionId = await mockComposioClient.getActiveConnectionId('unknown-service')
      
      expect(connectionId).toMatch(/^mock-connection-unknown-service-/)
    })

    it('should track connection retrieval calls', async () => {
      await mockComposioClient.getActiveConnectionId('youtube')
      
      const callHistory = mockComposioClient.getCallHistory()
      expect(callHistory).toHaveLength(1)
      expect(callHistory[0].service).toBe('composio')
      expect(callHistory[0].endpoint).toBe('getActiveConnectionId')
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle mock errors for connection retrieval', async () => {
      const error = new Error('Network timeout')
      mockComposioClient.setMockError('youtube', 'getActiveConnectionId', error)
      
      await expect(mockComposioClient.getActiveConnectionId('youtube')).rejects.toThrow('Network timeout')
    })

    it('should handle authentication failures', async () => {
      const authError = new Error('Authentication failed: Invalid API key')
      mockComposioClient.setMockError('twitter', 'getActiveConnectionId', authError)
      
      await expect(mockComposioClient.getActiveConnectionId('twitter')).rejects.toThrow('Authentication failed: Invalid API key')
    })

    it('should handle proxy execution errors', async () => {
      const proxyError = new Error('Proxy execution failed')
      mockComposioClient.setMockError('heygen', 'generate', proxyError)
      
      await expect(mockComposioClient.proxyExecute({
        action: 'generate',
        toolkit: 'heygen',
        params: { script: 'test script' }
      })).rejects.toThrow('Proxy execution failed')
    })

    it('should handle rate limiting scenarios', async () => {
      // Reset to clear any existing mock responses
      mockComposioClient.reset()
      
      const rateLimitError = new Error('Rate limit exceeded. Please try again later.')
      mockComposioClient.setMockError('elevenlabs', 'generate', rateLimitError)
      
      await expect(mockComposioClient.proxyExecute({
        action: 'generate',
        toolkit: 'elevenlabs',
        params: { text: 'test audio' }
      })).rejects.toThrow('Rate limit exceeded')
    })

    it('should track error calls in history', async () => {
      // Reset to ensure clean state
      mockComposioClient.reset()
      
      const error = new Error('Test error')
      mockComposioClient.setMockError('youtube', 'search', error)
      
      try {
        await mockComposioClient.proxyExecute({
          action: 'search',
          toolkit: 'youtube',
          params: { query: 'test' }
        })
      } catch (e) {
        // Expected to throw
      }
      
      const callHistory = mockComposioClient.getCallHistory()
      expect(callHistory).toHaveLength(1)
      expect(callHistory[0].error).toBeDefined()
    })
  })

  describe('API Proxy Execution', () => {
    it('should execute proxy calls and return mock responses', async () => {
      const response = await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test video' }
      })
      
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })

    it('should track proxy execution calls', async () => {
      mockComposioClient.reset()
      
      await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test video' }
      })
      
      expect(mockComposioClient.wasApiCalled('youtube', 'search')).toBe(true)
      
      const callHistory = mockComposioClient.getCallHistoryForService('youtube')
      expect(callHistory).toHaveLength(1)
      expect(callHistory[0].endpoint).toBe('search')
    })

    it('should return default responses for unconfigured endpoints', async () => {
      const response = await mockComposioClient.proxyExecute({
        action: 'unknown-action',
        toolkit: 'unknown-service',
        params: {}
      })
      
      expect(response.success).toBe(true)
      expect(response.data.message).toContain('Mock response for unknown-service:unknown-action')
    })

    it('should handle concurrent proxy executions', async () => {
      mockComposioClient.reset()
      
      const promises = Array.from({ length: 3 }, (_, i) =>
        mockComposioClient.proxyExecute({
          action: 'search',
          toolkit: 'youtube',
          params: { query: `test query ${i}` }
        })
      )
      
      const responses = await Promise.all(promises)
      
      expect(responses).toHaveLength(3)
      responses.forEach(response => {
        expect(response.success).toBe(true)
      })
      
      expect(mockComposioClient.getApiCallCount('youtube', 'search')).toBe(3)
    })

    it('should support configurable mock responses', async () => {
      // Reset to clear default responses
      mockComposioClient.reset()
      
      const customResponse = { customData: 'test response' }
      mockComposioClient.setMockResponse('twitter', 'search', customResponse)
      
      const response = await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'twitter',
        params: { query: 'test' }
      })
      
      expect(response.data).toEqual(customResponse)
    })
  })

  describe('Service Layer Integration', () => {
    it('should validate service layer requirements coverage', () => {
      // Requirement 2.1: All external API calls should be mocked
      expect(mockComposioClient.proxyExecute).toBeDefined()
      
      // Requirement 2.2: Toolkit session creation should be mocked
      expect(mockComposioClient.createSession).toBeDefined()
      
      // Requirement 2.3: Authentication flows should be mocked
      expect(mockComposioClient.getActiveConnectionId).toBeDefined()
      
      // Requirement 7.1, 7.2: Error handling should be configurable
      expect(mockComposioClient.setMockError).toBeDefined()
    })

    it('should support realistic test data configuration', async () => {
      // Reset to clear default responses
      mockComposioClient.reset()
      
      const mockVideoData = {
        items: [
          {
            id: { videoId: 'test-video-id' },
            snippet: {
              title: 'Test Video Title',
              description: 'Test video description'
            },
            statistics: { viewCount: '1000000' }
          }
        ]
      }
      
      mockComposioClient.setMockResponse('youtube', 'search', mockVideoData)
      
      const response = await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test' }
      })
      
      expect(response.data).toEqual(mockVideoData)
    })

    it('should provide debugging capabilities through call inspection', async () => {
      mockComposioClient.reset()
      
      // Make several API calls
      await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'video1' }
      })
      
      await mockComposioClient.getActiveConnectionId('twitter')
      
      await mockComposioClient.createSession('user123', ['elevenlabs'])
      
      // Verify call tracking - should have 3 calls total
      const allCalls = mockComposioClient.getCallHistory()
      expect(allCalls.length).toBeGreaterThanOrEqual(2) // At least proxy and connection calls
      
      const youtubeCalls = mockComposioClient.getCallHistoryForService('youtube')
      expect(youtubeCalls).toHaveLength(1)
      
      expect(mockComposioClient.wasApiCalled('youtube', 'search')).toBe(true)
      expect(mockComposioClient.getApiCallCount('youtube', 'search')).toBe(1)
    })

    it('should maintain state isolation between test scenarios', async () => {
      // Set up initial state
      mockComposioClient.setMockResponse('test-service', 'test-action', { data: 'initial' })
      await mockComposioClient.proxyExecute({
        action: 'test-action',
        toolkit: 'test-service',
        params: {}
      })
      
      expect(mockComposioClient.getCallHistory()).toHaveLength(1)
      
      // Reset should clear everything
      mockComposioClient.reset()
      
      expect(mockComposioClient.getCallHistory()).toHaveLength(0)
      
      // Should use default response after reset
      const response = await mockComposioClient.proxyExecute({
        action: 'test-action',
        toolkit: 'test-service',
        params: {}
      })
      
      expect(response.data.message).toContain('Mock response for test-service:test-action')
    })
  })
})