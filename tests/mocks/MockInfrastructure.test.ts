import { describe, it, expect, beforeEach } from 'vitest'
import { mockComposioClient } from './MockComposioClient.js'
import { mockResponseManager } from './MockResponseManager.js'
import { mockCallTracker } from '../utils/MockCallTracker.js'
import { 
  setupMocks,
  configureMockScenario,
  MockScenarios,
  assertApiCalled,
  assertApiNotCalled
} from './index.js'
import { TestFixtureFactory } from '../fixtures/TestFixtureFactory.js'

describe('Mock Infrastructure', () => {
  // Note: setupMocks() is called in global beforeEach in vitest.setup.ts
  // Individual tests can call setupMocks() if they need a fresh state

  describe('MockComposioClient', () => {
    it('should create mock sessions without network calls', async () => {
      const session = await mockComposioClient.createSession('test-user', ['youtube', 'twitter'])
      
      expect(session).toMatchObject({
        userId: 'test-user',
        toolkits: ['youtube', 'twitter']
      })
      expect(session.url).toMatch(/^ws:\/\/mock-session\//)
      expect(session.sessionId).toBeTruthy()
    })

    it('should return mock connection IDs', async () => {
      const connectionId = await mockComposioClient.getActiveConnectionId('youtube')
      
      expect(connectionId).toBeTruthy()
      expect(typeof connectionId).toBe('string')
      expect(connectionId).toMatch(/mock-.*-connection/)
    })

    it('should execute mock API calls and return configured responses', async () => {
      const response = await mockComposioClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test video' }
      })
      
      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })

    it('should track API call history', async () => {
      // Create a fresh mock client instance for this test to avoid interference
      const testClient = new (await import('./MockComposioClient.js')).MockComposioClient()
      
      const response = await testClient.proxyExecute({
        action: 'search',
        toolkit: 'youtube',
        params: { query: 'test' }
      })
      
      // Verify the response was successful
      expect(response.success).toBe(true)
      
      const history = testClient.getCallHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        service: 'youtube',
        endpoint: 'search',
        method: 'POST'
      })
    })

    it('should simulate authentication errors when configured', async () => {
      mockComposioClient.setMockError('youtube', 'getActiveConnectionId', new Error('Authentication failed'))
      
      await expect(mockComposioClient.getActiveConnectionId('youtube')).rejects.toThrow('Authentication failed')
    })
  })

  describe('MockResponseManager', () => {
    it('should store and retrieve configured responses', () => {
      const testResponse = { items: [{ id: 'test-123' }] }
      mockResponseManager.setResponse('youtube', 'search', testResponse)
      
      const retrieved = mockResponseManager.getResponse('youtube', 'search')
      expect(retrieved).toEqual(testResponse)
    })

    it('should handle response sequences for polling scenarios', () => {
      const sequence = [
        { status: 'processing' },
        { status: 'completed', url: 'test.mp4' }
      ]
      
      mockResponseManager.setResponseSequence('heygen', 'status', sequence)
      
      const first = mockResponseManager.getResponse('heygen', 'status')
      const second = mockResponseManager.getResponse('heygen', 'status')
      
      expect(first).toEqual({ status: 'processing' })
      expect(second).toEqual({ status: 'completed', url: 'test.mp4' })
    })

    it('should throw configured errors', () => {
      const testError = new Error('Service unavailable')
      mockResponseManager.setError('twitter', 'search', testError)
      
      expect(() => mockResponseManager.getResponse('twitter', 'search')).toThrow('Service unavailable')
    })

    it('should track call history', () => {
      const call = {
        service: 'youtube',
        endpoint: 'search',
        method: 'POST',
        params: { query: 'test' },
        timestamp: new Date()
      }
      
      mockResponseManager.recordCall(call)
      
      const history = mockResponseManager.getCallHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject(call)
    })
  })

  describe('MockCallTracker', () => {
    it('should track API calls and provide inspection utilities', () => {
      const call = {
        service: 'youtube',
        endpoint: 'search',
        method: 'POST',
        params: { query: 'test video' },
        timestamp: new Date()
      }
      
      mockCallTracker.recordCall(call)
      
      expect(mockCallTracker.wasApiCalled('youtube', 'search')).toBe(true)
      expect(mockCallTracker.getCallCount('youtube', 'search')).toBe(1)
      expect(mockCallTracker.getLastCallParams('youtube', 'search')).toEqual({ query: 'test video' })
    })

    it('should provide call filtering by service', () => {
      mockCallTracker.recordCall({
        service: 'youtube',
        endpoint: 'search',
        method: 'POST',
        params: {},
        timestamp: new Date()
      })
      
      mockCallTracker.recordCall({
        service: 'twitter',
        endpoint: 'search',
        method: 'POST',
        params: {},
        timestamp: new Date()
      })
      
      const youtubeCalls = mockCallTracker.getCallsForService('youtube')
      const twitterCalls = mockCallTracker.getCallsForService('twitter')
      
      expect(youtubeCalls).toHaveLength(1)
      expect(twitterCalls).toHaveLength(1)
      expect(youtubeCalls[0]?.service).toBe('youtube')
      expect(twitterCalls[0]?.service).toBe('twitter')
    })

    it('should generate call summaries', () => {
      mockCallTracker.recordCall({
        service: 'youtube',
        endpoint: 'search',
        method: 'POST',
        params: {},
        timestamp: new Date()
      })
      
      const summary = mockCallTracker.getCallSummary()
      expect(summary.youtube?.search?.count).toBe(1)
    })
  })

  describe('TestFixtureFactory', () => {
    it('should create realistic VideoReference objects', () => {
      const video = TestFixtureFactory.createVideoReference()
      
      expect(video).toMatchObject({
        title: expect.any(String),
        url: expect.any(String),
        videoId: expect.any(String),
        viewCount: expect.any(String)
      })
    })

    it('should create VideoReference with overrides', () => {
      const video = TestFixtureFactory.createVideoReference({
        title: 'Custom Title',
        viewCount: '999999'
      })
      
      expect(video.title).toBe('Custom Title')
      expect(video.viewCount).toBe('999999')
    })

    it('should create complete ResearchData objects', () => {
      const research = TestFixtureFactory.createResearchData()
      
      expect(research).toMatchObject({
        videos: expect.any(Array),
        rawTranscripts: expect.any(String),
        trends: expect.any(String),
        twitterInsights: expect.any(Array)
      })
      
      expect(research.videos.length).toBeGreaterThan(0)
      expect(research.twitterInsights!.length).toBeGreaterThan(0)
    })

    it('should create AgentState for different workflow stages', () => {
      const researchState = TestFixtureFactory.createAgentStateForStage('research')
      const scriptingState = TestFixtureFactory.createAgentStateForStage('scripting')
      
      expect(researchState.researchData).toBeUndefined()
      expect(researchState.script).toBeUndefined()
      
      expect(scriptingState.researchData).toBeDefined()
      expect(scriptingState.script).toBeUndefined()
    })

    it('should create mock API responses for different services', () => {
      const youtubeResponse = TestFixtureFactory.createMockApiResponse('youtube', 'search')
      const twitterResponse = TestFixtureFactory.createMockApiResponse('twitter', 'search')
      
      expect(youtubeResponse.items).toBeDefined()
      expect(twitterResponse.data).toBeDefined()
    })
  })

  describe('Mock Scenarios', () => {
    it('should configure success scenario', () => {
      configureMockScenario(MockScenarios.SUCCESS)
      
      const youtubeResponse = mockResponseManager.getResponse('youtube', 'search')
      expect(youtubeResponse.items).toBeDefined()
      expect(youtubeResponse.items[0].snippet.title).toBe('Successful Mock Video')
    })

    it('should configure authentication failure scenario', () => {
      configureMockScenario(MockScenarios.AUTHENTICATION_FAILURE)
      
      expect(() => mockResponseManager.getResponse('youtube', 'search')).toThrow('Authentication failed')
      expect(() => mockResponseManager.getResponse('twitter', 'search')).toThrow('Authentication failed')
    })

    it('should configure HeyGen polling scenario', () => {
      configureMockScenario(MockScenarios.HEYGEN_POLLING as any)
      
      // First call should return processing
      const first = mockResponseManager.getResponse('heygen', 'status')
      expect(first.status).toBe('processing')
      expect(first.progress).toBe(25)
      
      // Subsequent calls should progress through sequence
      const second = mockResponseManager.getResponse('heygen', 'status')
      expect(second.progress).toBe(50)
    })
  })

  describe('Assertion Utilities', () => {
    it('should provide assertion helpers for API calls', () => {
      mockCallTracker.recordCall({
        service: 'youtube',
        endpoint: 'search',
        method: 'POST',
        params: { query: 'test' },
        timestamp: new Date()
      })
      
      expect(() => assertApiCalled('youtube', 'search')).not.toThrow()
      expect(() => assertApiNotCalled('twitter', 'search')).not.toThrow()
      
      expect(() => assertApiCalled('twitter', 'search')).toThrow()
      expect(() => assertApiNotCalled('youtube', 'search')).toThrow()
    })
  })
})