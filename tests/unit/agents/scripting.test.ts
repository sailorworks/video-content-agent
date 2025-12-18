import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runScriptingStage } from '../../../src/agents/scripting.js'
import { TestFixtureFactory } from '../../fixtures/TestFixtureFactory.js'
import type { AgentState } from '../../../src/state/state.js'

// Mock the OpenAI agents module
vi.mock('@openai/agents', () => ({
  Agent: vi.fn(function(this: any, config: any) {
    this.name = config.name
    this.instructions = config.instructions
    this.model = config.model
  }),
  run: vi.fn()
}))

describe('Scripting Agent Unit Tests', () => {
  let Agent: any
  let run: any

  beforeEach(async () => {
    // Import modules dynamically
    const agentsModule = await import('@openai/agents')
    
    Agent = agentsModule.Agent
    run = agentsModule.run
    
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('Script Generation with Research Data Input', () => {
    it('should generate script using complete research data', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      const expectedScript = 'AI just changed everything and nobody noticed. While you were scrolling, three major companies quietly released tools that will reshape how we work. Google announced AI agents that can book meetings, Microsoft launched copilots for every app, and OpenAI dropped GPT-5 with reasoning capabilities. This isn\'t just another tech update. These tools can now handle complex tasks that required human judgment just months ago. Hit follow for more!'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: expectedScript
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe(expectedScript)
      expect(run).toHaveBeenCalledTimes(1)
      
      // Verify agent was created with correct configuration
      expect(Agent).toHaveBeenCalledWith({
        name: 'Viral Scriptwriter',
        instructions: 'You are an expert short-form scriptwriter. You hate fluff. You love specific facts.',
        model: 'gpt-4o'
      })
    })

    it('should include YouTube context in prompt when videos are available', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: TestFixtureFactory.createResearchData({
          videos: [
            TestFixtureFactory.createVideoReference({ 
              title: 'AI Revolution Breaks Internet', 
              viewCount: '5000000' 
            }),
            TestFixtureFactory.createVideoReference({ 
              title: 'Tech Giants Announce Major AI Update', 
              viewCount: '3000000' 
            })
          ]
        })
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('AI Revolution Breaks Internet')
      expect(runCall).toContain('Views: 5000000')
      expect(runCall).toContain('Tech Giants Announce Major AI Update')
      expect(runCall).toContain('Views: 3000000')
    })

    it('should include Twitter context in prompt when insights are available', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: TestFixtureFactory.createResearchData({
          twitterInsights: [
            {
              text: 'This AI breakthrough is absolutely mind-blowing!',
              url: 'https://twitter.com/user1/status/123456789',
              likes: 15000,
              comments: 250,
              views: 50000
            },
            {
              text: 'The future of technology is here and it\'s incredible',
              url: 'https://twitter.com/user2/status/987654321',
              likes: 8500,
              comments: 180,
              views: 32000
            }
          ]
        })
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('This AI breakthrough is absolutely mind-blowing!')
      expect(runCall).toContain('Likes: 15000')
      expect(runCall).toContain('The future of technology is here and it\'s incredible')
      expect(runCall).toContain('Likes: 8500')
    })

    it('should include trends and transcripts in prompt context', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: TestFixtureFactory.createResearchData({
          trends: 'Major AI companies announced breakthrough partnerships worth $50 billion',
          rawTranscripts: 'Pacing reference: Fast-paced delivery with emphasis on numbers and facts'
        })
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Major AI companies announced breakthrough partnerships worth $50 billion')
      expect(runCall).toContain('Pacing reference: Fast-paced delivery with emphasis on numbers and facts')
    })

    it('should handle missing research data gracefully', async () => {
      // Arrange
      const state: AgentState = {
        topic: 'Test Topic',
        researchData: undefined
      }

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Research data is missing!')
    })

    it('should handle empty research data fields', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: {
          videos: [],
          rawTranscripts: '',
          trends: '',
          twitterInsights: []
        }
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script with empty data'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Generated script with empty data')
      
      const runCall = vi.mocked(run).mock.calls[0][1]
      // Empty arrays are truthy, so they don't trigger the fallback messages
      // Instead, they result in empty context sections
      expect(runCall).toContain('[VIRAL HOOKS FROM YOUTUBE]')
      expect(runCall).toContain('[PUBLIC SENTIMENT FROM TWITTER]')
    })
  })

  describe('Content Guidelines and Length Constraints', () => {
    it('should include strict writing rules in prompt', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('STRICTLY NO EMOJIS')
      expect(runCall).toContain('6th-grade reading level')
      expect(runCall).toContain('75-85 words')
      expect(runCall).toContain('Hit follow for more!')
    })

    it('should include banned words list in guidelines', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      const bannedWords = ['game-changer', 'mind-blowing', 'groundbreaking', 'future is here', 'reshaping our lives', 'unleash', 'unlock', 'imagine']
      
      bannedWords.forEach(word => {
        expect(runCall).toContain(word)
      })
    })

    it('should specify required script structure', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Sentence 1 & 2: A specific Hook')
      expect(runCall).toContain('Sentence 3: The "Bridge"')
      expect(runCall).toContain('Body: Give concrete details')
      expect(runCall).toContain('Final Sentence: EXACTLY "Hit follow for more!"')
    })

    it('should specify formatting requirements', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Generated script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Return ONLY the spoken text')
      expect(runCall).toContain('NO headers, NO labels, NO markdown')
      expect(runCall).toContain('Start directly on the first word')
    })

    it('should clean markdown formatting from output', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: '```text\nThis is a script with markdown formatting\n```'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('This is a script with markdown formatting')
      expect(result).not.toContain('```')
    })

    it('should clean various markdown code block formats', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      const testCases = [
        {
          input: '```markdown\nScript content here\n```',
          expected: 'Script content here'
        },
        {
          input: '```\nPlain script content\n```',
          expected: 'Plain script content'
        },
        {
          input: '```TEXT\nUppercase format\n```',
          expected: 'Uppercase format'
        }
      ]

      for (const testCase of testCases) {
        vi.mocked(run).mockResolvedValueOnce({
          finalOutput: testCase.input
        })

        // Act
        const result = await runScriptingStage(state)

        // Assert
        expect(result).toBe(testCase.expected)
      }
    })
  })

  describe('Feedback Processing and Regeneration Logic', () => {
    it('should handle first-time script generation without feedback', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        feedback: undefined
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'First generation script'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Write a cohesive, viral script based on the Source Material')
      expect(runCall).toContain('Focus on the single most interesting fact')
      expect(runCall).not.toContain('previous script was rejected')
    })

    it('should process feedback for script regeneration', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        feedback: 'The script lacks specific numbers and company names. Make it more factual.'
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Regenerated script with feedback'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Regenerated script with feedback')
      
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('The script lacks specific numbers and company names. Make it more factual.')
      expect(runCall).toContain('previous script was rejected')
      expect(runCall).toContain('Fix the flow specifically based on the feedback')
    })

    it('should include feedback in regeneration task instruction', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        feedback: 'Too many buzzwords, needs more concrete facts'
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Improved script'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Feedback: "Too many buzzwords, needs more concrete facts"')
      expect(runCall).toContain('Ensure the script tells ONE cohesive story')
    })

    it('should handle empty feedback string', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        feedback: ''
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Script with empty feedback'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      // Empty string is falsy, so it doesn't trigger feedback path
      expect(runCall).toContain('Write a cohesive, viral script based on the Source Material')
      expect(runCall).not.toContain('previous script was rejected')
    })

    it('should handle very long feedback strings', async () => {
      // Arrange
      const longFeedback = 'A'.repeat(1000) + ' - needs improvement'
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        feedback: longFeedback
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Script with long feedback'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Script with long feedback')
      
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain(longFeedback)
    })
  })

  describe('Output Format and Structure Requirements', () => {
    it('should return clean script text without formatting', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      const cleanScript = 'AI just changed everything and nobody noticed. While you were scrolling, three major companies quietly released tools that will reshape how we work. Hit follow for more!'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: cleanScript
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe(cleanScript)
      expect(typeof result).toBe('string')
    })

    it('should handle null or undefined agent response', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: null
      })

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Viral Scriptwriter failed to generate a response.')
    })

    it('should handle undefined finalOutput', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: undefined
      })

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Viral Scriptwriter failed to generate a response.')
    })

    it('should trim whitespace from output', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: '   \n\n  Script with whitespace  \n\n   '
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Script with whitespace')
    })

    it('should handle empty string output', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: ''
      })

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Viral Scriptwriter failed to generate a response.')
    })

    it('should preserve line breaks within script content', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      const scriptWithBreaks = 'First sentence.\nSecond sentence.\nThird sentence.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: scriptWithBreaks
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe(scriptWithBreaks)
      expect(result).toContain('\n')
    })
  })

  describe('Banned Word Filtering and Style Compliance', () => {
    it('should include all banned words in style guidelines', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Compliant script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      const bannedWords = [
        'game-changer',
        'mind-blowing', 
        'groundbreaking',
        'future is here',
        'reshaping our lives',
        'unleash',
        'unlock',
        'imagine'
      ]
      
      bannedWords.forEach(word => {
        expect(runCall).toContain(word)
      })
    })

    it('should enforce cohesion requirements', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Cohesive script content'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('Pick ONE single news item/trend')
      expect(runCall).toContain('tell that specific story')
      expect(runCall).toContain('Do not combine unrelated sentences')
    })

    it('should specify tone and reading level requirements', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Appropriate tone script'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('6th-grade reading level')
      expect(runCall).toContain('Conversational but factual')
    })

    it('should enforce length constraints', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Length-appropriate script'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('30 seconds spoken aloud')
      expect(runCall).toContain('75-85 words')
    })

    it('should require specific ending phrase', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Script ending with Hit follow for more!'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('EXACTLY "Hit follow for more!"')
    })

    it('should enforce no emoji policy', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Plain text script without emojis'
      })

      // Act
      await runScriptingStage(state)

      // Assert
      const runCall = vi.mocked(run).mock.calls[0][1]
      expect(runCall).toContain('STRICTLY NO EMOJIS')
      expect(runCall).toContain('Plain text only')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle agent execution failure', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockRejectedValueOnce(new Error('Agent execution failed'))

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Agent execution failed')
    })

    it('should handle malformed agent response', async () => {
      // Arrange
      const state = TestFixtureFactory.createAgentStateForStage('scripting')
      
      vi.mocked(run).mockResolvedValueOnce({
        // Missing finalOutput property
        someOtherProperty: 'value'
      })

      // Act & Assert
      await expect(runScriptingStage(state)).rejects.toThrow('Viral Scriptwriter failed to generate a response.')
    })

    it('should handle very large research data', async () => {
      // Arrange
      const largeData = TestFixtureFactory.createEdgeCaseData().largeDataSets
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: {
          videos: largeData.manyVideos.slice(0, 10), // Should only use first 5
          rawTranscripts: largeData.longTranscript,
          trends: 'Large trends data',
          twitterInsights: largeData.manyTweets.slice(0, 10) // Should only use first 5
        }
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Script with large data'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Script with large data')
      
      // Verify only first 5 items are used in context
      const runCall = vi.mocked(run).mock.calls[0][1]
      const videoMatches = runCall.match(/- Viral Hook\/Title:/g)
      const twitterMatches = runCall.match(/- Public Sentiment:/g)
      
      expect(videoMatches?.length).toBeLessThanOrEqual(5)
      expect(twitterMatches?.length).toBeLessThanOrEqual(5)
    })

    it('should handle Unicode characters in research data', async () => {
      // Arrange
      const unicodeData = TestFixtureFactory.createEdgeCaseData().unicodeTopics
      const state = TestFixtureFactory.createAgentStateForStage('scripting', {
        researchData: TestFixtureFactory.createResearchData({
          trends: unicodeData.join(' '),
          videos: [
            TestFixtureFactory.createVideoReference({ title: unicodeData[0] || 'Default Title' })
          ]
        })
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'Script with Unicode content'
      })

      // Act
      const result = await runScriptingStage(state)

      // Assert
      expect(result).toBe('Script with Unicode content')
    })
  })
})