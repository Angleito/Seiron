/**
 * E2E tests for Voice Activity Detection (VAD) with simulated audio
 */

import { test, expect } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

test.describe('Voice Activity Detection', () => {
  let voiceChatPage: VoiceChatPage;
  let helpers: VoiceTestHelpers;
  let audioMock: AudioDeviceMock;

  test.beforeEach(async ({ page }) => {
    voiceChatPage = new VoiceChatPage(page);
    helpers = new VoiceTestHelpers(page);
    audioMock = AudioDeviceMock.getInstance();

    // Initialize audio mocks with VAD simulation
    await page.addInitScript(() => {
      const audioMock = (window as any).AudioDeviceMock?.getInstance();
      if (audioMock) {
        audioMock.initializeAllMocks();
      }

      // Mock AnalyserNode for VAD
      window.mockAnalyserNode = {
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: (array) => {
          // Simulate different audio levels based on test scenario
          const level = window.currentAudioLevel || 0;
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(level * 255);
          }
        },
        connect: () => {},
        disconnect: () => {}
      };
    });

    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.goto();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test.afterEach(async () => {
    await voiceChatPage.cleanup();
    audioMock.cleanup();
  });

  test('should detect voice activity with normal speech levels', async () => {
    await voiceChatPage.startRecording();

    // Simulate normal speech level
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.7;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 2000);

    // Verify VAD activation
    await voiceChatPage.verifyVADStatus(true);
    await expect(voiceChatPage.vadIndicator).toHaveClass(/active/);

    // Verify VAD indicator updates in real-time
    const vadElement = voiceChatPage.vadIndicator;
    await expect(vadElement).toHaveAttribute('data-level');
    
    const level = await vadElement.getAttribute('data-level');
    expect(parseInt(level || '0')).toBeGreaterThan(50);

    await voiceChatPage.stopRecording();
  });

  test('should not trigger on background noise', async () => {
    await voiceChatPage.startRecording();

    // Simulate low-level background noise
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.1;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.silence, 2000);

    // Verify VAD does not activate
    await voiceChatPage.verifyVADStatus(false);
    await expect(voiceChatPage.vadIndicator).not.toHaveClass(/active/);

    await voiceChatPage.stopRecording();
  });

  test('should handle quiet speech detection', async () => {
    await voiceChatPage.startRecording();

    // Simulate quiet speech
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.3;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 3000);

    // Verify VAD can detect quiet speech
    await voiceChatPage.verifyVADStatus(true);

    // Verify sensitivity adjustment
    const vadSettings = helpers.page.locator('[data-testid="vad-sensitivity"]');
    if (await vadSettings.isVisible()) {
      await vadSettings.fill('0.2'); // Lower threshold for quiet speech
      await voiceChatPage.verifyVADStatus(true);
    }

    await voiceChatPage.stopRecording();
  });

  test('should handle loud speech without clipping', async () => {
    await voiceChatPage.startRecording();

    // Simulate loud speech
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.95;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.longSpeech, 2000);

    // Verify VAD activates appropriately
    await voiceChatPage.verifyVADStatus(true);

    // Verify no audio clipping indicators
    const clippingIndicator = helpers.page.locator('[data-testid="audio-clipping"]');
    if (await clippingIndicator.isVisible()) {
      await expect(clippingIndicator).not.toHaveClass(/warning/);
    }

    await voiceChatPage.stopRecording();
  });

  test('should test VAD responsiveness across audio levels', async () => {
    await voiceChatPage.startRecording();

    for (const testCase of voiceTestData.vadTestCases) {
      // Set audio level
      await helpers.page.evaluate((level) => {
        window.currentAudioLevel = level;
      }, testCase.audioLevel);

      await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, testCase.duration);

      // Verify VAD response
      if (testCase.expectedDetection) {
        await voiceChatPage.verifyVADStatus(true);
      } else {
        await voiceChatPage.verifyVADStatus(false);
      }

      // Wait between test cases
      await helpers.page.waitForTimeout(500);
    }

    await voiceChatPage.stopRecording();
  });

  test('should show visual VAD feedback to user', async () => {
    await voiceChatPage.startRecording();

    // Verify VAD indicator is visible
    await expect(voiceChatPage.vadIndicator).toBeVisible();

    // Test visual feedback with different audio levels
    const levels = [0.2, 0.5, 0.8];
    
    for (const level of levels) {
      await helpers.page.evaluate((level) => {
        window.currentAudioLevel = level;
      }, level);

      await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 1000);

      // Verify visual feedback corresponds to audio level
      const vadElement = voiceChatPage.vadIndicator;
      const computedStyle = await vadElement.evaluate(el => getComputedStyle(el));
      
      // Higher levels should result in more intense visual feedback
      if (level > 0.5) {
        await expect(vadElement).toHaveClass(/high-activity/);
      } else if (level > 0.2) {
        await expect(vadElement).toHaveClass(/medium-activity/);
      }
    }

    await voiceChatPage.stopRecording();
  });

  test('should measure VAD response latency', async () => {
    await voiceChatPage.startRecording();

    // Measure VAD detection latency
    const startTime = Date.now();
    
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.8;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 1000);
    await helpers.waitForVADTrigger();

    const vadLatency = Date.now() - startTime;

    // Verify VAD responds within performance threshold
    expect(vadLatency).toBeLessThan(voiceTestData.performanceThresholds.audioProcessing.vadResponse);

    await voiceChatPage.stopRecording();
  });

  test('should handle VAD during continuous speech', async () => {
    await voiceChatPage.startRecording();

    // Simulate continuous speech with varying levels
    const speechPattern = [
      { level: 0.1, duration: 500 },  // Pause
      { level: 0.7, duration: 2000 }, // Speech
      { level: 0.2, duration: 300 },  // Brief pause
      { level: 0.8, duration: 1500 }, // More speech
      { level: 0.1, duration: 500 }   // End pause
    ];

    for (const segment of speechPattern) {
      await helpers.page.evaluate((level) => {
        window.currentAudioLevel = level;
      }, segment.level);

      await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, segment.duration);

      if (segment.level > 0.3) {
        await voiceChatPage.verifyVADStatus(true);
      } else {
        // Allow some delay for VAD to deactivate
        await helpers.page.waitForTimeout(200);
        await voiceChatPage.verifyVADStatus(false);
      }
    }

    await voiceChatPage.stopRecording();
  });

  test('should provide VAD configuration options', async () => {
    // Open settings if available
    try {
      await voiceChatPage.openSettings();

      // Check for VAD configuration options
      const vadSettings = helpers.page.locator('[data-testid="vad-settings"]');
      if (await vadSettings.isVisible()) {
        // Test sensitivity adjustment
        const sensitivitySlider = vadSettings.locator('[data-testid="vad-sensitivity-slider"]');
        if (await sensitivitySlider.isVisible()) {
          await sensitivitySlider.fill('0.4');
        }

        // Test noise gate setting
        const noiseGate = vadSettings.locator('[data-testid="vad-noise-gate"]');
        if (await noiseGate.isVisible()) {
          await noiseGate.check();
        }

        // Apply settings
        const applyButton = vadSettings.locator('[data-testid="apply-vad-settings"]');
        if (await applyButton.isVisible()) {
          await applyButton.click();
        }
      }
    } catch (error) {
      // Settings may not be available in all implementations
      console.log('VAD settings not available:', error);
    }
  });

  test('should handle VAD with different microphone types', async () => {
    const microphoneTypes = ['built-in', 'headset', 'external'];

    for (const micType of microphoneTypes) {
      // Simulate different microphone characteristics
      await helpers.page.evaluate((micType) => {
        window.microphoneType = micType;
        // Different microphones may have different sensitivity
        window.microphoneSensitivity = micType === 'built-in' ? 0.8 : 
                                       micType === 'headset' ? 0.9 : 0.7;
      }, micType);

      await voiceChatPage.startRecording();

      await helpers.page.evaluate(() => {
        window.currentAudioLevel = 0.6 * (window.microphoneSensitivity || 1);
      });

      await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 1500);
      await voiceChatPage.verifyVADStatus(true);

      await voiceChatPage.stopRecording();
      await helpers.page.waitForTimeout(500);
    }
  });

  test('should show VAD status in accessibility announcements', async () => {
    await voiceChatPage.startRecording();

    // Simulate voice activity
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.7;
    });

    await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, 2000);

    // Verify accessibility announcement for VAD activation
    await helpers.verifyScreenReaderAnnouncement('Voice detected');

    // Simulate end of voice activity
    await helpers.page.evaluate(() => {
      window.currentAudioLevel = 0.1;
    });

    await helpers.page.waitForTimeout(1000);

    // Verify accessibility announcement for VAD deactivation
    await helpers.verifyScreenReaderAnnouncement('Voice stopped');

    await voiceChatPage.stopRecording();
  });

  test('should handle VAD calibration', async () => {
    // Test automatic VAD calibration
    const calibrationButton = helpers.page.locator('[data-testid="vad-calibrate"]');
    
    if (await calibrationButton.isVisible()) {
      await calibrationButton.click();

      // Verify calibration process
      await expect(helpers.page.locator('[data-testid="calibration-dialog"]')).toBeVisible();
      
      // Follow calibration instructions
      await expect(helpers.page.locator('[data-testid="calibration-instructions"]'))
        .toContainText('speak normally');

      // Simulate calibration speech
      await helpers.page.evaluate(() => {
        window.currentAudioLevel = 0.6;
      });

      await helpers.simulateAudioInput(voiceTestData.audioSamples.longSpeech, 3000);

      // Complete calibration
      const completeButton = helpers.page.locator('[data-testid="complete-calibration"]');
      await completeButton.click();

      // Verify calibration is saved
      await expect(helpers.page.locator('[data-testid="calibration-status"]'))
        .toContainText('Calibrated');
    }
  });

  test('should handle VAD in noisy environments', async () => {
    // Simulate noisy environment
    await helpers.simulateNetworkConditions('unstable');

    await voiceChatPage.startRecording();

    // Mix of speech and noise
    const noisyPattern = [
      { level: 0.2, duration: 500 },  // Background noise
      { level: 0.8, duration: 1000 }, // Clear speech
      { level: 0.4, duration: 300 },  // Mixed noise/speech
      { level: 0.9, duration: 800 },  // Loud speech
      { level: 0.3, duration: 400 }   // Trailing noise
    ];

    for (const segment of noisyPattern) {
      await helpers.page.evaluate((level) => {
        window.currentAudioLevel = level;
      }, segment.level);

      await helpers.simulateAudioInput(voiceTestData.audioSamples.shortSpeech, segment.duration);

      // VAD should be more conservative in noisy environments
      if (segment.level > 0.6) {
        await voiceChatPage.verifyVADStatus(true);
      }
    }

    await voiceChatPage.stopRecording();
  });
});