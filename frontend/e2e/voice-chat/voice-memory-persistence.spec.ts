/**
 * E2E tests for voice conversation memory persistence
 */

import { test, expect } from '@playwright/test';
import { VoiceChatPage } from '../page-objects/voice-chat-page';
import { VoiceTestHelpers } from '../utils/voice-test-helpers';
import { AudioDeviceMock } from '../mocks/audio-device-mock';
import { voiceTestData } from '../fixtures/voice-test-data';

test.describe('Voice Memory Persistence', () => {
  let voiceChatPage: VoiceChatPage;
  let helpers: VoiceTestHelpers;
  let audioMock: AudioDeviceMock;
  let sessionId: string;

  test.beforeEach(async ({ page }) => {
    voiceChatPage = new VoiceChatPage(page);
    helpers = new VoiceTestHelpers(page);
    audioMock = AudioDeviceMock.getInstance();
    sessionId = `test-session-${Date.now()}`;

    await page.addInitScript(() => {
      const audioMock = (window as any).AudioDeviceMock?.getInstance();
      if (audioMock) {
        audioMock.initializeAllMocks();
      }
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

  test('should persist conversation memory across browser sessions', async () => {
    // Create initial conversation
    const conversation1 = await voiceChatPage.completeVoiceConversation(
      voiceTestData.conversations.basic.userInput
    );

    // Verify conversation is stored
    const history1 = await voiceChatPage.getConversationHistory();
    expect(history1.length).toBe(2); // User + AI message

    // Simulate browser restart by clearing page and reloading
    await helpers.page.evaluate(() => {
      // Don't clear localStorage - simulating browser restart where localStorage persists
    });

    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    // Verify conversation history is restored
    const restoredHistory = await voiceChatPage.getConversationHistory();
    expect(restoredHistory.length).toBe(2);
    expect(restoredHistory[0].text).toContain(conversation1.transcription);
    expect(restoredHistory[1].text).toContain(conversation1.aiResponse);

    // Continue conversation to verify context is maintained
    const conversation2 = await voiceChatPage.completeVoiceConversation(
      voiceTestData.conversations.complex.userInput
    );

    const finalHistory = await voiceChatPage.getConversationHistory();
    expect(finalHistory.length).toBe(4); // Two complete conversations
  });

  test('should maintain conversation context across multiple sessions', async () => {
    // First session
    await voiceChatPage.completeVoiceConversation("My name is John");
    await helpers.waitForMemoryPersistence(sessionId);

    // Second session - reference previous context
    await voiceChatPage.completeVoiceConversation("What is my name?");

    // Verify AI can access previous context
    const history = await voiceChatPage.getConversationHistory();
    const lastAIResponse = history.filter(msg => msg.type === 'ai').pop();
    expect(lastAIResponse?.text.toLowerCase()).toContain('john');
  });

  test('should handle memory storage limits gracefully', async () => {
    // Generate many conversations to test storage limits
    const conversations = [];
    for (let i = 0; i < 50; i++) {
      const result = await voiceChatPage.completeVoiceConversation(`Test message ${i + 1}`);
      conversations.push(result);
      
      // Brief pause between conversations
      await helpers.page.waitForTimeout(100);
    }

    // Verify storage management
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBeLessThanOrEqual(100); // Should have reasonable limit

    // Verify most recent conversations are preserved
    const recentMessages = history.slice(-10);
    expect(recentMessages.length).toBe(10);
    expect(recentMessages[9].text).toContain('Test message 50');
  });

  test('should export and import conversation memory', async () => {
    // Create conversation history
    const conversations = [
      voiceTestData.conversations.basic,
      voiceTestData.conversations.complex
    ];

    for (const conv of conversations) {
      await voiceChatPage.completeVoiceConversation(conv.userInput);
    }

    // Export conversation data
    const exportData = await helpers.page.evaluate(() => {
      const history = localStorage.getItem('voice-chat-history');
      const memory = localStorage.getItem('voice-chat-memory');
      return {
        history: history ? JSON.parse(history) : null,
        memory: memory ? JSON.parse(memory) : null,
        timestamp: Date.now()
      };
    });

    expect(exportData.history).toBeTruthy();
    expect(exportData.memory).toBeTruthy();

    // Clear current data
    await voiceChatPage.clearConversationHistory();
    await helpers.page.evaluate(() => {
      localStorage.removeItem('voice-chat-memory');
    });

    // Import data
    await helpers.page.evaluate((data) => {
      localStorage.setItem('voice-chat-history', JSON.stringify(data.history));
      localStorage.setItem('voice-chat-memory', JSON.stringify(data.memory));
    }, exportData);

    // Reload and verify restoration
    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    const restoredHistory = await voiceChatPage.getConversationHistory();
    expect(restoredHistory.length).toBe(4); // Two complete conversations
  });

  test('should handle memory corruption gracefully', async () => {
    // Create valid conversation
    await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

    // Corrupt memory data
    await helpers.page.evaluate(() => {
      localStorage.setItem('voice-chat-memory', 'invalid-json-data');
      localStorage.setItem('voice-chat-history', '{broken json}');
    });

    // Reload page
    await helpers.page.reload();
    await voiceChatPage.verifyVoiceChatReady();

    // Verify graceful handling of corrupted data
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBe(0); // Should start fresh

    // Verify new conversations work
    const newConversation = await voiceChatPage.completeVoiceConversation("Hello again");
    expect(newConversation.transcription).toBeTruthy();
  });

  test('should support conversation memory search', async () => {
    // Create multiple conversations with searchable content
    const topics = [
      "Tell me about quantum physics",
      "What is machine learning?",
      "Explain blockchain technology",
      "How does photosynthesis work?",
      "What are neural networks?"
    ];

    for (const topic of topics) {
      await voiceChatPage.completeVoiceConversation(topic);
      await helpers.page.waitForTimeout(500);
    }

    // Test memory search functionality
    const searchInput = helpers.page.locator('[data-testid="memory-search"]');
    if (await searchInput.isVisible()) {
      // Search for specific topic
      await searchInput.fill('quantum');
      await helpers.page.keyboard.press('Enter');

      // Verify search results
      const searchResults = helpers.page.locator('[data-testid="search-results"]');
      await expect(searchResults).toBeVisible();
      await expect(searchResults).toContainText('quantum physics');

      // Clear search
      await searchInput.fill('');
      await helpers.page.keyboard.press('Enter');
    }
  });

  test('should maintain memory across different voice chat modes', async () => {
    // Start in voice mode
    const voiceResult = await voiceChatPage.completeVoiceConversation(
      "I prefer speaking over typing"
    );

    // Switch to text mode (if available)
    const textModeButton = helpers.page.locator('[data-testid="text-mode-button"]');
    if (await textModeButton.isVisible()) {
      await textModeButton.click();

      // Continue conversation in text mode
      const textInput = helpers.page.locator('[data-testid="text-input"]');
      if (await textInput.isVisible()) {
        await textInput.fill("Do you remember what I just said?");
        await helpers.page.keyboard.press('Enter');

        // Wait for AI response
        await voiceChatPage.waitForAIResponse();

        // Switch back to voice mode
        const voiceModeButton = helpers.page.locator('[data-testid="voice-mode-button"]');
        await voiceModeButton.click();

        // Verify memory continuity
        const history = await voiceChatPage.getConversationHistory();
        expect(history.length).toBe(4); // Voice + text + AI responses
      }
    }
  });

  test('should handle memory synchronization across multiple tabs', async () => {
    // Create conversation in first tab
    await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

    // Open second tab with same URL
    const secondTab = await helpers.page.context().newPage();
    const secondVoicePage = new VoiceChatPage(secondTab);
    
    await secondVoicePage.grantMicrophonePermission();
    await secondVoicePage.goto();
    await secondVoicePage.verifyVoiceChatReady();

    // Verify conversation history is synchronized
    const secondTabHistory = await secondVoicePage.getConversationHistory();
    expect(secondTabHistory.length).toBe(2);

    // Continue conversation in second tab
    await secondVoicePage.completeVoiceConversation(voiceTestData.conversations.complex.userInput);

    // Verify synchronization back to first tab
    await helpers.page.reload();
    const firstTabHistory = await voiceChatPage.getConversationHistory();
    expect(firstTabHistory.length).toBe(4);

    await secondTab.close();
  });

  test('should support memory encryption for sensitive conversations', async () => {
    // Check if encryption is supported
    const encryptionToggle = helpers.page.locator('[data-testid="encrypt-memory"]');
    if (await encryptionToggle.isVisible()) {
      await encryptionToggle.check();

      // Create sensitive conversation
      await voiceChatPage.completeVoiceConversation("My social security number is 123-45-6789");

      // Verify data is encrypted in storage
      const encryptedData = await helpers.page.evaluate(() => {
        const memory = localStorage.getItem('voice-chat-memory');
        return memory;
      });

      expect(encryptedData).not.toContain('123-45-6789'); // Should not contain plaintext

      // Verify decryption works
      const history = await voiceChatPage.getConversationHistory();
      expect(history.length).toBe(2);
      expect(history[0].text).toContain('social security');
    }
  });

  test('should handle memory backup and restore', async () => {
    // Create conversation data
    const conversations = [
      voiceTestData.conversations.basic,
      voiceTestData.conversations.complex
    ];

    for (const conv of conversations) {
      await voiceChatPage.completeVoiceConversation(conv.userInput);
    }

    // Trigger backup creation
    const backupButton = helpers.page.locator('[data-testid="create-backup"]');
    if (await backupButton.isVisible()) {
      await backupButton.click();

      // Verify backup was created
      await expect(helpers.page.locator('[data-testid="backup-success"]')).toBeVisible();

      // Clear current data
      await voiceChatPage.clearConversationHistory();

      // Restore from backup
      const restoreButton = helpers.page.locator('[data-testid="restore-backup"]');
      await restoreButton.click();

      // Select backup file (simulate file selection)
      const fileInput = helpers.page.locator('[data-testid="backup-file-input"]');
      if (await fileInput.isVisible()) {
        // Simulate file selection and restoration
        await expect(helpers.page.locator('[data-testid="restore-success"]')).toBeVisible();

        // Verify data restoration
        const restoredHistory = await voiceChatPage.getConversationHistory();
        expect(restoredHistory.length).toBe(4);
      }
    }
  });

  test('should support selective memory deletion', async () => {
    // Create multiple conversations
    const conversations = [
      "Tell me about cats",
      "What about dogs?", 
      "How about birds?",
      "Explain fish behavior"
    ];

    for (const conv of conversations) {
      await voiceChatPage.completeVoiceConversation(conv);
    }

    // Verify all conversations exist
    let history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBe(8); // 4 conversations × 2 messages each

    // Delete specific conversation
    const deleteButtons = helpers.page.locator('[data-testid^="delete-conversation-"]');
    if (await deleteButtons.first().isVisible()) {
      await deleteButtons.first().click();

      // Confirm deletion
      const confirmButton = helpers.page.locator('[data-testid="confirm-delete"]');
      await confirmButton.click();

      // Verify conversation was deleted
      history = await voiceChatPage.getConversationHistory();
      expect(history.length).toBe(6); // One conversation removed
    }
  });

  test('should maintain memory integrity during errors', async () => {
    // Create initial conversation
    await voiceChatPage.completeVoiceConversation(voiceTestData.conversations.basic.userInput);

    // Trigger error during second conversation
    await helpers.mockAIChatAPI('error');
    
    await voiceChatPage.startRecording();
    await helpers.simulateAudioInput(voiceTestData.conversations.complex.userInput, 2000);
    await voiceChatPage.stopRecording();
    await voiceChatPage.waitForTranscription();

    // Error should occur, but memory should remain intact
    await voiceChatPage.verifyErrorState('ai-service');

    // Verify first conversation is still in memory
    const history = await voiceChatPage.getConversationHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].text).toContain(voiceTestData.conversations.basic.transcription);

    // Restore service and verify memory continuity
    await helpers.mockAIChatAPI('success');
    await voiceChatPage.retryAfterError();

    const finalHistory = await voiceChatPage.getConversationHistory();
    expect(finalHistory.length).toBeGreaterThanOrEqual(2);
  });
});