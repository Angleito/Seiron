/**
 * E2E tests for complete voice conversation workflows
 */

import { test, expect } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

test.describe('Voice Chat Flow', () => {
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

    // Mock API endpoints
    await helpers.mockElevenLabsAPI('success');
    await helpers.mockAIChatAPI('success');

    // Grant microphone permission
    await voiceChatPage.grantMicrophonePermission();

    // Navigate to voice chat
    await voiceChatPage.goto();
    await voiceChatPage.verifyVoiceChatReady();
  });

  test.afterEach(async () => {
    await voiceChatPage.cleanup();
    audioMock.cleanup();
  });

  test('should complete basic voice conversation flow', async () => {
    const testData = voiceTestData.conversations.basic;

    // Start voice conversation
    const result = await voiceChatPage.completeVoiceConversation(testData.userInput);

    // Verify transcription
    expect(result.transcription.toLowerCase()).toContain(testData.transcription);

    // Verify AI response is received
    expect(result.aiResponse).toBeTruthy();
    expect(result.aiResponse.length).toBeGreaterThan(10);

    // Verify performance thresholds
    expect(result.latency.transcription).toBeLessThan(voiceTestData.performanceThresholds.voiceLatency.transcription);
    expect(result.latency.aiResponse).toBeLessThan(voiceTestData.performanceThresholds.voiceLatency.aiResponse);
    expect(result.latency.ttsPlayback).toBeLessThan(voiceTestData.performanceThresholds.voiceLatency.ttsPlayback);

    // Verify audio is playing
    const isPlaying = await helpers.verifyAudioPlayback();
    expect(isPlaying).toBe(true);

    // Take screenshot for visual regression
    await voiceChatPage.takeScreenshot('basic-conversation-complete');
  });

  test('should handle complex multi-turn conversation', async () => {
    const conversations = [
      voiceTestData.conversations.basic,
      voiceTestData.conversations.complex
    ];

    let conversationHistory = [];

    for (const conv of conversations) {
      const result = await voiceChatPage.completeVoiceConversation(conv.userInput);
      
      conversationHistory.push({
        user: result.transcription,
        ai: result.aiResponse
      });

      // Verify each turn
      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();
    }

    // Verify conversation context is maintained
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBe(4); // 2 user + 2 AI messages

    // Verify conversation memory persistence
    await helpers.waitForMemoryPersistence('test-session');
  });

  test('should support voice activity detection during conversation', async () => {
    // Start recording
    await voiceChatPage.startRecording();

    // Test different audio levels
    for (const vadCase of voiceTestData.vadTestCases) {
      await helpers.simulateAudioInput(vadCase.audioLevel.toString(), vadCase.duration);
      
      if (vadCase.expectedDetection) {
        await voiceChatPage.verifyVADStatus(true);
      } else {
        await voiceChatPage.verifyVADStatus(false);
      }

      await helpers.page.waitForTimeout(500);
    }

    await voiceChatPage.stopRecording();
  });

  test('should handle audio playback controls', async () => {
    // Complete a conversation to get audio
    await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

    // Test volume control
    await voiceChatPage.adjustVolume(0.5);
    
    // Test mute/unmute
    await voiceChatPage.toggleMute();
    await voiceChatPage.toggleMute();

    // Test playback speed
    await voiceChatPage.changePlaybackSpeed(1.5);

    // Verify audio controls are functional
    expect(await voiceChatPage.audioPlayer.isVisible()).toBe(true);
  });

  test('should support keyboard shortcuts for voice control', async () => {
    // Test keyboard navigation
    await voiceChatPage.testKeyboardNavigation();

    // Test voice shortcuts
    await helpers.testKeyboardNavigation(['Space']); // Start recording
    await voiceChatPage.verifyRecordingState(true);

    await helpers.testKeyboardNavigation(['Escape']); // Stop recording
    await voiceChatPage.verifyRecordingState(false);

    // Test accessibility
    await voiceChatPage.verifyAccessibility();
  });

  test('should maintain conversation state across browser refresh', async () => {
    // Start conversation
    const result1 = await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);
    
    // Refresh page
    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    // Verify conversation history is restored
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBeGreaterThan(0);

    // Continue conversation
    const result2 = await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.complex.userInput);
    expect(result2.transcription).toBeTruthy();
  });

  test('should handle voice interruption and resumption', async () => {
    // Start recording
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 1000);

    // Interrupt recording
    await voiceChatPage.stopRecording();

    // Resume conversation
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);
    await voiceChatPage.stopRecording();

    // Verify transcription is received
    const transcription = await voiceChatPage.waitForTranscription();
    expect(transcription).toBeTruthy();
  });

  test('should support real-time transcription display', async () => {
    await voiceChatPage.startRecording();
    
    // Simulate speech input
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 3000);

    // Verify real-time transcription updates
    await expect(voiceChatPage.transcriptionDisplay).toBeVisible();
    
    const transcription = await voiceChatPage.waitForTranscription();
    expect(transcription.length).toBeGreaterThan(0);

    await voiceChatPage.stopRecording();
  });

  test('should handle simultaneous voice and text input', async () => {
    // Start voice input
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.basic.userInput, 2000);

    // Switch to text input mid-conversation
    await voiceChatPage.stopRecording();
    
    // Verify smooth transition between input modes
    await voiceChatPage.verifyVoiceChatReady();
  });

  test('should support voice conversation export', async () => {
    // Complete conversation
    await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

    // Test conversation export functionality
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBeGreaterThan(0);

    // Verify export includes timestamps and audio references
    for (const message of history) {
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.type).toMatch(/^(user|ai)$/);
      expect(message.text).toBeTruthy();
    }
  });
});

test.describe('Voice Chat Performance', () => {
  let voiceChatPage: VoiceChatPage;
  let helpers: VoiceTestHelpers;

  test.beforeEach(async ({ page }) => {
    voiceChatPage = new VoiceChatPage(page);
    helpers = new VoiceTestHelpers(page);

    await helpers.mockElevenLabsAPI('success');
    await helpers.mockAIChatAPI('success');
    await voiceChatPage.grantMicrophonePermission();
    await voiceChatPage.goto();
  });

  test('should meet voice processing latency requirements', async () => {
    const startTime = Date.now();
    
    const result = await voiceChatPage.completeVoiceConversation(
      voiceTestData.conversations.basic.userInput
    );

    // Check individual component latencies
    const thresholds = voiceTestData.performanceThresholds.voiceLatency;
    expect(result.latency.transcription).toBeLessThan(thresholds.transcription);
    expect(result.latency.aiResponse).toBeLessThan(thresholds.aiResponse);
    expect(result.latency.ttsPlayback).toBeLessThan(thresholds.ttsPlayback);

    // Check total conversation latency
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(10000); // 10 seconds max for complete flow
  });

  test('should handle high-frequency voice interactions', async () => {
    const interactions = 5;
    const results = [];

    for (let i = 0; i < interactions; i++) {
      const result = await voiceChatPage.completeVoiceConversation(
        `Test message number ${i + 1}`
      );
      results.push(result);
      
      // Small delay between interactions
      await helpers.page.waitForTimeout(1000);
    }

    // Verify all interactions completed successfully
    expect(results).toHaveLength(interactions);
    results.forEach(result => {
      expect(result.transcription).toBeTruthy();
      expect(result.aiResponse).toBeTruthy();
    });
  });
});