import { vi } from 'vitest'

export interface MockSession {
  url: string
  sessionId: string
  userId: string
  toolkits: string[]
}

export interface ProxyExecuteParams {
  action: string
  toolkit: string
  params: any
  connectionId?: string
}

export interface MockResponse {
  success: boolean
  data: any
  error?: string
}

export interface ApiCall {
  service: string
  endpoint: string
  method: string
  params: any
  timestamp: Date
  response?: any
  error?: Error
}

/**
 * MockComposioClient provides a complete mock implementation of the Composio client
 * for testing purposes. It intercepts all external API calls and returns configurable
 * mock responses without making real network requests.
 * 
 * Requirements: 2.1, 2.2, 2.3 - Complete API mocking with session and authentication
 */
export class MockComposioClient {
  private sessions: Map<string, MockSession> = new Map()
  private connections: Map<string, string> = new Map()
  private callHistory: ApiCall[] = []
  private mockResponses: Map<string, any> = new Map()
  private mockErrors: Map<string, Error> = new Map()

  constructor() {
    this.setupDefaultConnections()
    this.setupDefaultResponses()
  }

  /**
   * Creates a mock toolkit session without making network requests
   */
  async createSession(userId: string, toolkits: string[]): Promise<MockSession> {
    const sessionId = `mock-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const session: MockSession = {
      url: `ws://mock-session/${sessionId}`,
      sessionId,
      userId,
      toolkits
    }

    this.sessions.set(sessionId, session)
    
    // Track the API call
    this.recordApiCall({
      service: 'composio',
      endpoint: 'createSession',
      method: 'POST',
      params: { userId, toolkits },
      timestamp: new Date(),
      response: session
    })

    return session
  }

  /**
   * Returns mock connection IDs for authenticated services
   */
  async getActiveConnectionId(toolkit: string): Promise<string> {
    const connectionKey = toolkit.toLowerCase()
    
    // Check if we should simulate an error - use the correct key format
    const errorKey = `${connectionKey}:getActiveConnectionId`
    if (this.mockErrors.has(errorKey)) {
      const error = this.mockErrors.get(errorKey)!
      this.recordApiCall({
        service: 'composio',
        endpoint: 'getActiveConnectionId',
        method: 'GET',
        params: { toolkit },
        timestamp: new Date(),
        error
      })
      throw error
    }

    const connectionId = this.connections.get(connectionKey) || `mock-connection-${connectionKey}-${Date.now()}`
    
    this.recordApiCall({
      service: 'composio',
      endpoint: 'getActiveConnectionId',
      method: 'GET',
      params: { toolkit },
      timestamp: new Date(),
      response: connectionId
    })

    return connectionId
  }

  /**
   * Executes mock API calls and returns configured responses
   */
  async proxyExecute(params: ProxyExecuteParams): Promise<MockResponse> {
    const { action, toolkit, params: actionParams } = params
    const responseKey = `${toolkit}:${action}`
    
    // Always record the API call first
    const apiCall: ApiCall = {
      service: toolkit,
      endpoint: action,
      method: 'POST',
      params: actionParams,
      timestamp: new Date()
    }
    
    // Check if we should simulate an error
    if (this.mockErrors.has(responseKey)) {
      const error = this.mockErrors.get(responseKey)!
      apiCall.error = error
      this.recordApiCall(apiCall)
      throw error
    }

    // Get configured response or default
    const mockData = this.mockResponses.get(responseKey) || this.getDefaultResponse(toolkit, action)
    
    const response: MockResponse = {
      success: true,
      data: mockData
    }

    // Record successful call
    apiCall.response = mockData
    this.recordApiCall(apiCall)

    return response
  }

  /**
   * Configures mock responses for specific service endpoints
   */
  setMockResponse(service: string, endpoint: string, response: any): void {
    const key = `${service}:${endpoint}`
    this.mockResponses.set(key, response)
  }

  /**
   * Configures mock errors for specific service endpoints
   */
  setMockError(service: string, endpoint: string, error: Error): void {
    const key = `${service.toLowerCase()}:${endpoint}`
    this.mockErrors.set(key, error)
  }

  /**
   * Returns the complete call history for inspection
   */
  getCallHistory(): ApiCall[] {
    return [...this.callHistory]
  }

  /**
   * Returns call history filtered by service
   */
  getCallHistoryForService(service: string): ApiCall[] {
    return this.callHistory.filter(call => call.service === service)
  }

  /**
   * Clears all mock configurations and call history
   */
  reset(): void {
    this.sessions.clear()
    this.callHistory = []
    this.mockResponses.clear()
    this.mockErrors.clear()
    this.setupDefaultConnections()
    this.setupDefaultResponses()
  }

  /**
   * Checks if a specific API call was made
   */
  wasApiCalled(service: string, endpoint: string): boolean {
    return this.callHistory.some(call => 
      call.service === service && call.endpoint === endpoint
    )
  }

  /**
   * Gets the number of times a specific API was called
   */
  getApiCallCount(service: string, endpoint: string): number {
    return this.callHistory.filter(call => 
      call.service === service && call.endpoint === endpoint
    ).length
  }

  private recordApiCall(call: ApiCall): void {
    this.callHistory.push(call)
  }

  private setupDefaultConnections(): void {
    // Set up default connection IDs for all supported services
    this.connections.set('youtube', 'mock-youtube-connection-123')
    this.connections.set('twitter', 'mock-twitter-connection-456')
    this.connections.set('elevenlabs', 'mock-elevenlabs-connection-789')
    this.connections.set('heygen', 'mock-heygen-connection-abc')
    this.connections.set('exa', 'mock-exa-connection-def')
  }

  private setupDefaultResponses(): void {
    // YouTube search responses
    this.mockResponses.set('youtube:search', {
      items: [
        {
          id: { videoId: 'mock-video-1' },
          snippet: {
            title: 'Mock Viral Short #1',
            description: 'A mock viral short video'
          },
          statistics: { viewCount: '1000000' }
        },
        {
          id: { videoId: 'mock-video-2' },
          snippet: {
            title: 'Mock Viral Short #2',
            description: 'Another mock viral short video'
          },
          statistics: { viewCount: '500000' }
        }
      ]
    })

    // Twitter search responses
    this.mockResponses.set('twitter:search', {
      data: [
        {
          id: 'mock-tweet-1',
          text: 'Mock viral tweet about trending topic',
          public_metrics: {
            like_count: 5000,
            reply_count: 100,
            retweet_count: 1000
          }
        },
        {
          id: 'mock-tweet-2',
          text: 'Another mock viral tweet with high engagement',
          public_metrics: {
            like_count: 3000,
            reply_count: 50,
            retweet_count: 500
          }
        }
      ]
    })

    // ElevenLabs audio generation responses
    this.mockResponses.set('elevenlabs:generate', {
      audio_url: 'https://mock-audio-url.com/generated-audio.mp3',
      status: 'completed'
    })

    // HeyGen video generation responses
    this.mockResponses.set('heygen:generate', {
      video_id: 'mock-video-generation-123',
      status: 'processing'
    })

    this.mockResponses.set('heygen:status', {
      video_id: 'mock-video-generation-123',
      status: 'completed',
      video_url: 'https://mock-video-url.com/generated-video.mp4'
    })

    // Exa search responses
    this.mockResponses.set('exa:search', {
      results: [
        {
          title: 'Mock News Article 1',
          url: 'https://mock-news-site.com/article-1',
          text: 'Mock news content about trending topic',
          publishedDate: new Date().toISOString()
        },
        {
          title: 'Mock News Article 2',
          url: 'https://mock-news-site.com/article-2',
          text: 'Another mock news article with relevant content',
          publishedDate: new Date().toISOString()
        }
      ]
    })
  }

  private getDefaultResponse(toolkit: string, action: string): any {
    const key = `${toolkit}:${action}`
    return this.mockResponses.get(key) || {
      message: `Mock response for ${toolkit}:${action}`,
      timestamp: new Date().toISOString()
    }
  }
}

// Create a singleton instance for use across tests
export const mockComposioClient = new MockComposioClient()

// Mock functions that match the original client interface
export const createToolkitSession = vi.fn().mockImplementation(
  (userId: string, toolkits: string[]) => mockComposioClient.createSession(userId, toolkits)
)

export const getActiveConnectionId = vi.fn().mockImplementation(
  (toolkit: string) => mockComposioClient.getActiveConnectionId(toolkit)
)

export const getHeyGenConnectionId = vi.fn().mockImplementation(
  (toolkit: string) => mockComposioClient.getActiveConnectionId(toolkit)
)