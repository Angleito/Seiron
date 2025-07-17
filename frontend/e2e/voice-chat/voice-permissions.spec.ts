/**
 * E2E tests for microphone permission handling
 */

import { test, expect } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

test.describe('Voice Permissions', () => {
  let voiceChatPage: VoiceChatPage;
  let helpers: VoiceTestHelpers;
  let audioMock: AudioDeviceMock;

  test.beforeEach(async ({ page }) => {
    voiceChatPage = new VoiceChatPage(page);
    helpers = new VoiceTestHelpers(page);
    audioMock = AudioDeviceMock.getInstance();

    // Initialize audio mocks
    await page.addInitScript(() => {
      const audioMock = (window as any).AudioDeviceMock?.getInstance();
      if (audioMock) {
        audioMock.initializeAllMocks();
      }
    });

    await voiceChatPage.goto();
  });

  test.afterEach(async () => {
    await voiceChatPage.cleanup();
    audioMock.cleanup();
  });

  test('should handle microphone permission grant flow', async () => {
    // Initially permission should be prompt state
    await expect(voiceChatPage.voiceButton).toBeVisible();

    // Click voice button to trigger permission request
    await voiceChatPage.voiceButton.click();

    // Handle permission dialog
    await voiceChatPage.grantMicrophonePermission();

    // Verify voice chat becomes available
    await voiceChatPage.verifyVoiceChatReady();
    await expect(voiceChatPage.connectionStatus).toContainText('Ready');

    // Verify voice button is enabled
    await expect(voiceChatPage.voiceButton).toBeEnabled();
    await expect(voiceChatPage.voiceButton).not.toHaveClass(/disabled/);
  });

  test('should handle microphone permission denial gracefully', async () => {
    // Click voice button to trigger permission request
    await voiceChatPage.voiceButton.click();

    // Deny permission
    await voiceChatPage.denyMicrophonePermission();

    // Verify appropriate error state
    await voiceChatPage.verifyErrorState('permission');
    await expect(voiceChatPage.errorMessage).toContainText('Microphone access denied');

    // Verify retry option is available
    await expect(voiceChatPage.retryButton).toBeVisible();
    await expect(voiceChatPage.retryButton).toBeEnabled();

    // Verify voice button shows disabled state
    await expect(voiceChatPage.voiceButton).toHaveClass(/disabled/);
  });

  test('should provide clear permission request messaging', async () => {
    // Click voice button
    await voiceChatPage.voiceButton.click();

    // Verify permission dialog appears with clear messaging
    await expect(voiceChatPage.permissionDialog).toBeVisible();
    await expect(voiceChatPage.permissionDialog).toContainText('microphone');
    await expect(voiceChatPage.permissionDialog).toContainText('voice');

    // Verify user-friendly explanation
    const dialogText = await voiceChatPage.permissionDialog.textContent();
    expect(dialogText?.toLowerCase()).toContain('allow');
    expect(dialogText?.toLowerCase()).toContain('speak');
  });

  test('should handle permission retry after initial denial', async () => {
    // First attempt - deny permission
    await voiceChatPage.voiceButton.click();
    await voiceChatPage.denyMicrophonePermission();
    await voiceChatPage.verifyErrorState('permission');

    // Retry - grant permission
    await voiceChatPage.retryButton.click();
    await voiceChatPage.grantMicrophonePermission();

    // Verify successful recovery
    await voiceChatPage.verifyVoiceChatReady();
    await expect(voiceChatPage.errorMessage).not.toBeVisible();
  });

  test('should persist permission state across page reloads', async () => {
    // Grant permission
    await voiceChatPage.voiceButton.click();
    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.verifyVoiceChatReady();

    // Reload page
    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    // Verify permission is still granted
    await expect(voiceChatPage.voiceButton).toBeEnabled();
    await expect(voiceChatPage.connectionStatus).toContainText('Ready');
  });

  test('should handle permission revocation during session', async () => {
    // Start with granted permission
    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.verifyVoiceChatReady();

    // Start recording
    await voiceChatPage.startRecording();
    await voiceChatPage.verifyRecordingState(true);

    // Simulate permission revocation
    await helpers.denyMicrophonePermission();

    // Verify graceful handling
    await voiceChatPage.verifyErrorState('permission');
    await voiceChatPage.verifyRecordingState(false);

    // Verify user can retry
    await expect(voiceChatPage.retryButton).toBeVisible();
  });

  test('should provide accessibility support for permission dialogs', async () => {
    await voiceChatPage.voiceButton.click();

    // Verify permission dialog has proper ARIA attributes
    await expect(voiceChatPage.permissionDialog).toHaveAttribute('role', 'dialog');
    await expect(voiceChatPage.permissionDialog).toHaveAttribute('aria-modal', 'true');
    await expect(voiceChatPage.permissionDialog).toHaveAttribute('aria-labelledby');

    // Verify focus management
    await expect(voiceChatPage.allowMicrophoneButton).toBeFocused();

    // Test keyboard navigation
    await helpers.page.keyboard.press('Tab');
    await expect(voiceChatPage.denyMicrophoneButton).toBeFocused();

    // Test Escape key to close dialog
    await helpers.page.keyboard.press('Escape');
    await expect(voiceChatPage.permissionDialog).not.toBeVisible();
  });

  test('should show appropriate browser-specific permission instructions', async ({ browserName }) => {
    await voiceChatPage.voiceButton.click();

    const dialogText = await voiceChatPage.permissionDialog.textContent();
    
    // Verify browser-specific guidance is provided
    switch (browserName) {
      case 'chromium':
        expect(dialogText).toContain('Chrome');
        break;
      case 'firefox':
        expect(dialogText).toContain('Firefox');
        break;
      case 'webkit':
        expect(dialogText).toContain('Safari');
        break;
    }
  });

  test('should handle multiple permission requests gracefully', async () => {
    // First request
    await voiceChatPage.voiceButton.click();
    await voiceChatPage.denyMicrophonePermission();

    // Second request
    await voiceChatPage.retryButton.click();
    await voiceChatPage.denyMicrophonePermission();

    // Third request - grant
    await voiceChatPage.retryButton.click();
    await voiceChatPage.grantMicrophonePermission();

    // Verify successful permission grant
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should provide fallback options when microphone unavailable', async () => {
    // Simulate no microphone device
    audioMock.simulateDeviceError('NotFoundError');

    await voiceChatPage.voiceButton.click();

    // Verify appropriate error message
    await voiceChatPage.verifyErrorState('device');
    await expect(voiceChatPage.deviceErrorMessage).toContainText('microphone not found');

    // Verify fallback options are presented
    await expect(helpers.page.locator('[data-testid="text-input-fallback"]')).toBeVisible();
    await expect(helpers.page.locator('[data-testid="device-troubleshoot"]')).toBeVisible();
  });

  test('should handle microphone device switching', async () => {
    // Grant permission
    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.verifyVoiceChatReady();

    // Open settings
    await voiceChatPage.openSettings();

    // Verify device selection is available
    const deviceSelect = helpers.page.locator('[data-testid="microphone-device-select"]');
    await expect(deviceSelect).toBeVisible();

    // Verify multiple devices are listed
    const options = await deviceSelect.locator('option').count();
    expect(options).toBeGreaterThan(1);

    // Switch device
    await deviceSelect.selectOption('mock-microphone-2');

    // Verify device change is handled gracefully
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should show permission status indicator', async () => {
    // Initially should show unknown/requesting state
    const statusIndicator = helpers.page.locator('[data-testid="permission-status"]');
    await expect(statusIndicator).toBeVisible();

    // After granting permission
    await voiceChatPage.voiceButton.click();
    await voiceChatPage.grantMicrophonePermission();

    await expect(statusIndicator).toHaveClass(/granted/);
    await expect(statusIndicator).toContainText('Microphone allowed');
  });

  test('should handle permission timeout scenarios', async () => {
    // Click voice button but don't respond to permission prompt
    await voiceChatPage.voiceButton.click();

    // Wait for timeout period
    await helpers.page.waitForTimeout(10000);

    // Verify timeout is handled gracefully
    await voiceChatPage.verifyErrorState('timeout');
    await expect(voiceChatPage.errorMessage).toContainText('permission timeout');
    await expect(voiceChatPage.retryButton).toBeVisible();
  });

  test('should provide permission troubleshooting guidance', async () => {
    await voiceChatPage.voiceButton.click();
    await voiceChatPage.denyMicrophonePermission();

    // Verify troubleshooting help is available
    const helpLink = helpers.page.locator('[data-testid="permission-help"]');
    await expect(helpLink).toBeVisible();

    await helpLink.click();

    // Verify help dialog with troubleshooting steps
    const helpDialog = helpers.page.locator('[data-testid="permission-troubleshoot-dialog"]');
    await expect(helpDialog).toBeVisible();
    await expect(helpDialog).toContainText('browser settings');
    await expect(helpDialog).toContainText('site permissions');
  });
});