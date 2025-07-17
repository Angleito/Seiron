# Voice Chat E2E Testing Suite

This comprehensive testing suite covers all critical voice chat functionality including conversation flows, permissions, voice activity detection, error recovery, memory persistence, and mobile compatibility.

## 🎯 Test Coverage

### Core Test Files

1. **`voice-chat-flow.spec.ts`** - Complete voice conversation workflows
   - Basic voice conversation flow (speak → transcribe → AI response → TTS playback)
   - Multi-turn conversations with context
   - Voice activity detection during conversations
   - Audio playback controls (volume, mute, speed)
   - Keyboard shortcuts and accessibility
   - Conversation state persistence across refreshes
   - Real-time transcription display
   - Performance latency measurements

2. **`voice-permissions.spec.ts`** - Microphone permission handling
   - Permission grant/deny scenarios
   - Clear permission request messaging
   - Permission retry after initial denial
   - Permission persistence across page reloads
   - Permission revocation during active sessions
   - Accessibility support for permission dialogs
   - Browser-specific permission instructions
   - Multiple permission request handling
   - Fallback options when microphone unavailable
   - Device switching and selection

3. **`voice-activity-detection.spec.ts`** - VAD testing with simulated audio
   - Voice detection with normal speech levels
   - Background noise filtering
   - Quiet speech detection
   - Loud speech handling without clipping
   - VAD responsiveness across audio levels
   - Visual VAD feedback to users
   - VAD response latency measurements
   - Continuous speech pattern handling
   - VAD configuration options
   - Mobile microphone type handling
   - Accessibility announcements for VAD
   - VAD calibration procedures
   - Noisy environment handling

4. **`voice-error-recovery.spec.ts`** - Error scenarios and recovery
   - Network failures during transcription
   - Audio device disconnection
   - ElevenLabs API failures
   - Speech recognition service failures
   - AI service unavailability
   - Partial conversation failures
   - Retry with exponential backoff
   - Browser tab visibility changes during recording
   - Microphone permission revocation during use
   - Multiple simultaneous errors
   - Detailed error information for debugging
   - Error state persistence across refreshes
   - Offline mode capabilities

5. **`voice-memory-persistence.spec.ts`** - Conversation memory testing
   - Memory persistence across browser sessions
   - Conversation context maintenance across sessions
   - Memory storage limits handling
   - Conversation export and import
   - Memory corruption graceful handling
   - Conversation memory search functionality
   - Memory across different voice chat modes
   - Memory synchronization across multiple tabs
   - Memory encryption for sensitive conversations
   - Memory backup and restore
   - Selective memory deletion
   - Memory integrity during errors

6. **`voice-mobile.spec.ts`** - Mobile device voice testing
   - Mobile-optimized interface display
   - Touch interactions for voice control
   - Complete voice conversations on mobile
   - Orientation change handling
   - Mobile browser audio limitations
   - Mobile-specific voice UI feedback
   - Mobile keyboard interactions
   - Mobile accessibility features
   - Mobile network conditions
   - Battery and performance optimization
   - Pull-to-refresh support
   - Mobile app-like features
   - Voice quality on mobile networks
   - Cross-mobile browser compatibility

### Supporting Infrastructure

- **`voice-test-data.ts`** - Comprehensive test data and fixtures
- **`voice-test-helpers.ts`** - Helper utilities for voice testing
- **`audio-device-mock.ts`** - Mock audio devices for testing
- **`voice-chat-page.ts`** - Page object for voice chat interface

## 🚀 Running Tests

### Local Development

```bash
# Run all voice chat tests
npm run test:voice

# Run specific test suite
npx playwright test e2e/voice-chat/voice-chat-flow.spec.ts

# Run with specific browser
npx playwright test e2e/voice-chat/ --project=voice-chat-chrome

# Run mobile tests
npx playwright test e2e/voice-chat/voice-mobile.spec.ts --project=voice-mobile-iPhone

# Run with custom script
./scripts/run-voice-tests.sh
```

### Custom Test Configuration

Set environment variables to control test execution:

```bash
# Run only basic flow tests
RUN_BASIC=true RUN_PERMISSIONS=false ./scripts/run-voice-tests.sh

# Run cross-browser tests
RUN_CROSS_BROWSER=true ./scripts/run-voice-tests.sh

# Run performance tests
RUN_PERFORMANCE=true ./scripts/run-voice-tests.sh
```

### Docker Testing

```bash
# Build and run voice tests in Docker
docker-compose -f docker/docker-compose.voice-tests.yml up --build

# Run specific test configuration
docker-compose -f docker/docker-compose.voice-tests.yml run \
  -e RUN_BASIC=true -e RUN_MOBILE=false voice-tests
```

## 🎵 Audio Testing Setup

### Browser Configuration

The tests automatically configure browsers with fake audio devices:

- **Chrome**: `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`
- **Firefox**: Custom audio device configuration
- **Safari**: WebKit audio testing setup

### Mock Audio Devices

The `AudioDeviceMock` class provides:
- Simulated microphone input
- Mock MediaRecorder API
- Web Audio API simulation
- Speech Recognition API mocking
- Device error simulation

### Audio Simulation

Tests simulate various audio scenarios:
- Different voice activity levels
- Background noise patterns
- Device disconnections
- Network audio compression
- Mobile device constraints

## 📱 Mobile Testing

### Supported Devices

- iPhone 13 (iOS Safari)
- Galaxy S8 (Android Chrome)
- iPad Air (iPadOS Safari)

### Mobile-Specific Tests

- Touch interaction patterns
- Orientation change handling
- Mobile browser limitations
- Network condition simulation
- Battery optimization
- Responsive design validation

## 🔧 Test Configuration

### Playwright Configuration

Voice chat tests use specialized Playwright projects:

```typescript
{
  name: 'voice-chat-chrome',
  use: { 
    ...devices['Desktop Chrome'],
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream']
    }
  },
  testMatch: '**/voice-chat/*.spec.ts',
}
```

### Performance Thresholds

Default performance expectations:

```typescript
performanceThresholds: {
  voiceLatency: {
    transcription: 2000, // 2 seconds max
    aiResponse: 5000,    // 5 seconds max
    ttsPlayback: 1000    // 1 second max
  },
  audioProcessing: {
    vadResponse: 100,    // 100ms max
    recordingStart: 500, // 500ms max
    playbackStart: 300   // 300ms max
  }
}
```

## 🐛 Debugging Tests

### Common Issues

1. **Microphone Permission Denied**
   - Check browser permission settings
   - Verify test configuration grants permissions
   - Use headless: false for debugging

2. **Audio Device Not Found**
   - Ensure AudioDeviceMock is properly initialized
   - Check browser audio device simulation flags

3. **API Timeouts**
   - Verify mock API servers are running
   - Check network simulation settings
   - Increase timeout values for slow environments

4. **Mobile Test Failures**
   - Verify device emulation settings
   - Check touch event simulation
   - Review viewport size configuration

### Debug Mode

Run tests with debugging enabled:

```bash
# Run with browser visible
npx playwright test e2e/voice-chat/ --headed

# Debug specific test
npx playwright test e2e/voice-chat/voice-chat-flow.spec.ts --debug

# Generate trace files
npx playwright test e2e/voice-chat/ --trace=on
```

### Screenshots and Videos

Tests automatically capture:
- Screenshots on failure
- Video recordings of failed tests
- Visual regression screenshots
- Step-by-step trace files

## 📊 Test Reports

### HTML Reports

```bash
# Generate and view HTML report
npx playwright show-report
```

### CI/CD Integration

The test suite provides:
- JUnit XML output for CI systems
- JSON reports for automation
- Performance metrics tracking
- Coverage reports for voice features

## 🔒 Security Considerations

### Test Data

- No real user data in tests
- Encrypted sensitive test scenarios
- Secure mock API configurations
- Isolated test environments

### Audio Privacy

- Mock audio devices prevent real microphone access
- Simulated audio data only
- No audio recording persistence
- Secure test data cleanup

## 🌐 Cross-Browser Support

### Desktop Browsers

- ✅ Chrome (Chromium)
- ✅ Firefox
- ✅ Safari (WebKit)

### Mobile Browsers

- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)
- ✅ Samsung Internet

### Known Limitations

- Some mobile browsers may have reduced Web Audio API support
- Safari requires user gesture for audio playback
- Firefox mobile may have different VAD behavior

## 📚 Test Patterns

### Page Object Model

All tests use the `VoiceChatPage` page object for:
- Consistent element interactions
- Reusable test methods
- Maintainable test code
- Cross-test reliability

### Helper Utilities

The `VoiceTestHelpers` class provides:
- Audio simulation methods
- Network condition simulation
- Performance measurement utilities
- Accessibility testing helpers

### Mock Infrastructure

Comprehensive mocking for:
- Audio device APIs
- Speech recognition services
- Text-to-speech services
- AI chat APIs
- Network conditions

## 🎯 Future Enhancements

### Planned Additions

1. **Advanced Audio Testing**
   - Real audio file processing
   - Audio quality metrics
   - Noise cancellation testing

2. **AI Integration Testing**
   - Conversation context accuracy
   - Response quality metrics
   - Multi-language support

3. **Performance Monitoring**
   - Real-time latency tracking
   - Memory usage monitoring
   - Battery impact measurement

4. **Accessibility Expansion**
   - Screen reader compatibility
   - Voice command navigation
   - High contrast mode testing

This testing suite ensures comprehensive coverage of all voice chat functionality while providing reliable, maintainable, and scalable test automation for the Seiron project.