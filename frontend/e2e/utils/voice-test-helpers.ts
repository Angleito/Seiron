/**
 * Helper utilities for voice chat E2E testing
 */

import { Page, Locator, expect } from '@playwright/test';
import { voiceTestData } from '../fixtures/voice-test-data';

export class VoiceTestHelpers {
  constructor(private page: Page) {}

  /**
   * Grant microphone permissions for the page
   */
  async grantMicrophonePermission(): Promise<void> {
    const context = this.page.context();
    await context.grantPermissions(['microphone']);
  }

  /**
   * Deny microphone permissions for the page
   */
  async denyMicrophonePermission(): Promise<void> {
    const context = this.page.context();
    await context.clearPermissions();
  }

  /**
   * Simulate audio input by injecting mock audio data
   */
  async simulateAudioInput(audioData: string, duration: number = 2000): Promise<void> {
    await this.page.evaluate(
      ({ audioData, duration }) => {
        // Mock MediaRecorder
        if (!window.mockMediaRecorder) {
          window.mockMediaRecorder = {
            state: 'inactive',
            ondataavailable: null,
            onstop: null,
            onerror: null,
            start: function() {
              this.state = 'recording';
              setTimeout(() => {
                if (this.ondataavailable) {
                  const blob = new Blob([audioData], { type: 'audio/wav' });
                  this.ondataavailable({ data: blob });
                }
              }, 100);
            },
            stop: function() {
              this.state = 'inactive';
              if (this.onstop) {
                this.onstop();
              }
            }
          };
        }

        // Mock getUserMedia
        navigator.mediaDevices.getUserMedia = () => {
          return Promise.resolve({
            getTracks: () => [{ stop: () => {} }],
            getAudioTracks: () => [{ stop: () => {} }]
          } as MediaStream);
        };
      },
      { audioData, duration }
    );
  }

  /**
   * Wait for voice activity detection to trigger
   */
  async waitForVADTrigger(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const vadIndicator = document.querySelector('[data-testid="vad-active"]');
        return vadIndicator && vadIndicator.classList.contains('active');
      },
      { timeout }
    );
  }

  /**
   * Mock ElevenLabs API responses
   */
  async mockElevenLabsAPI(responseType: 'success' | 'error' = 'success'): Promise<void> {
    const mockResponse = voiceTestData.mockResponses.elevenLabs[responseType];
    
    await this.page.route('**/api/voice/synthesize**', async (route) => {
      if (responseType === 'success') {
        await route.fulfill({
          status: mockResponse.status,
          headers: mockResponse.headers,
          body: Buffer.from(mockResponse.body)
        });
      } else {
        await route.fulfill({
          status: mockResponse.status,
          body: JSON.stringify(mockResponse.body)
        });
      }
    });
  }

  /**
   * Mock AI chat API responses
   */
  async mockAIChatAPI(responseType: 'success' | 'error' = 'success'): Promise<void> {
    const mockResponse = voiceTestData.mockResponses.aiChat[responseType];
    
    await this.page.route('**/api/ai/**', async (route) => {
      await route.fulfill({
        status: responseType === 'success' ? 200 : 500,
        body: JSON.stringify(mockResponse)
      });
    });
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkConditions(condition: 'slow' | 'offline' | 'unstable'): Promise<void> {
    const context = this.page.context();
    
    switch (condition) {
      case 'slow':
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.continue();
        });
        break;
      case 'offline':
        await context.setOffline(true);
        break;
      case 'unstable':
        await context.route('**/*', async (route) => {
          if (Math.random() < 0.3) {
            await route.abort();
          } else {
            await route.continue();
          }
        });
        break;
    }
  }

  /**
   * Measure voice processing latency
   */
  async measureVoiceLatency(): Promise<{
    transcription: number;
    aiResponse: number;
    ttsPlayback: number;
  }> {
    const startTime = Date.now();
    
    // Wait for transcription
    await this.page.waitForSelector('[data-testid="transcription-result"]');
    const transcriptionTime = Date.now() - startTime;
    
    // Wait for AI response
    await this.page.waitForSelector('[data-testid="ai-response"]');
    const aiResponseTime = Date.now() - startTime - transcriptionTime;
    
    // Wait for TTS playback
    await this.page.waitForSelector('[data-testid="audio-playing"]');
    const ttsPlaybackTime = Date.now() - startTime - transcriptionTime - aiResponseTime;
    
    return {
      transcription: transcriptionTime,
      aiResponse: aiResponseTime,
      ttsPlayback: ttsPlaybackTime
    };
  }

  /**
   * Verify audio is playing
   */
  async verifyAudioPlayback(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const audioElements = document.querySelectorAll('audio');
      for (const audio of audioElements) {
        if (!audio.paused && audio.currentTime > 0) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Wait for conversation memory to persist
   */
  async waitForMemoryPersistence(sessionId: string): Promise<void> {
    await this.page.waitForFunction(
      (id) => {
        const memoryData = localStorage.getItem(`voice-chat-memory-${id}`);
        return memoryData && JSON.parse(memoryData).messages.length > 0;
      },
      sessionId,
      { timeout: 10000 }
    );
  }

  /**
   * Simulate mobile device orientation change
   */
  async simulateOrientationChange(orientation: 'portrait' | 'landscape'): Promise<void> {
    const viewport = orientation === 'portrait' 
      ? { width: 390, height: 844 }
      : { width: 844, height: 390 };
    
    await this.page.setViewportSize(viewport);
    
    // Trigger orientation change event
    await this.page.evaluate((orientation) => {
      window.dispatchEvent(new Event('orientationchange'));
      Object.defineProperty(window.screen, 'orientation', {
        value: { angle: orientation === 'portrait' ? 0 : 90 }
      });
    }, orientation);
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Verify accessibility announcements
   */
  async verifyScreenReaderAnnouncement(expectedText: string): Promise<void> {
    await expect(this.page.locator('[aria-live="polite"]')).toContainText(expectedText);
  }

  /**
   * Take visual regression screenshot
   */
  async takeVoiceUIScreenshot(name: string): Promise<void> {
    await this.page.locator('[data-testid="voice-chat-container"]').screenshot({
      path: `e2e/screenshots/voice-ui-${name}.png`
    });
  }

  /**
   * Cleanup audio resources
   */
  async cleanupAudioResources(): Promise<void> {
    await this.page.evaluate(() => {
      // Stop all audio elements
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      
      // Stop media streams
      if (window.currentMediaStream) {
        window.currentMediaStream.getTracks().forEach(track => track.stop());
      }
    });
  }

  /**
   * Verify error recovery
   */
  async verifyErrorRecovery(errorType: string): Promise<void> {
    // Wait for error state
    await this.page.waitForSelector(`[data-testid="error-${errorType}"]`);
    
    // Verify retry button is present
    await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Click retry and verify recovery
    await this.page.click('[data-testid="retry-button"]');
    await this.page.waitForSelector('[data-testid="voice-ready"]');
  }

  /**
   * Simulate device-specific audio constraints
   */
  async simulateAudioConstraints(deviceType: 'mobile' | 'desktop' | 'tablet'): Promise<void> {
    const constraints = {
      mobile: { sampleRate: 22050, channelCount: 1 },
      desktop: { sampleRate: 44100, channelCount: 2 },
      tablet: { sampleRate: 32000, channelCount: 2 }
    };
    
    await this.page.evaluate((constraints) => {
      window.audioConstraints = constraints;
    }, constraints[deviceType]);
  }
}

/**
 * Custom Playwright matchers for voice testing
 */
export const voiceMatchers = {
  async toHaveVoiceEnabled(locator: Locator) {
    const isEnabled = await locator.evaluate((el) => {
      return el.getAttribute('data-voice-enabled') === 'true';
    });
    
    return {
      pass: isEnabled,
      message: () => `Expected element to have voice enabled`
    };
  },

  async toBeRecording(locator: Locator) {
    const isRecording = await locator.evaluate((el) => {
      return el.getAttribute('data-recording') === 'true';
    });
    
    return {
      pass: isRecording,
      message: () => `Expected element to be in recording state`
    };
  },

  async toHaveAudioPlaying(page: Page) {
    const isPlaying = await page.evaluate(() => {
      const audioElements = document.querySelectorAll('audio');
      return Array.from(audioElements).some(audio => !audio.paused);
    });
    
    return {
      pass: isPlaying,
      message: () => `Expected audio to be playing`
    };
  }
};

export default VoiceTestHelpers;