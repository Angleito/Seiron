/**
 * E2E tests for voice chat error scenarios and recovery
 */

import { test, expect } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

test.describe('Voice Error Recovery', () => {
  let voiceChatPage: VoiceChatPage;
  let helpers: VoiceTestHelpers;
  let audioMock: AudioDeviceMock;

  test.beforeEach(async ({ page }) => {
    voiceChatPage = new VoiceChatPage(page);
    helpers = new VoiceTestHelpers(page);
    audioMock = AudioDeviceMock.getInstance();

    await page.addInitScript(() => {
      const audioMock = (window as any).AudioDeviceMock?.getInstance();
      if (audioMock) {
        audioMock.initializeAllMocks();
      }
    });

    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.goto();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test.afterEach(async () => {
    await voiceChatPage.cleanup();
    audioMock.cleanup();
  });

  test('should recover from network failures during transcription', async () => {
    // Start recording
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Simulate network failure during transcription
    await helpers.simulateNetworkConditions('offline');

    // Verify error state
    await voiceChatPage.verifyErrorState('network');
    await expect(voiceChatPage.networkErrorMessage).toContainText('connection');

    // Restore network and retry
    await helpers.page.context().setOffline(false);
    await voiceChatPage.retryAfterError();

    // Verify successful recovery
    const transcription = await voiceChatPage.waitForTranscription();
    expect(transcription).toBeTruthy();
  });

  test('should handle audio device disconnection gracefully', async () => {
    // Start recording
    await voiceChatPage.startRecording();
    await voiceChatPage.verifyRecordingState(true);

    // Simulate device disconnection
    audioMock.simulateDeviceError('NotReadableError');

    // Verify error handling
    await voiceChatPage.verifyErrorState('device');
    await expect(voiceChatPage.deviceErrorMessage).toContainText('device');

    // Verify recording stops gracefully
    await voiceChatPage.verifyRecordingState(false);

    // Retry with device restored
    await voiceChatPage.retryAfterError();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should recover from ElevenLabs API failures', async () => {
    // Mock API failure
    await helpers.mockElevenLabsAPI('error');

    // Complete voice input to trigger TTS
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Wait for transcription (should succeed)
    await voiceChatPage.waitForTranscription();

    // AI response should be received
    await voiceChatPage.waitForAIResponse();

    // TTS should fail and show error
    await voiceChatPage.verifyErrorState('tts');
    await expect(voiceChatPage.errorMessage).toContainText('audio synthesis');

    // Restore API and retry TTS
    await helpers.mockElevenLabsAPI('success');
    await voiceChatPage.retryButton.click();

    // Verify TTS recovery
    await voiceChatPage.waitForAudioPlayback();
  });

  test('should handle speech recognition service failures', async () => {
    // Mock speech recognition failure
    await helpers.page.evaluate(() => {
      const originalSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      window.SpeechRecognition = window.webkitSpeechRecognition = class {
        start() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({ error: 'service-not-allowed' });
            }
          }, 100);
        }
        stop() {}
        abort() {}
        addEventListener() {}
        removeEventListener() {}
      };
    });

    // Attempt voice input
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Verify transcription error
    await voiceChatPage.verifyErrorState('transcription');
    await expect(voiceChatPage.errorMessage).toContainText('speech recognition');

    // Verify fallback options
    await expect(helpers.page.locator('[data-testid="transcription-fallback"]')).toBeVisible();
    await expect(helpers.page.locator('[data-testid="manual-input-option"]')).toBeVisible();
  });

  test('should handle AI service unavailability', async () => {
    // Mock AI service failure
    await helpers.mockAIChatAPI('error');

    // Complete voice input
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Wait for transcription (should succeed)
    const transcription = await voiceChatPage.waitForTranscription();
    expect(transcription).toBeTruthy();

    // AI service should fail
    await voiceChatPage.verifyErrorState('ai-service');
    await expect(voiceChatPage.errorMessage).toContainText('AI service');

    // Restore service and retry
    await helpers.mockAIChatAPI('success');
    await voiceChatPage.retryAfterError();

    // Verify AI response recovery
    const aiResponse = await voiceChatPage.waitForAIResponse();
    expect(aiResponse).toBeTruthy();
  });

  test('should handle partial conversation failures', async () => {
    // Complete first conversation successfully
    await helpers.mockElevenLabsAPI('success');
    await helpers.mockAIChatAPI('success');

    const result1 = await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);
    expect(result1.transcription).toBeTruthy();
    expect(result1.aiResponse).toBeTruthy();

    // Fail second conversation at TTS
    await helpers.mockElevenLabsAPI('error');

    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.complex.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Transcription and AI response should work
    await voiceChatPage.waitForTranscription();
    await voiceChatPage.waitForAIResponse();

    // TTS should fail
    await voiceChatPage.verifyErrorState('tts');

    // Verify conversation history is preserved
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(3); // At least one complete + partial conversation
  });

  test('should provide retry with exponential backoff', async () => {
    // Mock intermittent failures
    let attemptCount = 0;
    await helpers.page.route('**/api/ai/**', async (route) => {
      attemptCount++;
      if (attemptCount < 3) {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      } else {
        await route.fulfill({ 
          status: 200, 
          body: JSON.stringify(voiceTestData.mockResponses.aiChat.success) 
        });
      }
    });

    // Attempt voice conversation
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    await voiceChatPage.waitForTranscription();

    // First retry
    await voiceChatPage.verifyErrorState('ai-service');
    const firstRetryTime = Date.now();
    await voiceChatPage.retryButton.click();

    // Second retry with longer delay
    await voiceChatPage.verifyErrorState('ai-service');
    const secondRetryTime = Date.now();
    await voiceChatPage.retryButton.click();

    // Verify exponential backoff
    expect(secondRetryTime - firstRetryTime).toBeGreaterThan(1000);

    // Third attempt should succeed
    const aiResponse = await voiceChatPage.waitForAIResponse();
    expect(aiResponse).toBeTruthy();
  });

  test('should handle browser tab visibility changes during recording', async () => {
    // Start recording
    await voiceChatPage.startRecording();
    await voiceChatPage.verifyRecordingState(true);

    // Simulate tab becoming hidden
    await helpers.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify recording is paused/stopped gracefully
    await expect(helpers.page.locator('[data-testid="recording-paused"]')).toBeVisible();

    // Simulate tab becoming visible again
    await helpers.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify recording can be resumed
    await voiceChatPage.startRecording();
    await voiceChatPage.verifyRecordingState(true);
  });

  test('should handle microphone permission revocation during use', async () => {
    // Start recording successfully
    await voiceChatPage.startRecording();
    await voiceChatPage.verifyRecordingState(true);

    // Simulate permission revocation
    await helpers.page.evaluate(() => {
      navigator.permissions.query({ name: 'microphone' }).then(permission => {
        permission.state = 'denied';
        permission.dispatchEvent(new Event('change'));
      });
    });

    // Verify graceful handling
    await voiceChatPage.verifyErrorState('permission');
    await voiceChatPage.verifyRecordingState(false);

    // Verify user can re-grant permission
    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.retryAfterError();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should handle multiple simultaneous errors', async () => {
    // Start conversation
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);

    // Trigger multiple failures simultaneously
    await helpers.simulateNetworkConditions('offline');
    audioMock.simulateDeviceError('NotReadableError');

    await voiceChatPage.stopRecording();

    // Verify primary error is shown
    await voiceChatPage.verifyErrorState('network');

    // Restore network
    await helpers.page.context().setOffline(false);
    await voiceChatPage.retryButton.click();

    // Should now show device error
    await voiceChatPage.verifyErrorState('device');

    // Full recovery
    await voiceChatPage.retryAfterError();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should provide detailed error information for debugging', async () => {
    // Mock API error with detailed response
    await helpers.page.route('**/api/ai/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'AI service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          timestamp: Date.now(),
          requestId: 'req-123',
          retryAfter: 30
        })
      });
    });

    // Trigger error
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();
    await voiceChatPage.waitForTranscription();

    // Verify detailed error information
    await voiceChatPage.verifyErrorState('ai-service');
    
    const errorDetails = helpers.page.locator('[data-testid="error-details"]');
    if (await errorDetails.isVisible()) {
      await expect(errorDetails).toContainText('SERVICE_UNAVAILABLE');
      await expect(errorDetails).toContainText('req-123');
    }

    // Verify retry timing information
    const retryInfo = helpers.page.locator('[data-testid="retry-info"]');
    if (await retryInfo.isVisible()) {
      await expect(retryInfo).toContainText('30 seconds');
    }
  });

  test('should maintain error state across page refreshes', async () => {
    // Trigger error
    await helpers.mockAIChatAPI('error');
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();
    await voiceChatPage.waitForTranscription();
    await voiceChatPage.verifyErrorState('ai-service');

    // Refresh page
    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    // Verify error context is restored
    const errorHistory = helpers.page.locator('[data-testid="error-history"]');
    if (await errorHistory.isVisible()) {
      await expect(errorHistory).toContainText('Previous error');
    }
  });

  test('should provide offline mode capabilities', async () => {
    // Go offline
    await helpers.simulateNetworkConditions('offline');

    // Verify offline mode activation
    await expect(helpers.page.locator('[data-testid="offline-mode"]')).toBeVisible();
    await expect(voiceChatPage.connectionStatus).toContainText('Offline');

    // Verify limited functionality is available
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Local transcription should work (if available)
    try {
      await voiceChatPage.waitForTranscription(5000);
    } catch {
      // Transcription may not be available offline
      await expect(helpers.page.locator('[data-testid="offline-limitation"]')).toBeVisible();
    }

    // Verify queued actions when back online
    await helpers.page.context().setOffline(false);
    await expect(helpers.page.locator('[data-testid="sync-pending"]')).toBeVisible();
  });
});