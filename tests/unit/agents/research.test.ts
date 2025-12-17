import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runResearchStage } from '../../../src/agents/research.js'
import { mockComposioClient } from '../../mocks/MockComposioClient.js'
import { TestFixtureFactory } from '../../fixtures/TestFixtureFactory.js'
import type { ResearchData, VideoReference } from '../../../src/state/state.js'

// Mock the client module
vi.mock('../../../src/services/client.js', () => ({
  createToolkitSession: vi.fn(),
  COMPOSIO_USER_ID: 'test-user-123'
}))

// Mock the OpenAI agents module
vi.mock('@openai/agents', () => ({
  Agent: vi.fn(function(config) {
    this.name = config.name
    this.instructions = config.instructions
    this.tools = config.tools
    this.model = config.model
  }),
  hostedMcpTool: vi.fn().mockImplementation((config) => ({
    serverLabel: config.serverLabel,
    serverUrl: config.serverUrl
  })),
  run: vi.fn()
}))

describe('Research Agent Unit Tests', () => {
  let createToolkitSession: any
  let Agent: any
  let run: any

  beforeEach(async () => {
    // Import modules dynamically
    const clientModule = await import('../../../src/services/client.js')
    const agentsModule = await import('@openai/agents')
    
    createToolkitSession = clientModule.createToolkitSession
    Agent = agentsModule.Agent
    run = agentsModule.run
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockComposioClient.reset()
    
    // Setup default mock session responses
    vi.mocked(createToolkitSession).mockResolvedValue({
      url: 'ws://mock-session/test-session',
      sessionId: 'test-session',
      userId: 'test-user-123',
      toolkits: ['youtube']
    })
  })

  describe('Topic Processing and API Call Orchestration', () => {
    it('should process a valid topic and orchestrate all API calls', async () => {
      // Arrange
      const topic = 'AI Revolution 2024'
      
      // Mock successful agent responses
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify([
            TestFixtureFactory.createVideoReference({ title: 'AI Revolution Video 1' }),
            TestFixtureFactory.createVideoReference({ title: 'AI Revolution Video 2' })
          ])
        })
        .mockResolvedValueOnce({
          finalOutput: 'Recent AI trends show significant growth in automation and machine learning adoption.'
        })
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify([
            {
              text: 'AI is changing everything! This is huge 🚀',
              url: 'https://twitter.com/user/status/123',
              likes: 5000,
              comments: 200,
              views: 50000
            }
          ])
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result).toBeDefined()
      expect(result.videos).toHaveLength(2)
      expect(result.trends).toContain('AI trends')
      expect(result.twitterInsights).toHaveLength(1)
      expect(result.rawTranscripts).toContain('Transcription disabled')
      
      // Verify all three toolkit sessions were created
      expect(createToolkitSession).toHaveBeenCalledTimes(3)
      expect(createToolkitSession).toHaveBeenCalledWith('test-user-123', ['youtube'], process.env.YOUTUBE_AUTH_CONFIG_ID)
      expect(createToolkitSession).toHaveBeenCalledWith('test-user-123', ['exa'], process.env.EXA_AUTH_CONFIG_ID)
      expect(createToolkitSession).toHaveBeenCalledWith('test-user-123', ['twitter'], process.env.TWITTER_AUTH_CONFIG_ID)
      
      // Verify all three agents were run
      expect(run).toHaveBeenCalledTimes(3)
    })

    it('should handle topic with special characters', async () => {
      // Arrange
      const topic = 'AI & Machine Learning "Revolution" 🤖'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'No trends found.' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result).toBeDefined()
      expect(result.videos).toEqual([])
      expect(result.twitterInsights).toEqual([])
      
      // Verify agents were created with the special character topic
      const agentCalls = vi.mocked(Agent).mock.calls
      expect(agentCalls[0][0].instructions).toContain(topic)
      expect(agentCalls[2][0].instructions).toContain(topic)
    })

    it('should handle empty topic gracefully', async () => {
      // Arrange
      const topic = ''
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'No trends available.' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result).toBeDefined()
      expect(result.videos).toEqual([])
      expect(result.twitterInsights).toEqual([])
    })
  })

  describe('YouTube Search Integration and Response Parsing', () => {
    it('should parse valid YouTube JSON response correctly', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockVideos = [
        TestFixtureFactory.createVideoReference({ title: 'Video 1', videoId: 'abc123' }),
        TestFixtureFactory.createVideoReference({ title: 'Video 2', videoId: 'def456' })
      ]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify(mockVideos)
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toHaveLength(2)
      expect(result.videos[0]).toEqual(mockVideos[0])
      expect(result.videos[1]).toEqual(mockVideos[1])
    })

    it('should handle YouTube JSON with markdown formatting', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockVideos = [TestFixtureFactory.createVideoReference()]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: `\`\`\`json\n${JSON.stringify(mockVideos)}\n\`\`\``
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toHaveLength(1)
      expect(result.videos[0]).toEqual(mockVideos[0])
    })

    it('should use fallback parsing when primary JSON parsing fails', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockVideos = [TestFixtureFactory.createVideoReference()]
      const malformedResponse = `Some text before ${JSON.stringify(mockVideos)} some text after`
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: malformedResponse
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toHaveLength(1)
      expect(result.videos).toEqual(mockVideos)
    })

    it('should handle completely invalid YouTube response', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: 'This is not JSON at all'
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual([])
    })

    it('should handle null or undefined YouTube response', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: null
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual([])
    })
  })

  describe('Twitter Integration with Engagement Filtering', () => {
    it('should parse valid Twitter JSON response correctly', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockTweets = [
        {
          text: 'High engagement tweet about AI',
          url: 'https://twitter.com/user/status/123',
          likes: 5000,
          comments: 200,
          views: 50000
        },
        {
          text: 'Another viral tweet',
          url: 'https://twitter.com/user/status/456',
          likes: 3000,
          comments: 150,
          views: 30000
        }
      ]
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify(mockTweets)
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.twitterInsights).toHaveLength(2)
      expect(result.twitterInsights[0]).toEqual(mockTweets[0])
      expect(result.twitterInsights[1]).toEqual(mockTweets[1])
    })

    it('should handle Twitter JSON with markdown formatting', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockTweets = [
        {
          text: 'Tweet with high engagement',
          url: 'https://twitter.com/user/status/789',
          likes: 2000,
          comments: 100,
          views: 25000
        }
      ]
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({
          finalOutput: `\`\`\`json\n${JSON.stringify(mockTweets)}\n\`\`\``
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.twitterInsights).toHaveLength(1)
      expect(result.twitterInsights[0]).toEqual(mockTweets[0])
    })

    it('should use fallback parsing for malformed Twitter response', async () => {
      // Arrange
      const topic = 'Test Topic'
      const mockTweets = [
        {
          text: 'Recovered tweet',
          url: 'https://twitter.com/user/status/999',
          likes: 1500,
          comments: 75,
          views: 20000
        }
      ]
      const malformedResponse = `Error: Invalid JSON ${JSON.stringify(mockTweets)} end of response`
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({
          finalOutput: malformedResponse
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.twitterInsights).toHaveLength(1)
      expect(result.twitterInsights).toEqual(mockTweets)
    })

    it('should handle completely invalid Twitter response', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({
          finalOutput: 'Not JSON at all - just text'
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.twitterInsights).toEqual([])
    })

    it('should verify Twitter agent instructions include engagement filtering', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      await runResearchStage(topic)

      // Assert
      const twitterAgentCall = vi.mocked(Agent).mock.calls[2][0]
      expect(twitterAgentCall.instructions).toContain('1000+ likes')
      expect(twitterAgentCall.instructions).toContain('10+ comments')
      expect(twitterAgentCall.instructions).toContain('High views/engagement')
    })
  })

  describe('Exa Search Integration and Trend Analysis', () => {
    it('should handle Exa trends response correctly', async () => {
      // Arrange
      const topic = 'AI Technology'
      const trendsResponse = 'Recent AI developments show significant progress in natural language processing and computer vision. Major tech companies are investing heavily in AI research.'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({
          finalOutput: trendsResponse
        })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.trends).toBe(trendsResponse)
    })

    it('should handle null Exa response', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({
          finalOutput: null
        })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.trends).toBe('No trends found.')
    })

    it('should verify Exa agent instructions include date filtering', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      await runResearchStage(topic)

      // Assert
      const exaAgentCall = vi.mocked(Agent).mock.calls[1][0]
      expect(exaAgentCall.instructions).toContain('startPublishedDate')
      expect(exaAgentCall.instructions).toContain('"type": "neural"')
      expect(exaAgentCall.instructions).toContain('"category": "news"')
    })

    it('should include topic in Exa search query', async () => {
      // Arrange
      const topic = 'Quantum Computing'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Quantum trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      await runResearchStage(topic)

      // Assert
      const exaAgentCall = vi.mocked(Agent).mock.calls[1][0]
      expect(exaAgentCall.instructions).toContain(`"query": "${topic}"`)
    })
  })

  describe('JSON Parsing with Fallback Mechanisms', () => {
    it('should successfully parse clean JSON responses', async () => {
      // Arrange
      const topic = 'Test Topic'
      const cleanVideos = [TestFixtureFactory.createVideoReference()]
      const cleanTweets = [{ text: 'Clean tweet', likes: 1000 }]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify(cleanVideos)
        })
        .mockResolvedValueOnce({ finalOutput: 'Clean trends' })
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify(cleanTweets)
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual(cleanVideos)
      expect(result.twitterInsights).toEqual(cleanTweets)
    })

    it('should handle JSON wrapped in markdown code blocks', async () => {
      // Arrange
      const topic = 'Test Topic'
      const videos = [TestFixtureFactory.createVideoReference()]
      const tweets = [{ text: 'Markdown tweet', likes: 2000 }]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: `\`\`\`json\n${JSON.stringify(videos)}\n\`\`\``
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends' })
        .mockResolvedValueOnce({
          finalOutput: `\`\`\`json\n${JSON.stringify(tweets)}\n\`\`\``
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual(videos)
      expect(result.twitterInsights).toEqual(tweets)
    })

    it('should use regex fallback when primary parsing fails', async () => {
      // Arrange
      const topic = 'Test Topic'
      const videos = [TestFixtureFactory.createVideoReference()]
      const tweets = [{ text: 'Fallback tweet', likes: 3000 }]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: `Invalid JSON prefix ${JSON.stringify(videos)} invalid suffix`
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends' })
        .mockResolvedValueOnce({
          finalOutput: `Error occurred ${JSON.stringify(tweets)} end`
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual(videos)
      expect(result.twitterInsights).toEqual(tweets)
    })

    it('should return empty arrays when all parsing methods fail', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: 'Completely invalid response with no JSON'
        })
        .mockResolvedValueOnce({ finalOutput: 'Trends' })
        .mockResolvedValueOnce({
          finalOutput: 'Another invalid response'
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual([])
      expect(result.twitterInsights).toEqual([])
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      const topic = 'Test Topic'
      const videos = [TestFixtureFactory.createVideoReference()]
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: JSON.stringify(videos) // Valid JSON
        })
        .mockResolvedValueOnce({ finalOutput: 'Valid trends data' })
        .mockResolvedValueOnce({
          finalOutput: 'Invalid Twitter response' // Invalid JSON
        })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result.videos).toEqual(videos)
      expect(result.trends).toBe('Valid trends data')
      expect(result.twitterInsights).toEqual([])
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle agent execution failures gracefully', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockRejectedValueOnce(new Error('YouTube agent failed'))
        .mockResolvedValueOnce({ finalOutput: 'Trends data' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act & Assert
      await expect(runResearchStage(topic)).rejects.toThrow('YouTube agent failed')
    })

    it('should handle session creation failures', async () => {
      // Arrange
      const topic = 'Test Topic'
      vi.mocked(createToolkitSession).mockRejectedValueOnce(new Error('Session creation failed'))

      // Act & Assert
      await expect(runResearchStage(topic)).rejects.toThrow('Session creation failed')
    })

    it('should handle very long topic strings', async () => {
      // Arrange
      const longTopic = 'A'.repeat(1000)
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: '[]' })
        .mockResolvedValueOnce({ finalOutput: 'Trends for long topic' })
        .mockResolvedValueOnce({ finalOutput: '[]' })

      // Act
      const result = await runResearchStage(longTopic)

      // Assert
      expect(result).toBeDefined()
      expect(result.videos).toEqual([])
      expect(result.twitterInsights).toEqual([])
    })

    it('should maintain consistent data structure even with failures', async () => {
      // Arrange
      const topic = 'Test Topic'
      
      vi.mocked(run)
        .mockResolvedValueOnce({ finalOutput: null })
        .mockResolvedValueOnce({ finalOutput: undefined })
        .mockResolvedValueOnce({ finalOutput: null })

      // Act
      const result = await runResearchStage(topic)

      // Assert
      expect(result).toMatchObject({
        videos: expect.any(Array),
        rawTranscripts: expect.any(String),
        trends: expect.any(String),
        twitterInsights: expect.any(Array)
      })
    })
  })
})