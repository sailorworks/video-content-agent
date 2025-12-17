import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { runVideoGenerationStage } from '../../../src/agents/video_generation.js'
import { mockComposioClient } from '../../mocks/MockComposioClient.js'
import * as fs from 'fs'
import * as https from 'https'
import * as os from 'os'
import * as path from 'path'

// Mock the client module
vi.mock('../../../src/services/client.js', () => ({
  composio: {
    tools: {
      proxyExecute: vi.fn()
    }
  },
  getHeyGenConnectionId: vi.fn()
}))

// Mock Node.js modules
vi.mock('fs')
vi.mock('https')
vi.mock('os')
vi.mock('path')

describe('Video Generation Agent Unit Tests', () => {
  let composio: any
  let getHeyGenConnectionId: any
  let mockWriteStream: any
  let mockHttpsGet: any
  let mockConsoleLog: any

  beforeEach(async () => {
    // Import modules dynamically
    const clientModule = await import('../../../src/services/client.js')
    
    composio = clientModule.composio
    getHeyGenConnectionId = clientModule.getHeyGenConnectionId
    
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockComposioClient.reset()
    
    // Setup mock file system
    mockWriteStream = {
      close: vi.fn(),
      on: vi.fn()
    }
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any)
    vi.mocked(fs.unlink).mockImplementation((path, callback) => callback && callback(null))
    
    // Setup mock HTTPS
    mockHttpsGet = vi.fn()
    vi.mocked(https.get).mockImplementation(mockHttpsGet)
    
    // Setup mock OS and path
    vi.mocked(os.homedir).mockReturnValue('/mock/home')
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
    
    // Setup console logging mock
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    
    // Setup default mock responses
    vi.mocked(getHeyGenConnectionId).mockResolvedValue('mock-heygen-connection-123')
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
  })

  describe('HeyGen Integration and Payload Construction', () => {
    it('should get HeyGen connection ID with correct parameters', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/test-audio.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'test-video-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/test-video.mp4'
            }
          }
        })

      // Mock successful download
      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(getHeyGenConnectionId).toHaveBeenCalledTimes(1)
      expect(getHeyGenConnectionId).toHaveBeenCalledWith('HEYGEN')
    })

    it('should construct correct payload for video generation', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/payload-test.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'payload-test-456' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/payload-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(composio.tools.proxyExecute).toHaveBeenCalledWith({
        connectedAccountId: 'mock-heygen-connection-123',
        method: 'POST',
        endpoint: '/v2/video/generate',
        body: {
          test: false,
          dimension: { width: 720, height: 1280 },
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: '109cdee34a164003b0e847ffce93828e',
                avatar_style: 'normal'
              },
              voice: {
                type: 'audio',
                audio_url: audioUrl
              },
              background: {
                type: 'color',
                value: '#FFFFFF'
              }
            }
          ]
        }
      })
    })

    it('should use correct avatar configuration', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/avatar-test.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'avatar-test-789' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/avatar-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      const generateCall = vi.mocked(composio.tools.proxyExecute).mock.calls[0][0]
      expect(generateCall.body.video_inputs[0].character).toEqual({
        type: 'avatar',
        avatar_id: '109cdee34a164003b0e847ffce93828e',
        avatar_style: 'normal'
      })
    })

    it('should configure video dimensions correctly', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/dimensions-test.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'dimensions-test-abc' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/dimensions-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      const generateCall = vi.mocked(composio.tools.proxyExecute).mock.calls[0][0]
      expect(generateCall.body.dimension).toEqual({
        width: 720,
        height: 1280
      })
    })

    it('should set test mode to false for production generation', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/production-test.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'production-test-def' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/production-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      const generateCall = vi.mocked(composio.tools.proxyExecute).mock.calls[0][0]
      expect(generateCall.body.test).toBe(false)
    })

    it('should configure background color correctly', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/background-test.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'background-test-ghi' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/background-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      const generateCall = vi.mocked(composio.tools.proxyExecute).mock.calls[0][0]
      expect(generateCall.body.video_inputs[0].background).toEqual({
        type: 'color',
        value: '#FFFFFF'
      })
    })
  })

  describe('Polling Mechanism and State Transitions', () => {
    it('should poll video status until completion', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/polling-test.mp3'
      const videoId = 'polling-test-123'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/polling-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert - Should have made 4 calls: 1 generate + 3 status checks
      expect(composio.tools.proxyExecute).toHaveBeenCalledTimes(4)
      
      // Verify status check calls
      const statusCalls = vi.mocked(composio.tools.proxyExecute).mock.calls.slice(1)
      statusCalls.forEach((call: any) => {
        expect(call[0]).toEqual({
          connectedAccountId: 'mock-heygen-connection-123',
          method: 'GET',
          endpoint: '/v1/video_status.get',
          parameters: [{ name: 'video_id', value: videoId, in: 'query' }]
        })
      })
      
      mockSetTimeout.mockRestore()
    })

    it('should handle different status transitions correctly', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/status-transitions.mp3'
      const videoId = 'status-test-456'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'queued' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'rendering' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/status-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(composio.tools.proxyExecute).toHaveBeenCalledTimes(5)
      
      mockSetTimeout.mockRestore()
    })

    it('should wait correct interval between polling attempts', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/interval-test.mp3'
      const videoId = 'interval-test-789'
      
      // Mock setTimeout to track timing
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        expect(delay).toBe(15000) // 15 seconds
        // Execute callback immediately for test
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/interval-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 15000)
      
      mockSetTimeout.mockRestore()
    })

    it('should handle failed status correctly', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/failed-test.mp3'
      const videoId = 'failed-test-abc'
      const errorData = { message: 'Video generation failed due to invalid audio format' }
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'failed',
              error: errorData
            }
          }
        })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        `Generation Failed: ${JSON.stringify(errorData)}`
      )
      
      mockSetTimeout.mockRestore()
    })

    it('should continue polling for unknown intermediate statuses', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/unknown-status.mp3'
      const videoId = 'unknown-status-def'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'unknown_status' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/unknown-status.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert - Should continue polling despite unknown status
      expect(composio.tools.proxyExecute).toHaveBeenCalledTimes(3)
      
      mockSetTimeout.mockRestore()
    })
  })

  describe('Video Generation Workflow from Start to Completion', () => {
    it('should complete full workflow successfully', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/full-workflow.mp3'
      const videoId = 'full-workflow-123'
      const videoUrl = 'https://heygen.com/share/full-workflow.mp4'
      const expectedPath = '/mock/home/Downloads/heygen_video_123456789.mp4'
      
      // Mock Date.now for consistent filename
      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(123456789)
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      setupMockDownload(expectedPath)

      // Act
      const result = await runVideoGenerationStage(audioUrl)

      // Assert
      expect(result).toEqual({
        videoUrl,
        savedPath: expectedPath
      })
      
      expect(mockConsoleLog).toHaveBeenCalledWith('\n--- STAGE 4: VIDEO GENERATION (HEYGEN) ---')
      expect(mockConsoleLog).toHaveBeenCalledWith('🔌 Using HeyGen Connection ID:', 'mock-heygen-connection-123')
      expect(mockConsoleLog).toHaveBeenCalledWith('🎥 Sending request to HeyGen...')
      expect(mockConsoleLog).toHaveBeenCalledWith(`⏳ Generation started! Video ID: ${videoId}`)
      expect(mockConsoleLog).toHaveBeenCalledWith('\n✅ Video generation complete!')
      
      mockDateNow.mockRestore()
      mockSetTimeout.mockRestore()
    })

    it('should handle workflow with different audio URL formats', async () => {
      // Arrange
      const audioUrls = [
        'https://api.elevenlabs.io/v1/audio/test.mp3',
        'http://audio-service.com/file.wav',
        'https://cdn.example.com/audio/generated-123456.mp3?token=abc'
      ]
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      for (const audioUrl of audioUrls) {
        vi.clearAllMocks()
        
        vi.mocked(composio.tools.proxyExecute)
          .mockResolvedValueOnce({
            data: {
              data: { video_id: 'test-video-123' }
            }
          })
          .mockResolvedValueOnce({
            data: {
              data: {
                status: 'completed',
                video_url: 'https://heygen.com/share/test.mp4'
              }
            }
          })

        setupMockDownload()

        // Act
        await runVideoGenerationStage(audioUrl)

        // Assert
        const generateCall = vi.mocked(composio.tools.proxyExecute).mock.calls[0][0]
        expect(generateCall.body.video_inputs[0].voice.audio_url).toBe(audioUrl)
      }
      
      mockSetTimeout.mockRestore()
    })

    it('should maintain state through all workflow stages', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/state-test.mp3'
      const videoId = 'state-test-456'
      const videoUrl = 'https://heygen.com/share/state-test.mp4'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      setupMockDownload()

      // Act
      const result = await runVideoGenerationStage(audioUrl)

      // Assert - Verify all stages used consistent connection ID
      expect(getHeyGenConnectionId).toHaveBeenCalledWith('HEYGEN')
      
      const allCalls = vi.mocked(composio.tools.proxyExecute).mock.calls
      allCalls.forEach((call: any) => {
        expect(call[0].connectedAccountId).toBe('mock-heygen-connection-123')
      })
      
      expect(result.videoUrl).toBe(videoUrl)
      
      mockSetTimeout.mockRestore()
    })

    it('should log progress throughout workflow', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/progress-test.mp3'
      const videoId = 'progress-test-789'
      const videoUrl = 'https://heygen.com/share/progress-test.mp4'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: videoId }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith('\n--- STAGE 4: VIDEO GENERATION (HEYGEN) ---')
      expect(mockConsoleLog).toHaveBeenCalledWith('🎥 Sending request to HeyGen...')
      expect(mockConsoleLog).toHaveBeenCalledWith(`⏳ Generation started! Video ID: ${videoId}`)
      expect(mockConsoleLog).toHaveBeenCalledWith('\n✅ Video generation complete!')
      
      // Check status logging
      expect(process.stdout.write).toHaveBeenCalledWith('   Status: processing... \r')
      
      mockSetTimeout.mockRestore()
    })

    it('should handle empty or null video ID response', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/no-video-id.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: {} // No video_id field
          }
        })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        'No Video ID received from HeyGen.'
      )
    })
  })

  describe('File Download Functionality and Error Handling', () => {
    it('should download video to correct path', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/download-test.mp3'
      const videoUrl = 'https://heygen.com/share/download-test.mp4'
      const timestamp = 1234567890
      const expectedPath = '/mock/home/Downloads/heygen_video_1234567890.mp4'
      
      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(timestamp)
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'download-test-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      setupMockDownload(expectedPath)

      // Act
      const result = await runVideoGenerationStage(audioUrl)

      // Assert
      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedPath)
      expect(https.get).toHaveBeenCalledWith(videoUrl, expect.any(Function))
      expect(result.savedPath).toBe(expectedPath)
      
      mockDateNow.mockRestore()
    })

    it('should handle download HTTP errors', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/download-error.mp3'
      const videoUrl = 'https://heygen.com/share/download-error.mp4'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'download-error-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      // Mock HTTPS response with error status
      const mockResponse = {
        statusCode: 404,
        pipe: vi.fn()
      }
      
      mockHttpsGet.mockImplementation((url: any, callback: any) => {
        callback(mockResponse)
        return {
          on: vi.fn()
        }
      })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        'Failed to download video. Status: 404'
      )
    })

    it('should handle download network errors', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/network-error.mp3'
      const videoUrl = 'https://heygen.com/share/network-error.mp4'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'network-error-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      // Mock HTTPS network error
      const networkError = new Error('Network timeout')
      mockHttpsGet.mockImplementation((url: any, callback: any) => {
        return {
          on: (event: string, handler: Function) => {
            if (event === 'error') {
              handler(networkError)
            }
          }
        }
      })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow('Network timeout')
      
      // Verify cleanup was attempted
      expect(fs.unlink).toHaveBeenCalled()
    })

    it('should handle file write errors', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/write-error.mp3'
      const videoUrl = 'https://heygen.com/share/write-error.mp4'
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'write-error-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      // Mock HTTPS request that triggers file write error
      const writeError = new Error('Disk full')
      mockHttpsGet.mockImplementation((url: any, callback: any) => {
        // Don't call callback, instead return request object that will emit error
        return {
          on: (event: string, handler: Function) => {
            if (event === 'error') {
              // Trigger error immediately
              setTimeout(() => handler(writeError), 0)
            }
          }
        }
      })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow('Disk full')
      
      mockSetTimeout.mockRestore()
    })

    it('should create unique filenames for concurrent downloads', async () => {
      // Arrange
      const audioUrl1 = 'https://api.elevenlabs.io/v1/audio/concurrent1.mp3'
      const audioUrl2 = 'https://api.elevenlabs.io/v1/audio/concurrent2.mp3'
      
      let timestampCounter = 1000000000
      const mockDateNow = vi.spyOn(Date, 'now').mockImplementation(() => timestampCounter++)
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      // Setup mocks for both requests - need to handle concurrent calls properly
      let callCount = 0
      vi.mocked(composio.tools.proxyExecute).mockImplementation(async (params: any) => {
        callCount++
        if (params.endpoint === '/v2/video/generate') {
          if (callCount <= 2) {
            return { data: { data: { video_id: 'concurrent1-123' } } }
          } else {
            return { data: { data: { video_id: 'concurrent2-456' } } }
          }
        } else {
          // Status check
          if (callCount <= 2) {
            return { data: { data: { status: 'completed', video_url: 'https://heygen.com/share/concurrent1.mp4' } } }
          } else {
            return { data: { data: { status: 'completed', video_url: 'https://heygen.com/share/concurrent2.mp4' } } }
          }
        }
      })

      setupMockDownload()

      // Act
      const [result1, result2] = await Promise.all([
        runVideoGenerationStage(audioUrl1),
        runVideoGenerationStage(audioUrl2)
      ])

      // Assert
      expect(result1.savedPath).toBe('/mock/home/Downloads/heygen_video_1000000000.mp4')
      expect(result2.savedPath).toBe('/mock/home/Downloads/heygen_video_1000000001.mp4')
      expect(result1.savedPath).not.toBe(result2.savedPath)
      
      mockDateNow.mockRestore()
      mockSetTimeout.mockRestore()
    })

    it('should log download progress', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/download-progress.mp3'
      const videoUrl = 'https://heygen.com/share/download-progress.mp4'
      const expectedPath = '/mock/home/Downloads/heygen_video_123456789.mp4'
      
      const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(123456789)
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'download-progress-123' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: videoUrl
            }
          }
        })

      setupMockDownload(expectedPath)

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith('⬇️  Downloading video...')
      expect(mockConsoleLog).toHaveBeenCalledWith(`📁 Saving to: ${expectedPath}`)
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Download completed!')
      expect(mockConsoleLog).toHaveBeenCalledWith(`🎉 Video saved at: ${expectedPath}`)
      
      mockDateNow.mockRestore()
      mockSetTimeout.mockRestore()
    })
  })

  describe('Connection Management and Authentication', () => {
    it('should handle connection ID retrieval failure', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/connection-error.mp3'
      const connectionError = new Error('No active connection found for HEYGEN')
      
      vi.mocked(getHeyGenConnectionId).mockRejectedValueOnce(connectionError)

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        'No active connection found for HEYGEN'
      )
    })

    it('should use connection ID consistently across all API calls', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/consistent-connection.mp3'
      const connectionId = 'consistent-connection-test-123'
      
      vi.mocked(getHeyGenConnectionId).mockResolvedValueOnce(connectionId)
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'consistent-test-456' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: { status: 'processing' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/consistent-test.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      const allCalls = vi.mocked(composio.tools.proxyExecute).mock.calls
      allCalls.forEach((call: any) => {
        expect(call[0].connectedAccountId).toBe(connectionId)
      })
      
      mockSetTimeout.mockRestore()
    })

    it('should handle authentication errors from HeyGen API', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/auth-error.mp3'
      
      const errorResponse = {
        code: 'UNAUTHORIZED',
        message: 'Invalid authentication credentials'
      }
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            error: errorResponse
          }
        })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        `HeyGen Start Error: ${JSON.stringify(errorResponse)}`
      )
    })

    it('should handle API rate limiting errors', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/rate-limit.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockRejectedValueOnce(new Error('Rate limit exceeded. Please try again later.'))

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        'Rate limit exceeded. Please try again later.'
      )
    })

    it('should handle network timeout during API calls', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/timeout.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockRejectedValueOnce(new Error('Request timeout'))

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow('Request timeout')
    })

    it('should handle malformed API responses', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/malformed.mp3'
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: null // Malformed response - data is null
          }
        })

      // Act & Assert
      await expect(runVideoGenerationStage(audioUrl)).rejects.toThrow(
        'No Video ID received from HeyGen.'
      )
    })

    it('should log connection information', async () => {
      // Arrange
      const audioUrl = 'https://api.elevenlabs.io/v1/audio/connection-log.mp3'
      const connectionId = 'connection-log-test-789'
      
      vi.mocked(getHeyGenConnectionId).mockResolvedValueOnce(connectionId)
      
      // Mock setTimeout to execute immediately
      const mockSetTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as any
      })
      
      vi.mocked(composio.tools.proxyExecute)
        .mockResolvedValueOnce({
          data: {
            data: { video_id: 'connection-log-456' }
          }
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              status: 'completed',
              video_url: 'https://heygen.com/share/connection-log.mp4'
            }
          }
        })

      setupMockDownload()

      // Act
      await runVideoGenerationStage(audioUrl)

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith('🔌 Using HeyGen Connection ID:', connectionId)
      
      mockSetTimeout.mockRestore()
    })
  })

  // Helper function to setup mock download
  function setupMockDownload(expectedPath?: string) {
    const mockResponse = {
      statusCode: 200,
      pipe: vi.fn()
    }
    
    mockHttpsGet.mockImplementation((url: any, callback: any) => {
      callback(mockResponse)
      return {
        on: vi.fn()
      }
    })
    
    mockWriteStream.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'finish') {
        handler()
      }
    })
    
    mockWriteStream.close.mockImplementation(() => {
      // Simulate successful file close
    })
    
    if (expectedPath) {
      vi.mocked(path.join).mockReturnValue(expectedPath)
    }
  }
})