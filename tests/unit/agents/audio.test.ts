import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runAudioStage } from '../../../src/agents/audio.js'
import { mockComposioClient } from '../../mocks/MockComposioClient.js'

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

describe('Audio Agent Unit Tests', () => {
  let createToolkitSession: any
  let Agent: any
  let hostedMcpTool: any
  let run: any

  beforeEach(async () => {
    // Import modules dynamically
    const clientModule = await import('../../../src/services/client.js')
    const agentsModule = await import('@openai/agents')
    
    createToolkitSession = clientModule.createToolkitSession
    Agent = agentsModule.Agent
    hostedMcpTool = agentsModule.hostedMcpTool
    run = agentsModule.run
    
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockComposioClient.reset()
    
    // Setup default mock session responses
    vi.mocked(createToolkitSession).mockResolvedValue({
      url: 'ws://mock-session/elevenlabs-session',
      sessionId: 'elevenlabs-session',
      userId: 'test-user-123',
      toolkits: ['elevenlabs']
    })
  })

  describe('ElevenLabs Integration and Configuration', () => {
    it('should create ElevenLabs toolkit session with correct parameters', async () => {
      // Arrange
      const scriptText = 'AI just changed everything and nobody noticed.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-123.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      expect(createToolkitSession).toHaveBeenCalledTimes(1)
      expect(createToolkitSession).toHaveBeenCalledWith(
        'test-user-123',
        ['elevenlabs'],
        process.env.ELEVENLABS_AUTH_CONFIG_ID
      )
    })

    it('should configure agent with correct ElevenLabs settings', async () => {
      // Arrange
      const scriptText = 'Test script for audio generation'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-456.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      expect(Agent).toHaveBeenCalledWith({
        name: 'Voice Director',
        instructions: expect.stringContaining('Voice ID: "EIsgvJT3rwoPvRFG6c4n"'),
        tools: expect.arrayContaining([
          expect.objectContaining({
            serverLabel: 'tool_router',
            serverUrl: 'ws://mock-session/elevenlabs-session'
          })
        ]),
        model: 'gpt-4o'
      })
    })

    it('should include correct model configuration in instructions', async () => {
      // Arrange
      const scriptText = 'Script for model configuration test'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-789.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      const agentCall = vi.mocked(Agent).mock.calls[0][0]
      expect(agentCall.instructions).toContain('Model ID: "eleven_multilingual_v2"')
      expect(agentCall.instructions).toContain('ELEVENLABS_TEXT_TO_SPEECH')
    })

    it('should configure hostedMcpTool with session URL', async () => {
      // Arrange
      const scriptText = 'Test script for tool configuration'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-abc.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      expect(hostedMcpTool).toHaveBeenCalledWith({
        serverLabel: 'tool_router',
        serverUrl: 'ws://mock-session/elevenlabs-session'
      })
    })

    it('should include output format requirements in instructions', async () => {
      // Arrange
      const scriptText = 'Script for output format test'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-def.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      const agentCall = vi.mocked(Agent).mock.calls[0][0]
      expect(agentCall.instructions).toContain('Your Final Output must be **ONLY the raw URL string**')
      expect(agentCall.instructions).toContain('Do NOT use Markdown formatting')
      expect(agentCall.instructions).toContain('Do NOT include conversational text')
    })
  })

  describe('Script Text Processing and API Calls', () => {
    it('should process script text and make correct API call', async () => {
      // Arrange
      const scriptText = 'AI just changed everything and nobody noticed. While you were scrolling, three major companies quietly released tools.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/generated-script.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledTimes(1)
      expect(run).toHaveBeenCalledWith(
        expect.any(Object), // Agent instance
        `Generate audio for this script: \n"${scriptText}"`
      )
      expect(result).toBe('https://api.elevenlabs.io/v1/audio/generated-script.mp3')
    })

    it('should handle short script text', async () => {
      // Arrange
      const scriptText = 'Short script.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/short-script.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledWith(
        expect.any(Object),
        `Generate audio for this script: \n"${scriptText}"`
      )
      expect(result).toBe('https://api.elevenlabs.io/v1/audio/short-script.mp3')
    })

    it('should handle long script text', async () => {
      // Arrange
      const scriptText = 'A'.repeat(500) + ' This is a very long script that tests the system\'s ability to handle extended content.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/long-script.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledWith(
        expect.any(Object),
        `Generate audio for this script: \n"${scriptText}"`
      )
      expect(result).toBe('https://api.elevenlabs.io/v1/audio/long-script.mp3')
    })

    it('should handle script with special characters', async () => {
      // Arrange
      const scriptText = 'AI "revolution" & machine learning—it\'s here! 50% growth in 2024.'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/special-chars.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledWith(
        expect.any(Object),
        `Generate audio for this script: \n"${scriptText}"`
      )
      expect(result).toBe('https://api.elevenlabs.io/v1/audio/special-chars.mp3')
    })

    it('should handle script with Unicode characters', async () => {
      // Arrange
      const scriptText = 'AI révolution 🤖 and künstliche intelligenz are changing everything!'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/unicode-script.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledWith(
        expect.any(Object),
        `Generate audio for this script: \n"${scriptText}"`
      )
      expect(result).toBe('https://api.elevenlabs.io/v1/audio/unicode-script.mp3')
    })

    it('should log script length during processing', async () => {
      // Arrange
      const scriptText = 'Test script for length logging'
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/length-test.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`🎙️ Generating speech for script (${scriptText.length} chars)...`)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('URL Extraction from Audio Generation Responses', () => {
    it('should extract clean URL from agent response', async () => {
      // Arrange
      const scriptText = 'Test script for URL extraction'
      const expectedUrl = 'https://api.elevenlabs.io/v1/audio/clean-url.mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: expectedUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(expectedUrl)
    })

    it('should extract URL from response with extra text', async () => {
      // Arrange
      const scriptText = 'Test script for URL extraction with text'
      const expectedUrl = 'https://api.elevenlabs.io/v1/audio/with-text.mp3'
      const responseWithText = `Here is your generated audio: ${expectedUrl} - The audio has been successfully created.`
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: responseWithText
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(expectedUrl)
    })

    it('should extract URL from markdown formatted response', async () => {
      // Arrange
      const scriptText = 'Test script for markdown URL extraction'
      const expectedUrl = 'https://api.elevenlabs.io/v1/audio/markdown.mp3'
      const markdownResponse = `[Generated Audio](${expectedUrl})`
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: markdownResponse
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(expectedUrl)
    })

    it('should extract first URL when multiple URLs are present', async () => {
      // Arrange
      const scriptText = 'Test script for multiple URLs'
      const firstUrl = 'https://api.elevenlabs.io/v1/audio/first.mp3'
      const secondUrl = 'https://api.elevenlabs.io/v1/audio/second.mp3'
      const responseWithMultipleUrls = `First audio: ${firstUrl} and backup: ${secondUrl}`
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: responseWithMultipleUrls
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(firstUrl)
    })

    it('should handle HTTP URLs (not just HTTPS)', async () => {
      // Arrange
      const scriptText = 'Test script for HTTP URL'
      const httpUrl = 'http://api.elevenlabs.io/v1/audio/http-url.mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: httpUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(httpUrl)
    })

    it('should return raw output when no URL pattern is found', async () => {
      // Arrange
      const scriptText = 'Test script for no URL'
      const rawResponse = 'Audio generation completed successfully but no URL provided'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: rawResponse
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(rawResponse)
    })

    it('should handle URLs with query parameters', async () => {
      // Arrange
      const scriptText = 'Test script for URL with params'
      const urlWithParams = 'https://api.elevenlabs.io/v1/audio/params.mp3?token=abc123&format=mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: urlWithParams
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(urlWithParams)
    })

    it('should handle URLs with fragments', async () => {
      // Arrange
      const scriptText = 'Test script for URL with fragment'
      const urlWithFragment = 'https://api.elevenlabs.io/v1/audio/fragment.mp3#section1'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: urlWithFragment
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(urlWithFragment)
    })
  })

  describe('Error Handling for Authentication Failures', () => {
    it('should detect and throw error for authentication URL', async () => {
      // Arrange
      const scriptText = 'Test script for auth failure'
      const authUrl = 'https://connect.composio.dev/auth/elevenlabs?token=abc123'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: authUrl
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      await expect(runAudioStage(scriptText)).rejects.toThrow(
        'elevenlabs authentication pending. Please authenticate using the link above and restart.'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\n🚨 AUTHENTICATION REQUIRED: The agent returned an auth link instead of audio.'
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `👉 Please click here to authenticate ElevenLabs: ${authUrl}\n`
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle authentication URL with extra text', async () => {
      // Arrange
      const scriptText = 'Test script for auth with text'
      const authUrl = 'https://connect.composio.dev/auth/elevenlabs?session=xyz789'
      const responseWithAuth = `Authentication required: ${authUrl} - Please complete authentication.`
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: responseWithAuth
      })

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      await expect(runAudioStage(scriptText)).rejects.toThrow(
        'elevenlabs authentication pending. Please authenticate using the link above and restart.'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `👉 Please click here to authenticate ElevenLabs: ${authUrl}\n`
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle session creation failures', async () => {
      // Arrange
      const scriptText = 'Test script for session failure'
      
      vi.mocked(createToolkitSession).mockRejectedValueOnce(
        new Error('Failed to create ElevenLabs session')
      )

      // Act & Assert
      await expect(runAudioStage(scriptText)).rejects.toThrow(
        'Failed to create ElevenLabs session'
      )
    })

    it('should handle agent execution failures', async () => {
      // Arrange
      const scriptText = 'Test script for agent failure'
      
      vi.mocked(run).mockRejectedValueOnce(
        new Error('ElevenLabs API rate limit exceeded')
      )

      // Act & Assert
      await expect(runAudioStage(scriptText)).rejects.toThrow(
        'ElevenLabs API rate limit exceeded'
      )
    })

    it('should handle null or undefined agent response', async () => {
      // Arrange
      const scriptText = 'Test script for null response'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: null
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert - Should return empty string when no URL found
      expect(result).toBe('')
    })

    it('should handle undefined finalOutput', async () => {
      // Arrange
      const scriptText = 'Test script for undefined response'
      
      vi.mocked(run).mockResolvedValueOnce({
        // Missing finalOutput property
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert - Should return empty string when no URL found
      expect(result).toBe('')
    })

    it('should not throw error for non-auth URLs containing "connect"', async () => {
      // Arrange
      const scriptText = 'Test script for non-auth connect URL'
      const nonAuthUrl = 'https://api.elevenlabs.io/v1/connect/audio/test.mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: nonAuthUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert - Should return the URL normally
      expect(result).toBe(nonAuthUrl)
    })
  })

  describe('Audio Generation Workflow Completion', () => {
    it('should complete full workflow successfully', async () => {
      // Arrange
      const scriptText = 'AI just changed everything and nobody noticed. While you were scrolling, three major companies quietly released tools that will reshape how we work. Hit follow for more!'
      const expectedUrl = 'https://api.elevenlabs.io/v1/audio/workflow-complete.mp3'
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: expectedUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(createToolkitSession).toHaveBeenCalledWith(
        'test-user-123',
        ['elevenlabs'],
        process.env.ELEVENLABS_AUTH_CONFIG_ID
      )
      expect(Agent).toHaveBeenCalledTimes(1)
      expect(run).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedUrl)
      
      // Verify console logging
      expect(consoleSpy).toHaveBeenCalledWith('\n--- STAGE 3: AUDIO GENERATION ---')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎙️ Generating speech for script')
      )

      consoleSpy.mockRestore()
    })

    it('should handle empty script text', async () => {
      // Arrange
      const scriptText = ''
      const expectedUrl = 'https://api.elevenlabs.io/v1/audio/empty-script.mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: expectedUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(run).toHaveBeenCalledWith(
        expect.any(Object),
        'Generate audio for this script: \n""'
      )
      expect(result).toBe(expectedUrl)
    })

    it('should maintain workflow state through all steps', async () => {
      // Arrange
      const scriptText = 'Workflow state test script'
      const sessionUrl = 'ws://mock-session/state-test'
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/state-test.mp3'
      
      vi.mocked(createToolkitSession).mockResolvedValueOnce({
        url: sessionUrl,
        sessionId: 'state-test-session',
        userId: 'test-user-123',
        toolkits: ['elevenlabs']
      })
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: audioUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert - Verify session URL is passed to agent tools
      expect(hostedMcpTool).toHaveBeenCalledWith({
        serverLabel: 'tool_router',
        serverUrl: sessionUrl
      })
      
      expect(result).toBe(audioUrl)
    })

    it('should handle workflow with environment variable configuration', async () => {
      // Arrange
      const scriptText = 'Environment config test'
      const originalEnv = process.env.ELEVENLABS_AUTH_CONFIG_ID
      process.env.ELEVENLABS_AUTH_CONFIG_ID = 'test-auth-config-123'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/env-test.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(createToolkitSession).toHaveBeenCalledWith(
        'test-user-123',
        ['elevenlabs'],
        'test-auth-config-123'
      )
      
      // Restore environment
      process.env.ELEVENLABS_AUTH_CONFIG_ID = originalEnv
    })

    it('should handle workflow without environment variable configuration', async () => {
      // Arrange
      const scriptText = 'No env config test'
      const originalEnv = process.env.ELEVENLABS_AUTH_CONFIG_ID
      delete process.env.ELEVENLABS_AUTH_CONFIG_ID
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/no-env.mp3'
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(createToolkitSession).toHaveBeenCalledWith(
        'test-user-123',
        ['elevenlabs'],
        undefined
      )
      
      // Restore environment
      process.env.ELEVENLABS_AUTH_CONFIG_ID = originalEnv
    })

    it('should verify agent model configuration', async () => {
      // Arrange
      const scriptText = 'Model verification test'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: 'https://api.elevenlabs.io/v1/audio/model-test.mp3'
      })

      // Act
      await runAudioStage(scriptText)

      // Assert
      const agentConfig = vi.mocked(Agent).mock.calls[0][0]
      expect(agentConfig.model).toBe('gpt-4o')
      expect(agentConfig.name).toBe('Voice Director')
    })
  })

  describe('Edge Cases and Robustness', () => {
    it('should handle very long URLs', async () => {
      // Arrange
      const scriptText = 'Long URL test'
      const longUrl = 'https://api.elevenlabs.io/v1/audio/' + 'a'.repeat(200) + '.mp3?param=' + 'b'.repeat(100)
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: longUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(longUrl)
    })

    it('should handle URLs with special characters in path', async () => {
      // Arrange
      const scriptText = 'Special chars URL test'
      const specialUrl = 'https://api.elevenlabs.io/v1/audio/file%20with%20spaces.mp3'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: specialUrl
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe(specialUrl)
    })

    it('should handle malformed URLs gracefully', async () => {
      // Arrange
      const scriptText = 'Malformed URL test'
      const malformedResponse = 'Generated audio at: htp://invalid-url'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: malformedResponse
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert - Should return raw output when no valid URL found
      expect(result).toBe(malformedResponse)
    })

    it('should handle response with only whitespace', async () => {
      // Arrange
      const scriptText = 'Whitespace response test'
      
      vi.mocked(run).mockResolvedValueOnce({
        finalOutput: '   \n\t   \n   '
      })

      // Act
      const result = await runAudioStage(scriptText)

      // Assert
      expect(result).toBe('   \n\t   \n   ')
    })

    it('should handle concurrent audio generation requests', async () => {
      // Arrange
      const scriptText1 = 'Concurrent test 1'
      const scriptText2 = 'Concurrent test 2'
      
      vi.mocked(run)
        .mockResolvedValueOnce({
          finalOutput: 'https://api.elevenlabs.io/v1/audio/concurrent-1.mp3'
        })
        .mockResolvedValueOnce({
          finalOutput: 'https://api.elevenlabs.io/v1/audio/concurrent-2.mp3'
        })

      // Act
      const [result1, result2] = await Promise.all([
        runAudioStage(scriptText1),
        runAudioStage(scriptText2)
      ])

      // Assert
      expect(result1).toBe('https://api.elevenlabs.io/v1/audio/concurrent-1.mp3')
      expect(result2).toBe('https://api.elevenlabs.io/v1/audio/concurrent-2.mp3')
      expect(createToolkitSession).toHaveBeenCalledTimes(2)
    })
  })
})