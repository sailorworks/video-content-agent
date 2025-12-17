import type { ApiCall } from './MockComposioClient.js'

/**
 * MockResponseManager provides centralized configuration and management
 * of mock API responses across all test scenarios.
 * 
 * Requirements: 2.4, 2.5 - Configurable mock responses per test case
 */
export class MockResponseManager {
  private responses: Map<string, any> = new Map()
  private errors: Map<string, Error> = new Map()
  private callHistory: ApiCall[] = []
  private responseSequences: Map<string, any[]> = new Map()
  private callCounts: Map<string, number> = new Map()

  /**
   * Sets a mock response for a specific service and endpoint
   */
  setResponse(service: string, endpoint: string, response: any): void {
    const key = this.createKey(service, endpoint)
    this.responses.set(key, response)
  }

  /**
   * Sets a mock error for a specific service and endpoint
   */
  setError(service: string, endpoint: string, error: Error): void {
    const key = this.createKey(service, endpoint)
    this.errors.set(key, error)
  }

  /**
   * Sets a sequence of responses for multiple calls to the same endpoint
   * Useful for testing polling scenarios or retry mechanisms
   */
  setResponseSequence(service: string, endpoint: string, responses: any[]): void {
    const key = this.createKey(service, endpoint)
    this.responseSequences.set(key, [...responses])
    this.callCounts.set(key, 0)
  }

  /**
   * Gets the configured response for a service and endpoint
   * Handles sequences and single responses
   */
  getResponse(service: string, endpoint: string): any {
    const key = this.createKey(service, endpoint)
    
    // Check if there's an error configured
    if (this.errors.has(key)) {
      throw this.errors.get(key)!
    }

    // Check if there's a response sequence
    if (this.responseSequences.has(key)) {
      const sequence = this.responseSequences.get(key)!
      const currentCount = this.callCounts.get(key) || 0
      
      // Increment call count
      this.callCounts.set(key, currentCount + 1)
      
      // Return the appropriate response from sequence
      if (currentCount < sequence.length) {
        return sequence[currentCount]
      } else {
        // Return the last response if we've exceeded the sequence
        return sequence[sequence.length - 1]
      }
    }

    // Return single configured response
    return this.responses.get(key)
  }

  /**
   * Checks if a response is configured for the given service and endpoint
   */
  hasResponse(service: string, endpoint: string): boolean {
    const key = this.createKey(service, endpoint)
    return this.responses.has(key) || this.errors.has(key) || this.responseSequences.has(key)
  }

  /**
   * Records an API call for history tracking
   */
  recordCall(call: ApiCall): void {
    this.callHistory.push(call)
  }

  /**
   * Gets the complete call history
   */
  getCallHistory(): ApiCall[] {
    return [...this.callHistory]
  }

  /**
   * Gets call history filtered by service
   */
  getCallHistoryForService(service: string): ApiCall[] {
    return this.callHistory.filter(call => call.service === service)
  }

  /**
   * Gets call history for a specific service and endpoint
   */
  getCallHistoryForEndpoint(service: string, endpoint: string): ApiCall[] {
    return this.callHistory.filter(call => 
      call.service === service && call.endpoint === endpoint
    )
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

  /**
   * Gets the parameters from the last call to a specific endpoint
   */
  getLastCallParams(service: string, endpoint: string): any {
    const calls = this.getCallHistoryForEndpoint(service, endpoint)
    return calls.length > 0 ? calls[calls.length - 1].params : null
  }

  /**
   * Clears all configured responses, errors, and call history
   */
  reset(): void {
    this.responses.clear()
    this.errors.clear()
    this.callHistory = []
    this.responseSequences.clear()
    this.callCounts.clear()
  }

  /**
   * Sets up common mock responses for typical test scenarios
   */
  setupDefaultResponses(): void {
    // YouTube API responses
    this.setResponse('youtube', 'search', {
      items: [
        {
          id: { videoId: 'dQw4w9WgXcQ' },
          snippet: {
            title: 'Never Gonna Give You Up - Rick Astley',
            description: 'The official video for Rick Astley'
          },
          statistics: { viewCount: '1000000000' }
        }
      ]
    })

    // Twitter API responses
    this.setResponse('twitter', 'search', {
      data: [
        {
          id: '1234567890',
          text: 'This is a mock tweet about trending topics',
          public_metrics: {
            like_count: 1500,
            reply_count: 25,
            retweet_count: 300
          }
        }
      ]
    })

    // ElevenLabs API responses
    this.setResponse('elevenlabs', 'generate', {
      audio_url: 'https://api.elevenlabs.io/v1/audio/mock-audio-id.mp3',
      status: 'completed'
    })

    // HeyGen API responses - polling sequence
    this.setResponseSequence('heygen', 'status', [
      { status: 'processing', progress: 25 },
      { status: 'processing', progress: 50 },
      { status: 'processing', progress: 75 },
      { 
        status: 'completed', 
        progress: 100,
        video_url: 'https://heygen.com/videos/mock-video-id.mp4'
      }
    ])

    // Exa search responses
    this.setResponse('exa', 'search', {
      results: [
        {
          title: 'Breaking: Major Tech Announcement',
          url: 'https://techcrunch.com/mock-article',
          text: 'A major technology company announced significant changes...',
          publishedDate: new Date().toISOString()
        }
      ]
    })
  }

  /**
   * Sets up error scenarios for testing error handling
   */
  setupErrorScenarios(): void {
    // Authentication errors
    this.setError('youtube', 'search', new Error('Authentication failed: Invalid API key'))
    this.setError('twitter', 'search', new Error('Authentication failed: Token expired'))
    
    // Rate limiting errors
    this.setError('elevenlabs', 'generate', new Error('Rate limit exceeded: Try again later'))
    
    // Service unavailable errors
    this.setError('heygen', 'generate', new Error('Service temporarily unavailable'))
    
    // Network timeout errors
    this.setError('exa', 'search', new Error('Request timeout: Network error'))
  }

  private createKey(service: string, endpoint: string): string {
    return `${service.toLowerCase()}:${endpoint.toLowerCase()}`
  }
}

// Export a singleton instance for use across tests
export const mockResponseManager = new MockResponseManager()