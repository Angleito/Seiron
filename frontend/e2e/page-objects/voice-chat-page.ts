/**
 * Page Object Model for Voice Chat Interface
 */

import { Page, Locator, expect } from '@playwright/test';
import VoiceTestHelpers from '../utils/voice-test-helpers';

export class VoiceChatPage {
  private helpers: VoiceTestHelpers;

  // Main container
  readonly voiceChatContainer: Locator;
  
  // Voice controls
  readonly voiceButton: Locator;
  readonly microphoneButton: Locator;
  readonly stopRecordingButton: Locator;
  readonly muteButton: Locator;
  readonly volumeSlider: Locator;
  
  // Status indicators
  readonly recordingIndicator: Locator;
  readonly vadIndicator: Locator;
  readonly processingSpinner: Locator;
  readonly connectionStatus: Locator;
  readonly errorMessage: Locator;
  
  // Chat interface
  readonly chatMessages: Locator;
  readonly userMessage: Locator;
  readonly aiMessage: Locator;
  readonly transcriptionDisplay: Locator;
  readonly typingIndicator: Locator;
  
  // Audio controls
  readonly audioPlayer: Locator;
  readonly playButton: Locator;
  readonly pauseButton: Locator;
  readonly audioProgress: Locator;
  readonly speedControl: Locator;
  
  // Settings and permissions
  readonly settingsButton: Locator;
  readonly permissionDialog: Locator;
  readonly allowMicrophoneButton: Locator;
  readonly denyMicrophoneButton: Locator;
  
  // Error handling
  readonly retryButton: Locator;
  readonly errorDialog: Locator;
  readonly networkErrorMessage: Locator;
  readonly deviceErrorMessage: Locator;
  
  // Accessibility elements
  readonly liveRegion: Locator;
  readonly skipLink: Locator;
  readonly voiceShortcutsHelp: Locator;

  constructor(page: Page) {
    this.helpers = new VoiceTestHelpers(page);
    
    // Main container
    this.voiceChatContainer = page.locator('[data-testid="voice-chat-container"]');
    
    // Voice controls
    this.voiceButton = page.locator('[data-testid="voice-button"]');
    this.microphoneButton = page.locator('[data-testid="microphone-button"]');
    this.stopRecordingButton = page.locator('[data-testid="stop-recording-button"]');
    this.muteButton = page.locator('[data-testid="mute-button"]');
    this.volumeSlider = page.locator('[data-testid="volume-slider"]');
    
    // Status indicators
    this.recordingIndicator = page.locator('[data-testid="recording-indicator"]');
    this.vadIndicator = page.locator('[data-testid="vad-indicator"]');
    this.processingSpinner = page.locator('[data-testid="processing-spinner"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    
    // Chat interface
    this.chatMessages = page.locator('[data-testid="chat-messages"]');
    this.userMessage = page.locator('[data-testid="user-message"]');
    this.aiMessage = page.locator('[data-testid="ai-message"]');
    this.transcriptionDisplay = page.locator('[data-testid="transcription-display"]');
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]');
    
    // Audio controls
    this.audioPlayer = page.locator('[data-testid="audio-player"]');
    this.playButton = page.locator('[data-testid="play-button"]');
    this.pauseButton = page.locator('[data-testid="pause-button"]');
    this.audioProgress = page.locator('[data-testid="audio-progress"]');
    this.speedControl = page.locator('[data-testid="speed-control"]');
    
    // Settings and permissions
    this.settingsButton = page.locator('[data-testid="settings-button"]');
    this.permissionDialog = page.locator('[data-testid="permission-dialog"]');
    this.allowMicrophoneButton = page.locator('[data-testid="allow-microphone"]');
    this.denyMicrophoneButton = page.locator('[data-testid="deny-microphone"]');
    
    // Error handling
    this.retryButton = page.locator('[data-testid="retry-button"]');
    this.errorDialog = page.locator('[data-testid="error-dialog"]');
    this.networkErrorMessage = page.locator('[data-testid="network-error"]');
    this.deviceErrorMessage = page.locator('[data-testid="device-error"]');
    
    // Accessibility elements
    this.liveRegion = page.locator('[aria-live="polite"]');
    this.skipLink = page.locator('[data-testid="skip-to-chat"]');
    this.voiceShortcutsHelp = page.locator('[data-testid="voice-shortcuts-help"]');
  }

  /**
   * Navigate to voice chat page
   */
  async goto(): Promise<void> {
    await this.helpers.page.goto('/chat');
    await this.voiceChatContainer.waitFor({ state: 'visible' });
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    await this.voiceButton.click();
    await expect(this.recordingIndicator).toBeVisible();
    await expect(this.recordingIndicator).toHaveClass(/recording/);
  }

  /**
   * Stop voice recording
   */
  async stopRecording(): Promise<void> {
    await this.stopRecordingButton.click();
    await expect(this.recordingIndicator).not.toHaveClass(/recording/);
  }

  /**
   * Wait for transcription to complete
   */
  async waitForTranscription(timeout: number = 10000): Promise<string> {
    await this.transcriptionDisplay.waitFor({ state: 'visible', timeout });
    return await this.transcriptionDisplay.textContent() || '';
  }

  /**
   * Wait for AI response
   */
  async waitForAIResponse(timeout: number = 15000): Promise<string> {
    await this.aiMessage.last().waitFor({ state: 'visible', timeout });
    return await this.aiMessage.last().textContent() || '';
  }

  /**
   * Wait for TTS audio to start playing
   */
  async waitForAudioPlayback(timeout: number = 5000): Promise<void> {
    await this.helpers.page.waitForFunction(
      () => {
        const audioElements = document.querySelectorAll('audio');
        return Array.from(audioElements).some(audio => !audio.paused && audio.currentTime > 0);
      },
      { timeout }
    );
  }

  /**
   * Grant microphone permission
   */
  async grantMicrophonePermission(): Promise<void> {
    await this.helpers.grantMicrophonePermission();
    
    // If permission dialog appears, click allow
    try {
      await this.allowMicrophoneButton.click({ timeout: 2000 });
    } catch {
      // Permission dialog may not appear if already granted
    }
  }

  /**
   * Deny microphone permission
   */
  async denyMicrophonePermission(): Promise<void> {
    await this.helpers.denyMicrophonePermission();
    
    try {
      await this.denyMicrophoneButton.click({ timeout: 2000 });
    } catch {
      // Permission dialog may not appear
    }
  }

  /**
   * Verify voice chat is ready
   */
  async verifyVoiceChatReady(): Promise<void> {
    await expect(this.voiceChatContainer).toBeVisible();
    await expect(this.voiceButton).toBeEnabled();
    await expect(this.connectionStatus).toContainText('Ready');
  }

  /**
   * Verify recording state
   */
  async verifyRecordingState(isRecording: boolean): Promise<void> {
    if (isRecording) {
      await expect(this.recordingIndicator).toBeVisible();
      await expect(this.recordingIndicator).toHaveClass(/active/);
      await expect(this.stopRecordingButton).toBeVisible();
    } else {
      await expect(this.recordingIndicator).not.toHaveClass(/active/);
      await expect(this.voiceButton).toBeVisible();
    }
  }

  /**
   * Verify VAD (Voice Activity Detection) status
   */
  async verifyVADStatus(isActive: boolean): Promise<void> {
    if (isActive) {
      await expect(this.vadIndicator).toHaveClass(/active/);
    } else {
      await expect(this.vadIndicator).not.toHaveClass(/active/);
    }
  }

  /**
   * Verify error state
   */
  async verifyErrorState(errorType: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(errorType);
    await expect(this.retryButton).toBeVisible();
  }

  /**
   * Retry after error
   */
  async retryAfterError(): Promise<void> {
    await this.retryButton.click();
    await this.verifyVoiceChatReady();
  }

  /**
   * Adjust volume
   */
  async adjustVolume(volume: number): Promise<void> {
    await this.volumeSlider.fill(volume.toString());
  }

  /**
   * Toggle mute
   */
  async toggleMute(): Promise<void> {
    await this.muteButton.click();
  }

  /**
   * Change playback speed
   */
  async changePlaybackSpeed(speed: number): Promise<void> {
    await this.speedControl.selectOption(speed.toString());
  }

  /**
   * Open settings
   */
  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }

  /**
   * Complete voice conversation flow
   */
  async completeVoiceConversation(inputText: string): Promise<{
    transcription: string;
    aiResponse: string;
    latency: {
      transcription: number;
      aiResponse: number;
      ttsPlayback: number;
    };
  }> {
    // Simulate audio input
    await this.helpers.simulateAudioInput(inputText);
    
    // Start recording
    await this.startRecording();
    
    // Measure latency
    const latency = await this.helpers.measureVoiceLatency();
    
    // Wait for transcription
    const transcription = await this.waitForTranscription();
    
    // Stop recording
    await this.stopRecording();
    
    // Wait for AI response
    const aiResponse = await this.waitForAIResponse();
    
    // Wait for audio playback
    await this.waitForAudioPlayback();
    
    return {
      transcription,
      aiResponse,
      latency
    };
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Tab to voice button
    await this.helpers.page.keyboard.press('Tab');
    await expect(this.voiceButton).toBeFocused();
    
    // Space to start recording
    await this.helpers.page.keyboard.press('Space');
    await this.verifyRecordingState(true);
    
    // Escape to stop recording
    await this.helpers.page.keyboard.press('Escape');
    await this.verifyRecordingState(false);
  }

  /**
   * Verify accessibility features
   */
  async verifyAccessibility(): Promise<void> {
    // Check ARIA labels
    await expect(this.voiceButton).toHaveAttribute('aria-label');
    await expect(this.liveRegion).toHaveAttribute('aria-live', 'polite');
    
    // Check keyboard support
    await this.testKeyboardNavigation();
    
    // Check screen reader announcements
    await this.helpers.verifyScreenReaderAnnouncement('Voice chat ready');
  }

  /**
   * Take visual regression screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.helpers.takeVoiceUIScreenshot(name);
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(): Promise<Array<{ type: 'user' | 'ai'; text: string; timestamp: Date }>> {
    return await this.helpers.page.evaluate(() => {
      const messages = document.querySelectorAll('[data-testid="chat-message"]');
      return Array.from(messages).map(msg => ({
        type: msg.getAttribute('data-message-type') as 'user' | 'ai',
        text: msg.textContent || '',
        timestamp: new Date(msg.getAttribute('data-timestamp') || Date.now())
      }));
    });
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(): Promise<void> {
    await this.helpers.page.evaluate(() => {
      localStorage.removeItem('voice-chat-history');
      window.dispatchEvent(new Event('voice-chat-cleared'));
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.helpers.cleanupAudioResources();
  }
}

export default VoiceChatPage;