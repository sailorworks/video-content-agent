import type { VideoReference, ResearchData, AgentState } from '../../src/state/state.js'

/**
 * TestFixtureFactory provides factory functions for generating realistic
 * test data that matches the expected schemas and business logic.
 * 
 * Requirements: 6.1 - Test fixture generation for consistent test data
 */
export class TestFixtureFactory {
  
  /**
   * Creates a realistic VideoReference with optional overrides
   */
  static createVideoReference(overrides: Partial<VideoReference> = {}): VideoReference {
    const defaults: VideoReference = {
      title: 'How AI Will Change Everything in 2024',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      viewCount: '1234567'
    }
    
    return { ...defaults, ...overrides }
  }

  /**
   * Creates multiple VideoReference objects for testing collections
   */
  static createVideoReferences(count: number = 3, baseOverrides: Partial<VideoReference> = {}): VideoReference[] {
    return Array.from({ length: count }, (_, index) => 
      this.createVideoReference({
        ...baseOverrides,
        title: `${baseOverrides.title || 'Mock Video'} #${index + 1}`,
        videoId: `mock-video-${index + 1}`,
        url: `https://youtube.com/watch?v=mock-video-${index + 1}`,
        viewCount: String(Math.floor(Math.random() * 10000000) + 100000)
      })
    )
  }

  /**
   * Creates realistic ResearchData with optional overrides
   */
  static createResearchData(overrides: Partial<ResearchData> = {}): ResearchData {
    const defaults: ResearchData = {
      videos: this.createVideoReferences(3),
      rawTranscripts: 'Mock transcript data from video analysis. This contains key talking points and pacing information.',
      trends: 'Recent trends show increased interest in AI automation, with major companies announcing new partnerships. Tech stocks are up 15% this quarter.',
      twitterInsights: [
        {
          text: 'Just saw the latest AI announcement and my mind is blown! This changes everything 🤯',
          url: 'https://twitter.com/user/status/1234567890',
          likes: 1500,
          comments: 89,
          views: 25000
        },
        {
          text: 'The future of work is here. Companies need to adapt or get left behind.',
          url: 'https://twitter.com/user/status/1234567891',
          likes: 2300,
          comments: 156,
          views: 45000
        }
      ]
    }
    
    return { ...defaults, ...overrides }
  }

  /**
   * Creates a complete AgentState with optional overrides
   */
  static createAgentState(overrides: Partial<AgentState> = {}): AgentState {
    const defaults: AgentState = {
      topic: 'AI Revolution in 2024',
      researchData: this.createResearchData(),
      script: 'AI just changed everything and nobody noticed. While you were scrolling, three major companies quietly released tools that will reshape how we work. Google announced AI agents that can book meetings, Microsoft launched copilots for every app, and OpenAI dropped GPT-5 with reasoning capabilities. This isn\'t just another tech update. These tools can now handle complex tasks that required human judgment just months ago. Hit follow for more!',
      feedback: undefined,
      audioUrl: undefined
    }
    
    return { ...defaults, ...overrides }
  }

  /**
   * Creates AgentState for different workflow stages
   */
  static createAgentStateForStage(stage: 'research' | 'scripting' | 'audio' | 'video', overrides: Partial<AgentState> = {}): AgentState {
    const baseState = this.createAgentState(overrides)
    
    switch (stage) {
      case 'research':
        return {
          ...baseState,
          researchData: undefined,
          script: undefined,
          audioUrl: undefined
        }
      
      case 'scripting':
        return {
          ...baseState,
          script: undefined,
          audioUrl: undefined
        }
      
      case 'audio':
        return {
          ...baseState,
          audioUrl: undefined
        }
      
      case 'video':
        return {
          ...baseState,
          audioUrl: 'https://api.elevenlabs.io/v1/audio/mock-audio-123.mp3'
        }
      
      default:
        return baseState
    }
  }

  /**
   * Creates mock API responses for different services
   */
  static createMockApiResponse(service: string, endpoint: string, overrides: any = {}): any {
    const responses: Record<string, Record<string, any>> = {
      youtube: {
        search: {
          items: [
            {
              id: { videoId: 'mock-yt-1' },
              snippet: {
                title: 'Viral AI Short That Got 10M Views',
                description: 'This AI breakthrough shocked everyone',
                publishedAt: new Date().toISOString()
              },
              statistics: {
                viewCount: '10000000',
                likeCount: '500000',
                commentCount: '25000'
              }
            }
          ],
          pageInfo: { totalResults: 1000, resultsPerPage: 50 }
        }
      },
      
      twitter: {
        search: {
          data: [
            {
              id: '1234567890123456789',
              text: 'This AI development is absolutely game-changing for the industry',
              author_id: '987654321',
              created_at: new Date().toISOString(),
              public_metrics: {
                retweet_count: 1200,
                like_count: 5600,
                reply_count: 340,
                quote_count: 89
              }
            }
          ],
          meta: { result_count: 100 }
        }
      },
      
      elevenlabs: {
        generate: {
          audio_url: 'https://api.elevenlabs.io/v1/audio/generated-123456.mp3',
          status: 'completed',
          character_count: 85,
          duration_seconds: 30.5
        }
      },
      
      heygen: {
        generate: {
          video_id: 'heygen-video-123456',
          status: 'processing',
          estimated_time: 120
        },
        status: {
          video_id: 'heygen-video-123456',
          status: 'completed',
          video_url: 'https://heygen.com/share/video-123456.mp4',
          duration: 32,
          thumbnail_url: 'https://heygen.com/thumbnails/video-123456.jpg'
        }
      },
      
      exa: {
        search: {
          results: [
            {
              id: 'exa-result-1',
              title: 'Major AI Breakthrough Announced by Tech Giant',
              url: 'https://techcrunch.com/ai-breakthrough-2024',
              text: 'In a surprising announcement today, a major technology company revealed significant advances in artificial intelligence capabilities...',
              highlights: ['AI breakthrough', 'technology company', 'significant advances'],
              publishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
              score: 0.95
            }
          ],
          autopromptString: 'AI breakthrough technology announcement',
          requestId: 'exa-req-123456'
        }
      }
    }
    
    const serviceResponses = responses[service.toLowerCase()]
    if (!serviceResponses) {
      throw new Error(`No mock responses defined for service: ${service}`)
    }
    
    const endpointResponse = serviceResponses[endpoint.toLowerCase()]
    if (!endpointResponse) {
      throw new Error(`No mock response defined for ${service}:${endpoint}`)
    }
    
    return { ...endpointResponse, ...overrides }
  }

  /**
   * Creates realistic test topics for research testing
   */
  static createTestTopics(): string[] {
    return [
      'AI Revolution in 2024',
      'Climate Change Solutions',
      'Space Exploration Updates',
      'Cryptocurrency Market Trends',
      'Remote Work Technology',
      'Electric Vehicle Adoption',
      'Quantum Computing Breakthroughs',
      'Social Media Algorithm Changes',
      'Renewable Energy Innovations',
      'Biotechnology Advances'
    ]
  }

  /**
   * Creates edge case data for testing robustness
   */
  static createEdgeCaseData(): {
    emptyResearchData: ResearchData
    unicodeTopics: string[]
    malformedApiResponses: any[]
    largeDataSets: any
  } {
    return {
      emptyResearchData: {
        videos: [],
        rawTranscripts: '',
        trends: '',
        twitterInsights: []
      },
      
      unicodeTopics: [
        '人工智能革命', // Chinese
        'Révolution de l\'IA', // French with apostrophe
        'AI-Revolution 🤖', // With emoji
        'Künstliche Intelligenz', // German with umlaut
        'الذكاء الاصطناعي', // Arabic
        'ИИ революция', // Cyrillic
        'AI\nMultiline\nTopic', // With newlines
        'AI "Quoted" Topic', // With quotes
        'AI & Machine Learning', // With ampersand
        'AI/ML Revolution' // With slash
      ],
      
      malformedApiResponses: [
        null,
        undefined,
        '',
        '{"incomplete": json',
        { missingRequiredFields: true },
        { items: null },
        { data: 'not-an-array' },
        { error: 'Something went wrong' }
      ],
      
      largeDataSets: {
        manyVideos: this.createVideoReferences(100),
        longTranscript: 'A'.repeat(10000),
        manyTweets: Array.from({ length: 1000 }, (_, i) => ({
          text: `Tweet number ${i} with some content`,
          likes: Math.floor(Math.random() * 10000),
          comments: Math.floor(Math.random() * 1000)
        }))
      }
    }
  }

  /**
   * Creates test data with specific characteristics for property-based testing
   */
  static createPropertyTestData() {
    return {
      // Valid input ranges for generators
      validTopicLengths: { min: 1, max: 200 },
      validViewCounts: { min: 0, max: 1000000000 },
      validScriptLengths: { min: 50, max: 150 }, // Words for 30-second scripts
      
      // Character sets for Unicode testing
      unicodeRanges: {
        basic: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        extended: 'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        emoji: '😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾'
      }
    }
  }
}

// Export convenience functions for common use cases
export const createVideoReference = TestFixtureFactory.createVideoReference
export const createVideoReferences = TestFixtureFactory.createVideoReferences
export const createResearchData = TestFixtureFactory.createResearchData
export const createAgentState = TestFixtureFactory.createAgentState
export const createAgentStateForStage = TestFixtureFactory.createAgentStateForStage
export const createMockApiResponse = TestFixtureFactory.createMockApiResponse