import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../useAudioRecorder';

// Mock the AudioRecorder class
const mockRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getState: jest.fn(),
  checkPermissions: jest.fn(),
  getVisualizationData: jest.fn(),
};

jest.mock('../../lib/audio-recorder', () => ({
  AudioRecorder: jest.fn(() => mockRecorder),
}));

import { AudioRecorder } from '../../lib/audio-recorder';

describe('useAudioRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.getState.mockReturnValue('inactive');
    mockRecorder.checkPermissions.mockResolvedValue('granted');
    mockRecorder.start.mockResolvedValue(undefined);
    mockRecorder.stop.mockResolvedValue(new Blob(['test'], { type: 'audio/webm' }));
    mockRecorder.getVisualizationData.mockReturnValue({
      level: 0.5,
      frequency: new Float32Array(1024),
      waveform: new Float32Array(1024),
    });
  });

  describe('Initial State', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAudioRecorder());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.recordingState).toBe('inactive');
      expect(result.current.audioLevel).toBe(0);
      expect(result.current.isVoiceActive).toBe(false);
      expect(result.current.visualizationData).toBeNull();
      expect(result.current.recordingDuration).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.permissionStatus).toBeNull();
    });

    test('should report browser support correctly', () => {
      // Mock browser support
      Object.defineProperty(AudioRecorder, 'isSupported', {
        value: jest.fn(() => true),
      });

      const { result } = renderHook(() => useAudioRecorder());
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('Recording Controls', () => {
    test('should start recording successfully', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      expect(mockRecorder.start).toHaveBeenCalled();
      expect(result.current.isRecording).toBe(true);
    });

    test('should stop recording and return blob', async () => {
      const onRecordingComplete = jest.fn();
      const { result } = renderHook(() => useAudioRecorder({ onRecordingComplete }));

      // Start recording first
      await act(async () => {
        await result.current.start();
      });

      // Stop recording
      let blob: Blob | null = null;
      await act(async () => {
        blob = await result.current.stop();
      });

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
      expect(onRecordingComplete).toHaveBeenCalledWith(blob);
      expect(result.current.isRecording).toBe(false);
    });

    test('should pause recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.pause();
      });

      expect(mockRecorder.pause).toHaveBeenCalled();
    });

    test('should resume recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.resume();
      });

      expect(mockRecorder.resume).toHaveBeenCalled();
    });

    test('should return null when stopping without recording', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      let blob: Blob | null = null;
      await act(async () => {
        blob = await result.current.stop();
      });

      expect(blob).toBeNull();
    });
  });

  describe('Permission Management', () => {
    test('should check permissions', async () => {
      const { result } = renderHook(() => useAudioRecorder());

      let permission: PermissionState = 'prompt';
      await act(async () => {
        permission = await result.current.checkPermissions();
      });

      expect(mockRecorder.checkPermissions).toHaveBeenCalled();
      expect(permission).toBe('granted');
      expect(result.current.permissionStatus).toBe('granted');
    });
  });

  describe('Error Handling', () => {
    test('should handle recording start errors', async () => {
      const error = new Error('Permission denied');
      mockRecorder.start.mockRejectedValue(error);

      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        try {
          await result.current.start();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.isRecording).toBe(false);
    });

    test('should handle recording stop errors', async () => {
      const error = new Error('Stop failed');
      mockRecorder.stop.mockRejectedValue(error);

      const { result } = renderHook(() => useAudioRecorder());

      // Start recording first
      await act(async () => {
        await result.current.start();
      });

      // Try to stop and handle error
      await act(async () => {
        try {
          await result.current.stop();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);
    });

    test('should clear errors', async () => {
      const error = new Error('Test error');
      mockRecorder.start.mockRejectedValue(error);

      const { result } = renderHook(() => useAudioRecorder());

      // Trigger an error
      await act(async () => {
        try {
          await result.current.start();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    test('should handle onError callback from recorder', () => {
      const error = new Error('Recorder error');
      let onErrorCallback: ((error: Error) => void) | undefined;

      // Capture the onError callback passed to AudioRecorder
      (AudioRecorder as jest.Mock).mockImplementation((options) => {
        onErrorCallback = options?.onError;
        return mockRecorder;
      });

      const { result } = renderHook(() => useAudioRecorder());

      // Simulate error from recorder
      act(() => {
        if (onErrorCallback) {
          onErrorCallback(error);
        }
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingState).toBe('inactive');
    });
  });

  describe('Audio Data and Visualization', () => {
    test('should update audio level', () => {
      let onAudioLevelCallback: ((level: number) => void) | undefined;

      (AudioRecorder as jest.Mock).mockImplementation((options) => {
        onAudioLevelCallback = options?.onAudioLevel;
        return mockRecorder;
      });

      const { result } = renderHook(() => useAudioRecorder());

      // Simulate audio level update
      act(() => {
        if (onAudioLevelCallback) {
          onAudioLevelCallback(0.75);
        }
      });

      expect(result.current.audioLevel).toBe(0.75);
    });

    test('should update voice activity', () => {
      let onVoiceActivityCallback: ((isActive: boolean) => void) | undefined;

      (AudioRecorder as jest.Mock).mockImplementation((options) => {
        onVoiceActivityCallback = options?.onVoiceActivity;
        return mockRecorder;
      });

      const { result } = renderHook(() => useAudioRecorder());

      // Simulate voice activity
      act(() => {
        if (onVoiceActivityCallback) {
          onVoiceActivityCallback(true);
        }
      });

      expect(result.current.isVoiceActive).toBe(true);
    });

    test('should track recording duration', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000); // 1 second
      });

      expect(result.current.recordingDuration).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    test('should update visualization data when recording', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      // Fast-forward to trigger visualization update
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(result.current.visualizationData).toBeTruthy();
      expect(result.current.visualizationData?.level).toBe(0.5);

      jest.useRealTimers();
    });
  });

  describe('State Management', () => {
    test('should compute isPaused correctly', () => {
      mockRecorder.getState.mockReturnValue('paused');

      const { result } = renderHook(() => useAudioRecorder());

      expect(result.current.isPaused).toBe(true);
    });

    test('should update recording state periodically', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      // Change recorder state
      mockRecorder.getState.mockReturnValue('recording');

      // Fast-forward to trigger state update
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.recordingState).toBe('recording');

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioRecorder());

      await act(async () => {
        await result.current.start();
      });

      unmount();

      // Should attempt to stop recording on cleanup
      expect(mockRecorder.stop).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    test('should call custom callbacks', () => {
      const onDataAvailable = jest.fn();
      const onVoiceActivity = jest.fn();
      const onAudioLevel = jest.fn();
      const onError = jest.fn();

      let callbacks: any = {};

      (AudioRecorder as jest.Mock).mockImplementation((options) => {
        callbacks = options;
        return mockRecorder;
      });

      renderHook(() => useAudioRecorder({
        onDataAvailable,
        onVoiceActivity,
        onAudioLevel,
        onError,
      }));

      // Test callbacks
      const testBlob = new Blob(['test']);
      callbacks.onDataAvailable?.(testBlob);
      callbacks.onVoiceActivity?.(true);
      callbacks.onAudioLevel?.(0.8);
      callbacks.onError?.(new Error('test'));

      expect(onDataAvailable).toHaveBeenCalledWith(testBlob);
      expect(onVoiceActivity).toHaveBeenCalledWith(true);
      expect(onAudioLevel).toHaveBeenCalledWith(0.8);
      expect(onError).toHaveBeenCalledWith(new Error('test'));
    });
  });
});