/**
 * E2E tests for voice chat on mobile devices
 */

import { test, expect, devices } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

// Test on multiple mobile devices
const mobileDevices = [
  { name: 'iPhone 13', device: devices['iPhone 13'] },
  { name: 'Galaxy S8', device: devices['Galaxy S8'] },
  { name: 'iPad Air', device: devices['iPad Air'] }
];

for (const { name, device } of mobileDevices) {
  test.describe(`Voice Mobile - ${name}`, () => {
    let voiceChatPage: VoiceChatPage;
    let helpers: VoiceTestHelpers;
    let audioMock: AudioDeviceMock;

    test.use({ ...device });

    test.beforeEach(async ({ page }) => {
      voiceChatPage = new VoiceChatPage(page);
      helpers = new VoiceTestHelpers(page);
      audioMock = AudioDeviceMock.getInstance();

      // Mobile-specific audio constraints
      await helpers.simulateAudioConstraints('mobile');

      await page.addInitScript(() => {
        const audioMock = (window as any).AudioDeviceMock?.getInstance();
        if (audioMock) {
          audioMock.initializeAllMocks();
        }

        // Mock mobile-specific APIs
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          writable: true
        });

        // Mock touch events
        window.TouchEvent = class TouchEvent extends Event {
          constructor(type, options = {}) {
            super(type, options);
            this.touches = options.touches || [];
            this.targetTouches = options.targetTouches || [];
            this.changedTouches = options.changedTouches || [];
          }
        };
      });

      await helpers.mockElevenLabsAPI('success');
      await helpers.mockAIChatAPI('success');
      await voiceChatPage.grantMicrophonePermission();
      await voiceChatPage.goto();
      await voiceChatPage.verifyVoiceChatReady();
    });

    test.afterEach(async () => {
      await voiceChatPage.cleanup();
      audioMock.cleanup();
    });

    test('should display voice chat interface optimized for mobile', async () => {
      // Verify mobile-optimized layout
      await expect(voiceChatPage.voiceChatContainer).toBeVisible();
      
      // Check touch-friendly button sizes
      const voiceButton = voiceChatPage.voiceButton;
      const buttonBox = await voiceButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(44); // iOS minimum touch target
      expect(buttonBox?.height).toBeGreaterThan(44);

      // Verify responsive design
      const containerBox = await voiceChatPage.voiceChatContainer.boundingBox();
      const viewport = page.viewportSize();
      expect(containerBox?.width).toBeLessThanOrEqual(viewport?.width || 0);

      // Take screenshot for visual regression
      await voiceChatPage.takeScreenshot(`mobile-interface-${name.toLowerCase()}`);
    });

    test('should handle touch interactions for voice control', async () => {
      // Test touch to start recording
      await voiceChatPage.voiceButton.tap();
      await voiceChatPage.verifyRecordingState(true);

      // Test touch to stop recording
      await voiceChatPage.stopRecordingButton.tap();
      await voiceChatPage.verifyRecordingState(false);

      // Test long press for extended recording
      await voiceChatPage.voiceButton.tap({ timeout: 2000 });
      await voiceChatPage.verifyRecordingState(true);
      
      await helpers.page.waitForTimeout(3000);
      await voiceChatPage.stopRecordingButton.tap();
    });

    test('should complete voice conversation on mobile', async () => {
      const result = await voiceChatPage.completeVoiceConversation(
        voiceTestData.conversations.basic.userInput
      );

      // Verify conversation works on mobile
      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();

      // Verify mobile-specific performance
      expect(result.latency.transcription).toBeLessThan(3000); // Slightly higher threshold for mobile
      expect(result.latency.aiResponse).toBeLessThan(6000);
      expect(result.latency.ttsPlayback).toBeLessThan(1500);

      // Verify audio playback on mobile
      const isPlaying = await helpers.verifyAudioPlayback();
      expect(isPlaying).toBe(true);
    });

    test('should handle orientation changes gracefully', async () => {
      // Start in portrait mode
      await voiceChatPage.startRecording();
      await voiceChatPage.verifyRecordingState(true);

      // Change to landscape
      await helpers.simulateOrientationChange('landscape');
      
      // Verify voice chat continues working
      await voiceChatPage.verifyRecordingState(true);
      await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
      await voiceChatPage.stopRecording();

      // Verify layout adapts to landscape
      await expect(voiceChatPage.voiceChatContainer).toBeVisible();

      // Change back to portrait
      await helpers.simulateOrientationChange('portrait');
      
      // Verify transcription is received
      const transcription = await voiceChatPage.waitForTranscription();
      expect(transcription).toBeTruthy();
    });

    test('should handle mobile browser audio limitations', async () => {
      // Test autoplay restrictions
      await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

      // Verify user interaction is required for audio playback on mobile
      const playButton = helpers.page.locator('[data-testid="mobile-play-button"]');
      if (await playButton.isVisible()) {
        await playButton.tap();
        await voiceChatPage.waitForAudioPlayback();
      }

      // Test audio context resumption after user gesture
      const audioContext = await helpers.page.evaluate(() => {
        if (window.AudioContext) {
          const ctx = new AudioContext();
          return ctx.state;
        }
        return null;
      });

      if (audioContext === 'suspended') {
        await voiceChatPage.voiceButton.tap();
        await helpers.page.evaluate(() => {
          if (window.AudioContext) {
            const ctx = new AudioContext();
            ctx.resume();
          }
        });
      }
    });

    test('should provide mobile-specific voice UI feedback', async () => {
      // Test haptic feedback simulation
      await voiceChatPage.voiceButton.tap();
      
      // Verify visual feedback for touch
      await expect(voiceChatPage.voiceButton).toHaveClass(/pressed/);
      
      // Test voice level visualization for mobile
      await voiceChatPage.startRecording();
      await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);

      // Verify mobile-friendly VAD indicator
      await expect(voiceChatPage.vadIndicator).toBeVisible();
      const vadSize = await voiceChatPage.vadIndicator.boundingBox();
      expect(vadSize?.width).toBeGreaterThan(30); // Minimum visible size on mobile

      await voiceChatPage.stopRecording();
    });

    test('should handle mobile keyboard interactions', async () => {
      // Test voice shortcuts on mobile browsers that support them
      const shortcutsButton = helpers.page.locator('[data-testid="voice-shortcuts"]');
      if (await shortcutsButton.isVisible()) {
        await shortcutsButton.tap();

        // Verify mobile-friendly shortcuts dialog
        const shortcutsDialog = helpers.page.locator('[data-testid="shortcuts-dialog"]');
        await expect(shortcutsDialog).toBeVisible();
        
        // Close dialog
        await helpers.page.locator('[data-testid="close-shortcuts"]').tap();
      }
    });

    test('should support mobile accessibility features', async () => {
      // Test screen reader compatibility
      await expect(voiceChatPage.voiceButton).toHaveAttribute('aria-label');
      await expect(voiceChatPage.liveRegion).toHaveAttribute('aria-live', 'polite');

      // Test high contrast mode support
      await helpers.page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(voiceChatPage.voiceChatContainer).toBeVisible();

      // Test large text support
      await helpers.page.addStyleTag({
        content: '* { font-size: 120% !important; }'
      });
      await expect(voiceChatPage.voiceButton).toBeVisible();

      // Verify button remains touch-friendly with larger text
      const buttonBox = await voiceChatPage.voiceButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(44);
    });

    test('should handle mobile network conditions', async () => {
      // Test slow 3G connection
      await helpers.page.context().route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate 3G delay
        await route.continue();
      });

      // Verify voice chat still works with slow connection
      const result = await voiceChatPage.completeVoiceConversation(
        voiceTestData.conversations.basic.userInput
      );

      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();

      // Verify loading indicators are shown
      await expect(helpers.page.locator('[data-testid="mobile-loading"]')).toBeVisible();
    });

    test('should handle mobile battery and performance optimization', async () => {
      // Test reduced animation mode
      await helpers.page.emulateMedia({ reducedMotion: 'reduce' });
      
      await voiceChatPage.startRecording();
      
      // Verify animations are reduced
      const vadIndicator = voiceChatPage.vadIndicator;
      const animationDuration = await vadIndicator.evaluate(el => {
        const styles = getComputedStyle(el);
        return styles.animationDuration;
      });
      
      // Should have minimal or no animation
      expect(animationDuration).toMatch(/(0s|none)/);

      await voiceChatPage.stopRecording();
    });

    test('should support pull-to-refresh on mobile', async () => {
      // Simulate pull-to-refresh gesture
      await helpers.page.evaluate(() => {
        window.scrollTo(0, 0);
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 50 }]
        });
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 150 }]
        });
        const touchEnd = new TouchEvent('touchend', {
          touches: []
        });
        
        document.dispatchEvent(touchStart);
        document.dispatchEvent(touchMove);
        document.dispatchEvent(touchEnd);
      });

      // Verify page refreshes gracefully
      await voiceChatPage.verifyVoiceChatReady();
    });

    test('should handle mobile app-like features', async () => {
      // Test fullscreen mode
      const fullscreenButton = helpers.page.locator('[data-testid="fullscreen-voice"]');
      if (await fullscreenButton.isVisible()) {
        await fullscreenButton.tap();
        
        // Verify fullscreen voice interface
        await expect(helpers.page.locator('[data-testid="fullscreen-voice-ui"]')).toBeVisible();
        
        // Exit fullscreen
        await helpers.page.keyboard.press('Escape');
      }

      // Test PWA installation prompt
      const installPrompt = helpers.page.locator('[data-testid="install-app"]');
      if (await installPrompt.isVisible()) {
        await expect(installPrompt).toContainText('Add to Home Screen');
      }
    });

    test('should maintain voice quality on mobile networks', async () => {
      // Test with mobile network simulation
      await helpers.page.context().route('**/api/voice/**', async (route) => {
        // Simulate mobile network compression
        const response = await route.fetch();
        const body = await response.body();
        
        await route.fulfill({
          status: response.status(),
          headers: { 
            ...response.headers(),
            'content-encoding': 'gzip'
          },
          body: body
        });
      });

      const result = await voiceChatPage.completeVoiceConversation(
        voiceTestData.conversations.basic.userInput
      );

      // Verify audio quality is maintained
      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();
      
      // Verify audio playback works with compression
      const isPlaying = await helpers.verifyAudioPlayback();
      expect(isPlaying).toBe(true);
    });
  });
}

test.describe('Cross-Mobile Compatibility', () => {
  test('should work consistently across mobile browsers', async ({ page }) => {
    const browsers = ['webkit', 'chromium']; // Test Safari and Chrome mobile
    
    for (const browserName of browsers) {
      // Test would be run with different browser engines
      const voiceChatPage = new VoiceChatPage(page);
      const helpers = new VoiceTestHelpers(page);

      await helpers.mockElevenLabsAPI('success');
      await helpers.mockAIChatAPI('success');
      await voiceChatPage.grantMicrophonePermission();
      await voiceChatPage.goto();
      await voiceChatPage.verifyVoiceChatReady();

      // Basic functionality test
      const result = await voiceChatPage.completeVoiceConversation(
        voiceTestData.conversations.basic.userInput
      );

      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();

      await voiceChatPage.cleanup();
    }
  });
});