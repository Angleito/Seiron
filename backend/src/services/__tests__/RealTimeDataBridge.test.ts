import { RealTimeDataBridge, StreamError, DataStreamEvent, PriceUpdate, PortfolioUpdate, TransactionUpdate } from '../RealTimeDataBridge';
import { Observable, Subject, firstValueFrom, toArray, take, timeout } from 'rxjs';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';

describe('RealTimeDataBridge', () => {
  let bridge: RealTimeDataBridge;
  
  beforeEach(() => {
    bridge = new RealTimeDataBridge({
      streams: {
        prices: {
          throttleMs: 100,
          retryAttempts: 2,
          retryDelay: 50
        },
        portfolio: {
          throttleMs: 100,
          retryAttempts: 2,
          retryDelay: 50
        },
        transactions: {
          throttleMs: 100,
          retryAttempts: 2,
          retryDelay: 50
        }
      },
      enableLogging: false
    });
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('Stream Creation', () => {
    it('should create a price stream for a specific wallet', async () => {
      const walletAddress = '0x123';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const priceUpdate: DataStreamEvent<PriceUpdate> = {
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      };

      const resultPromise = firstValueFrom(priceStream$);
      
      const emitResult = await bridge.emitDataEvent(priceUpdate)();
      expect(E.isRight(emitResult)).toBe(true);

      const result = await resultPromise;
      expect(result.data.symbol).toBe('SEI');
      expect(result.data.price).toBe(100);
    });

    it('should create a portfolio stream for a specific wallet', async () => {
      const walletAddress = '0x456';
      const portfolioStream$ = bridge.createPortfolioStream(walletAddress);
      
      const portfolioUpdate: DataStreamEvent<PortfolioUpdate> = {
        type: 'portfolio',
        walletAddress,
        data: {
          walletAddress,
          totalValue: 10000,
          totalValueChange24h: 500,
          positions: [
            { symbol: 'SEI', amount: 100, value: 10000, change24h: 5 }
          ],
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      };

      const resultPromise = firstValueFrom(portfolioStream$);
      
      const emitResult = await bridge.emitDataEvent(portfolioUpdate)();
      expect(E.isRight(emitResult)).toBe(true);

      const result = await resultPromise;
      expect(result.data.totalValue).toBe(10000);
      expect(result.data.positions).toHaveLength(1);
    });

    it('should create a transaction stream for a specific wallet', async () => {
      const walletAddress = '0x789';
      const transactionStream$ = bridge.createTransactionStream(walletAddress);
      
      const transactionUpdate: DataStreamEvent<TransactionUpdate> = {
        type: 'transaction',
        walletAddress,
        data: {
          hash: '0xabc123',
          from: walletAddress,
          to: '0xdef456',
          value: '1000',
          symbol: 'SEI',
          status: 'pending',
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      };

      const resultPromise = firstValueFrom(transactionStream$);
      
      const emitResult = await bridge.emitDataEvent(transactionUpdate)();
      expect(E.isRight(emitResult)).toBe(true);

      const result = await resultPromise;
      expect(result.data.hash).toBe('0xabc123');
      expect(result.data.status).toBe('pending');
    });
  });

  describe('Stream Filtering', () => {
    it('should filter events by wallet address', async () => {
      const targetWallet = '0x111';
      const otherWallet = '0x222';
      const priceStream$ = bridge.createPriceStream(targetWallet);
      
      const events: DataStreamEvent<PriceUpdate>[] = [
        {
          type: 'price',
          walletAddress: otherWallet,
          data: {
            symbol: 'BTC',
            price: 50000,
            change24h: 2,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        },
        {
          type: 'price',
          walletAddress: targetWallet,
          data: {
            symbol: 'SEI',
            price: 100,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        }
      ];

      const results: DataStreamEvent<PriceUpdate>[] = [];
      const subscription = priceStream$.subscribe(event => results.push(event));

      for (const event of events) {
        await bridge.emitDataEvent(event)();
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(results).toHaveLength(1);
      expect(results[0].walletAddress).toBe(targetWallet);
      expect(results[0].data.symbol).toBe('SEI');
      
      subscription.unsubscribe();
    });

    it('should filter transactions by from/to addresses', async () => {
      const walletAddress = '0x333';
      const transactionStream$ = bridge.createTransactionStream(walletAddress);
      
      const events: DataStreamEvent<TransactionUpdate>[] = [
        {
          type: 'transaction',
          walletAddress: '0x999',
          data: {
            hash: '0x111',
            from: '0x999',
            to: '0x888',
            value: '1000',
            symbol: 'SEI',
            status: 'confirmed',
            timestamp: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        },
        {
          type: 'transaction',
          walletAddress: '0x888',
          data: {
            hash: '0x222',
            from: walletAddress,
            to: '0x777',
            value: '2000',
            symbol: 'SEI',
            status: 'pending',
            timestamp: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        },
        {
          type: 'transaction',
          walletAddress: '0x777',
          data: {
            hash: '0x333',
            from: '0x666',
            to: walletAddress,
            value: '3000',
            symbol: 'SEI',
            status: 'confirmed',
            timestamp: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        }
      ];

      const results: DataStreamEvent<TransactionUpdate>[] = [];
      const subscription = transactionStream$.subscribe(event => results.push(event));

      for (const event of events) {
        await bridge.emitDataEvent(event)();
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(results).toHaveLength(2);
      expect(results[0].data.from).toBe(walletAddress);
      expect(results[1].data.to).toBe(walletAddress);
      
      subscription.unsubscribe();
    });
  });

  describe('Throttling', () => {
    it('should throttle rapid price updates', async () => {
      const walletAddress = '0x444';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const results: DataStreamEvent<PriceUpdate>[] = [];
      const subscription = priceStream$.subscribe(event => results.push(event));

      // Emit 10 rapid updates
      for (let i = 0; i < 10; i++) {
        const event: DataStreamEvent<PriceUpdate> = {
          type: 'price',
          walletAddress,
          data: {
            symbol: 'SEI',
            price: 100 + i,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        };
        
        await bridge.emitDataEvent(event)();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for throttle window
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Should have significantly fewer events due to throttling
      expect(results.length).toBeLessThan(10);
      expect(results.length).toBeGreaterThan(0);
      
      subscription.unsubscribe();
    });

    it('should include both leading and trailing throttled events', async () => {
      const walletAddress = '0x555';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const results: DataStreamEvent<PriceUpdate>[] = [];
      const subscription = priceStream$.subscribe(event => results.push(event));

      // First event (leading)
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      // Rapid events (throttled)
      for (let i = 1; i <= 5; i++) {
        await bridge.emitDataEvent({
          type: 'price',
          walletAddress,
          data: {
            symbol: 'SEI',
            price: 100 + i,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        })();
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Wait for throttle window to ensure trailing event
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(results.length).toBeGreaterThanOrEqual(2); // At least leading and trailing
      expect(results[0].data.price).toBe(100); // Leading event
      expect(results[results.length - 1].data.price).toBe(105); // Trailing event
      
      subscription.unsubscribe();
    });
  });

  describe('Merged Streams', () => {
    it('should create a merged stream with multiple data types', async () => {
      const walletAddress = '0x666';
      const mergedStream$ = bridge.createMergedStream(walletAddress);
      
      const results: DataStreamEvent[] = [];
      const subscription = mergedStream$.subscribe(event => results.push(event));

      // Emit different types of events
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await bridge.emitDataEvent({
        type: 'portfolio',
        walletAddress,
        data: {
          walletAddress,
          totalValue: 10000,
          totalValueChange24h: 500,
          positions: [],
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await bridge.emitDataEvent({
        type: 'transaction',
        walletAddress,
        data: {
          hash: '0xabc',
          from: walletAddress,
          to: '0xdef',
          value: '1000',
          symbol: 'SEI',
          status: 'pending',
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.type).sort()).toEqual(['portfolio', 'price', 'transaction']); // TODO: REMOVE_MOCK - Hard-coded array literals
      
      subscription.unsubscribe();
    });

    it('should create a merged stream with selected types only', async () => {
      const walletAddress = '0x777';
      const mergedStream$ = bridge.createMergedStream(walletAddress, ['prices', 'portfolio']);
      
      const results: DataStreamEvent[] = [];
      const subscription = mergedStream$.subscribe(event => results.push(event));

      // Emit all types of events
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await bridge.emitDataEvent({
        type: 'portfolio',
        walletAddress,
        data: {
          walletAddress,
          totalValue: 10000,
          totalValueChange24h: 500,
          positions: [],
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await bridge.emitDataEvent({
        type: 'transaction',
        walletAddress,
        data: {
          hash: '0xabc',
          from: walletAddress,
          to: '0xdef',
          value: '1000',
          symbol: 'SEI',
          status: 'pending',
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.type).sort()).toEqual(['portfolio', 'price']);
      
      subscription.unsubscribe();
    });
  });

  describe('Aggregated Streams', () => {
    it('should create an aggregated stream with accumulated data', async () => {
      const walletAddress = '0x888';
      const aggregatedStream$ = bridge.createAggregatedStream(walletAddress, 150);
      
      const resultPromise = firstValueFrom(aggregatedStream$);

      // Emit multiple price updates
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'BTC',
          price: 50000,
          change24h: 2,
          volume24h: 2000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      // Emit portfolio update
      await bridge.emitDataEvent({
        type: 'portfolio',
        walletAddress,
        data: {
          walletAddress,
          totalValue: 60000,
          totalValueChange24h: 3000,
          positions: [
            { symbol: 'SEI', amount: 100, value: 10000, change24h: 5 },
            { symbol: 'BTC', amount: 1, value: 50000, change24h: 2 }
          ],
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      // Emit transaction
      await bridge.emitDataEvent({
        type: 'transaction',
        walletAddress,
        data: {
          hash: '0xabc123',
          from: walletAddress,
          to: '0xdef456',
          value: '1000',
          symbol: 'SEI',
          status: 'confirmed',
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      const result = await resultPromise;
      
      expect(result.prices).toHaveLength(2);
      expect(result.prices.find(p => p.symbol === 'SEI')).toBeDefined();
      expect(result.prices.find(p => p.symbol === 'BTC')).toBeDefined();
      expect(result.portfolio).not.toBeNull();
      expect(result.portfolio?.totalValue).toBe(60000);
      expect(result.recentTransactions).toHaveLength(1);
      expect(result.recentTransactions[0].hash).toBe('0xabc123');
    });

    it('should update existing prices in aggregated stream', async () => {
      const walletAddress = '0x999';
      const aggregatedStream$ = bridge.createAggregatedStream(walletAddress, 100);
      
      const results: any[] = [];
      const subscription = aggregatedStream$.pipe(take(2)).subscribe(result => results.push(result));

      // First SEI price
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await new Promise(resolve => setTimeout(resolve, 150));

      // Updated SEI price
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress,
        data: {
          symbol: 'SEI',
          price: 110,
          change24h: 10,
          volume24h: 1500000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(results).toHaveLength(2);
      expect(results[0].prices).toHaveLength(1);
      expect(results[0].prices[0].price).toBe(100);
      expect(results[1].prices).toHaveLength(1);
      expect(results[1].prices[0].price).toBe(110);
      
      subscription.unsubscribe();
    });
  });

  describe('Connection Management', () => {
    it('should register and unregister connections', async () => {
      const walletAddress = '0xaaa';
      const connectionId = 'conn-123';
      
      const registerResult = await bridge.registerConnection(walletAddress, connectionId)();
      expect(E.isRight(registerResult)).toBe(true);
      expect(bridge.getActiveConnections(walletAddress)).toBe(1);
      
      const unregisterResult = await bridge.unregisterConnection(walletAddress, connectionId)();
      expect(E.isRight(unregisterResult)).toBe(true);
      expect(bridge.getActiveConnections(walletAddress)).toBe(0);
    });

    it('should handle multiple connections per wallet', async () => {
      const walletAddress = '0xbbb';
      const connectionIds = ['conn-1', 'conn-2', 'conn-3']; // TODO: REMOVE_MOCK - Hard-coded array literals
      
      for (const id of connectionIds) {
        await bridge.registerConnection(walletAddress, id)();
      }
      
      expect(bridge.getActiveConnections(walletAddress)).toBe(3);
      
      await bridge.unregisterConnection(walletAddress, 'conn-2')();
      expect(bridge.getActiveConnections(walletAddress)).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should validate event structure', async () => {
      const invalidEvent = {
        type: 'price',
        // Missing walletAddress
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      } as any;

      const result = await bridge.emitDataEvent(invalidEvent)();
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBeInstanceOf(StreamError);
        expect(result.left.code).toBe('VALIDATION_FAILED');
      }
    });

    it('should validate price update data', async () => {
      const invalidPriceEvent: DataStreamEvent<any> = {
        type: 'price',
        walletAddress: '0xccc',
        data: {
          // Missing required fields
          symbol: 'SEI',
          // price missing
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      };

      const result = await bridge.emitDataEvent(invalidPriceEvent)();
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.code).toBe('VALIDATION_FAILED');
      }
    });

    it('should handle unknown event types', async () => {
      const unknownEvent = {
        type: 'unknown',
        walletAddress: '0xddd',
        data: {},
        timestamp: new Date(),
        source: 'websocket'
      } as any;

      const result = await bridge.emitDataEvent(unknownEvent)();
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.code).toBe('INVALID_EVENT_TYPE');
      }
    });
  });

  describe('Metrics', () => {
    it('should track stream metrics', async () => {
      const walletAddress = '0xeee';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const subscription = priceStream$.subscribe();

      // Emit events
      for (let i = 0; i < 5; i++) {
        await bridge.emitDataEvent({
          type: 'price',
          walletAddress,
          data: {
            symbol: 'SEI',
            price: 100 + i,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        })();
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const metricsResult = await bridge.getStreamMetrics('price')();
      expect(E.isRight(metricsResult)).toBe(true);
      
      if (E.isRight(metricsResult)) {
        const metrics = metricsResult.right as any;
        expect(metrics.eventsProcessed).toBeGreaterThan(0);
        expect(metrics.lastUpdate).toBeInstanceOf(Date);
      }
      
      subscription.unsubscribe();
    });

    it('should return all metrics when no stream type specified', async () => {
      const metricsResult = await bridge.getStreamMetrics()();
      expect(E.isRight(metricsResult)).toBe(true);
      
      if (E.isRight(metricsResult)) {
        const metricsMap = metricsResult.right as Map<string, any>;
        expect(metricsMap).toBeInstanceOf(Map);
        expect(metricsMap.size).toBeGreaterThan(0);
        expect(metricsMap.has('price')).toBe(true);
        expect(metricsMap.has('portfolio')).toBe(true);
        expect(metricsMap.has('transaction')).toBe(true);
      }
    });
  });

  describe('Connection Health', () => {
    it('should provide connection health status', async () => {
      const health$ = bridge.getConnectionHealth$();
      const healthPromise = firstValueFrom(health$);
      
      const health = await healthPromise;
      expect(health.status).toBe('disconnected');
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
      expect(health.missedHeartbeats).toBe(0);
      expect(health.errors).toBe(0);
    });

    it('should update connection health on successful events', async () => {
      const health$ = bridge.getConnectionHealth$();
      const healthValues: any[] = [];
      const subscription = health$.pipe(take(2)).subscribe(h => healthValues.push(h));
      
      await bridge.emitDataEvent({
        type: 'price',
        walletAddress: '0xfff',
        data: {
          symbol: 'SEI',
          price: 100,
          change24h: 5,
          volume24h: 1000000,
          lastUpdate: new Date()
        },
        timestamp: new Date(),
        source: 'websocket'
      })();

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(healthValues.length).toBeGreaterThan(1);
      expect(healthValues[healthValues.length - 1].status).toBe('connected');
      
      subscription.unsubscribe();
    });
  });

  describe('Distinct Updates', () => {
    it('should filter out duplicate price updates for the same symbol', async () => {
      const walletAddress = '0x1111';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const results: DataStreamEvent<PriceUpdate>[] = [];
      const subscription = priceStream$.subscribe(event => results.push(event));

      // Emit same price multiple times
      for (let i = 0; i < 3; i++) {
        await bridge.emitDataEvent({
          type: 'price',
          walletAddress,
          data: {
            symbol: 'SEI',
            price: 100,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        })();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Due to distinctUntilChanged with custom key, duplicates should be filtered
      expect(results.length).toBeLessThan(3);
      
      subscription.unsubscribe();
    });

    it('should not filter different symbols', async () => {
      const walletAddress = '0x2222';
      const priceStream$ = bridge.createPriceStream(walletAddress);
      
      const results: DataStreamEvent<PriceUpdate>[] = [];
      const subscription = priceStream$.subscribe(event => results.push(event));

      const symbols = ['SEI', 'BTC', 'ETH']; // TODO: REMOVE_MOCK - Hard-coded array literals
      
      for (const symbol of symbols) {
        await bridge.emitDataEvent({
          type: 'price',
          walletAddress,
          data: {
            symbol,
            price: 100,
            change24h: 5,
            volume24h: 1000000,
            lastUpdate: new Date()
          },
          timestamp: new Date(),
          source: 'websocket'
        })();
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(results).toHaveLength(3);
      expect(new Set(results.map(r => r.data.symbol)).size).toBe(3);
      
      subscription.unsubscribe();
    });
  });
});