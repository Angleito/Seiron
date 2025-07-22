/**
 * Streaming Response Integration Tests
 * Tests server-sent events (SSE) and streaming functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import EventSource from 'eventsource';

describe('Streaming Response Integration Tests', () => {
  let apiClient: AxiosInstance;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  
  beforeAll(() => {
    apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  describe('Chat Streaming', () => {
    it('should stream chat responses using SSE', (done) => {
      const chunks: string[] = [];
      let eventSource: EventSource;

      apiClient.post('/chat', {
        message: 'Tell me about the history of blockchain technology',
        sessionId: 'streaming-test-1',
        stream: true,
      }, {
        responseType: 'stream',
      }).then(response => {
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/event-stream');
        expect(response.headers['cache-control']).toContain('no-cache');

        let buffer = '';
        
        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer
          
          messages.forEach(message => {
            if (message.trim()) {
              chunks.push(message);
              
              // Parse SSE data
              if (message.startsWith('data: ')) {
                const data = message.substring(6);
                
                if (data === '[DONE]') {
                  // Stream completed
                  expect(chunks.length).toBeGreaterThan(2); // At least some content + done
                  done();
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    
                    if (parsed.type === 'content') {
                      expect(parsed.content).toBeTruthy();
                      expect(typeof parsed.content).toBe('string');
                    } else if (parsed.type === 'done') {
                      expect(parsed.sessionId).toBe('streaming-test-1');
                      expect(parsed.timestamp).toBeTruthy();
                    }
                  } catch (e) {
                    // Ignore parse errors for incomplete chunks
                  }
                }
              }
            }
          });
        });

        response.data.on('error', (error: Error) => {
          done(error);
        });

        response.data.on('end', () => {
          if (!chunks.some(c => c.includes('[DONE]'))) {
            done(new Error('Stream ended without [DONE] marker'));
          }
        });
      }).catch(done);
    });

    it('should handle stream interruption gracefully', (done) => {
      let connectionClosed = false;

      apiClient.post('/chat', {
        message: 'Explain quantum computing',
        sessionId: 'interrupt-test',
        stream: true,
      }, {
        responseType: 'stream',
      }).then(response => {
        let chunkCount = 0;

        response.data.on('data', (chunk: Buffer) => {
          chunkCount++;
          
          // Simulate interruption after receiving some data
          if (chunkCount === 3) {
            response.data.destroy();
            connectionClosed = true;
          }
        });

        response.data.on('close', () => {
          expect(connectionClosed).toBe(true);
          expect(chunkCount).toBeGreaterThanOrEqual(3);
          done();
        });

        response.data.on('error', () => {
          // Expected when we destroy the stream
          if (connectionClosed) {
            done();
          }
        });
      }).catch(done);
    });

    it('should stream with proper SSE format', (done) => {
      const events: Array<{ event?: string; data: string }> = [];

      apiClient.post('/chat', {
        message: 'What is Web3?',
        sessionId: 'sse-format-test',
        stream: true,
      }, {
        responseType: 'stream',
      }).then(response => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent: { event?: string; data?: string } = {};

          lines.forEach(line => {
            if (line.startsWith('event: ')) {
              currentEvent.event = line.substring(7);
            } else if (line.startsWith('data: ')) {
              currentEvent.data = line.substring(6);
              if (currentEvent.data) {
                events.push({ ...currentEvent } as any);
                currentEvent = {};
              }
            }
          });

          // Check for completion
          if (events.some(e => e.data === '[DONE]')) {
            // Verify SSE format
            events.forEach(event => {
              expect(event.data).toBeTruthy();
              
              if (event.data !== '[DONE]') {
                // Should be valid JSON
                expect(() => JSON.parse(event.data)).not.toThrow();
              }
            });

            done();
          }
        });

        response.data.on('error', done);
      }).catch(done);
    });
  });

  describe('Streaming Performance', () => {
    it('should start streaming quickly', (done) => {
      const startTime = Date.now();
      let firstChunkTime: number;

      apiClient.post('/chat', {
        message: 'Hi',
        sessionId: 'performance-test',
        stream: true,
      }, {
        responseType: 'stream',
      }).then(response => {
        response.data.once('data', () => {
          firstChunkTime = Date.now() - startTime;
          expect(firstChunkTime).toBeLessThan(2000); // First chunk within 2 seconds
          console.log(`First chunk received in: ${firstChunkTime}ms`);
          
          response.data.destroy();
          done();
        });

        response.data.on('error', () => {
          // Ignore error from destroying stream
        });
      }).catch(done);
    });

    it('should maintain consistent streaming rate', (done) => {
      const chunkTimes: number[] = [];
      let lastChunkTime = Date.now();

      apiClient.post('/chat', {
        message: 'Explain the benefits of decentralized finance in detail',
        sessionId: 'rate-test',
        stream: true,
      }, {
        responseType: 'stream',
      }).then(response => {
        response.data.on('data', (chunk: Buffer) => {
          const now = Date.now();
          const timeSinceLastChunk = now - lastChunkTime;
          
          if (chunkTimes.length > 0) { // Skip first chunk
            chunkTimes.push(timeSinceLastChunk);
          }
          
          lastChunkTime = now;

          if (chunk.toString().includes('[DONE]')) {
            // Analyze chunk timing
            if (chunkTimes.length > 0) {
              const avgTime = chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length;
              const maxTime = Math.max(...chunkTimes);
              
              console.log(`Streaming metrics:`);
              console.log(`  Chunks received: ${chunkTimes.length}`);
              console.log(`  Avg time between chunks: ${Math.round(avgTime)}ms`);
              console.log(`  Max time between chunks: ${maxTime}ms`);
              
              // Most chunks should arrive within reasonable time
              expect(avgTime).toBeLessThan(500);
              expect(maxTime).toBeLessThan(2000);
            }
            
            done();
          }
        });

        response.data.on('error', done);
      }).catch(done);
    });
  });

  describe('Concurrent Streaming', () => {
    it('should handle multiple concurrent streams', (done) => {
      const streams = 3;
      let completedStreams = 0;
      const streamData: Record<number, string[]> = {};

      const promises = Array(streams).fill(null).map((_, index) => {
        streamData[index] = [];

        return apiClient.post('/chat', {
          message: `Stream ${index}: What is DeFi?`,
          sessionId: `concurrent-stream-${index}`,
          stream: true,
        }, {
          responseType: 'stream',
        }).then(response => {
          return new Promise((resolve, reject) => {
            response.data.on('data', (chunk: Buffer) => {
              streamData[index].push(chunk.toString());
              
              if (chunk.toString().includes('[DONE]')) {
                completedStreams++;
                
                if (completedStreams === streams) {
                  // All streams completed
                  Object.entries(streamData).forEach(([idx, chunks]) => {
                    expect(chunks.length).toBeGreaterThan(0);
                    expect(chunks.some(c => c.includes('[DONE]'))).toBe(true);
                  });
                  
                  done();
                }
                
                resolve(true);
              }
            });

            response.data.on('error', reject);
          });
        });
      });

      Promise.all(promises).catch(done);
    });
  });

  describe('Error Handling in Streams', () => {
    it('should handle errors during streaming', (done) => {
      // Use an invalid model to trigger an error
      apiClient.post('/chat', {
        message: 'Test error handling',
        sessionId: 'error-stream-test',
        stream: true,
        model: 'invalid-model-name', // This might trigger an error
      }, {
        responseType: 'stream',
      }).then(response => {
        let errorReceived = false;

        response.data.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          
          if (text.includes('error') || text.includes('Error')) {
            errorReceived = true;
          }
          
          if (text.includes('[DONE]')) {
            // Stream might complete even with errors
            done();
          }
        });

        response.data.on('error', () => {
          errorReceived = true;
          done();
        });

        response.data.on('end', () => {
          if (!errorReceived) {
            // Stream ended without explicit error
            done();
          }
        });
      }).catch(error => {
        // Initial request might fail
        expect(error.response?.status).toBeGreaterThanOrEqual(400);
        done();
      });
    });

    it('should handle client disconnection', (done) => {
      const startTime = Date.now();

      apiClient.post('/chat', {
        message: 'Long response that will be interrupted',
        sessionId: 'disconnect-test',
        stream: true,
      }, {
        responseType: 'stream',
        // Short timeout to simulate disconnection
        timeout: 100,
      }).then(response => {
        response.data.on('data', () => {
          // Should not receive much data due to timeout
        });

        response.data.on('error', () => {
          const duration = Date.now() - startTime;
          expect(duration).toBeLessThan(500);
          done();
        });
      }).catch(error => {
        // Timeout error expected
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          done();
        } else {
          done(error);
        }
      });
    });
  });

  describe('Streaming with MCP Integration', () => {
    it('should include MCP data in stream completion', (done) => {
      apiClient.post('/chat', {
        message: 'What is the current gas price on Sei?',
        sessionId: 'mcp-stream-test',
        stream: true,
        walletAddress: 'sei1test123',
      }, {
        responseType: 'stream',
      }).then(response => {
        let completionData: any = null;

        response.data.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          
          if (text.includes('data: ') && !text.includes('[DONE]')) {
            const dataLine = text.split('\n').find(line => line.startsWith('data: '));
            if (dataLine) {
              try {
                const data = JSON.parse(dataLine.substring(6));
                
                if (data.type === 'done') {
                  completionData = data;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
          
          if (text.includes('[DONE]')) {
            if (completionData) {
              expect(completionData).toHaveProperty('sessionId', 'mcp-stream-test');
              expect(completionData).toHaveProperty('timestamp');
              
              // Should include MCP data if MCP servers are running
              if (completionData.mcpData || completionData.toolsUsed) {
                console.log('MCP data included in stream:', {
                  toolsUsed: completionData.toolsUsed,
                  hasData: !!completionData.mcpData
                });
              }
            }
            
            done();
          }
        });

        response.data.on('error', done);
      }).catch(done);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not accumulate memory during long streams', (done) => {
      const memorySnapshots: number[] = [];
      let chunkCount = 0;

      // Take initial memory snapshot
      if (global.gc) {
        global.gc();
      }
      const initialMemory = process.memoryUsage().heapUsed;

      apiClient.post('/chat', {
        message: 'Generate a very long explanation about the entire history and technical details of blockchain technology, cryptocurrencies, and DeFi',
        sessionId: 'memory-test',
        stream: true,
        maxTokens: 2000, // Long response
      }, {
        responseType: 'stream',
      }).then(response => {
        response.data.on('data', (chunk: Buffer) => {
          chunkCount++;
          
          // Take memory snapshot every 10 chunks
          if (chunkCount % 10 === 0) {
            const currentMemory = process.memoryUsage().heapUsed;
            memorySnapshots.push(currentMemory);
          }
          
          if (chunk.toString().includes('[DONE]')) {
            // Analyze memory usage
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
            
            console.log(`Memory usage during streaming:`);
            console.log(`  Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  Increase: ${memoryIncreaseMB.toFixed(2)} MB`);
            console.log(`  Chunks processed: ${chunkCount}`);
            
            // Memory increase should be reasonable
            expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase
            
            done();
          }
        });

        response.data.on('error', done);
      }).catch(done);
    });
  });
});