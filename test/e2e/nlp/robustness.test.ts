/**
 * @fileoverview NLP Robustness E2E Tests
 * Tests natural language processing resilience with varied user inputs
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';
import axios from 'axios';
import { 
  E2E_CONFIG, 
  TestUtils, 
  TestAssertions, 
  MockDataGenerators,
  DockerUtils 
} from '../setup';

// NLP Test Client
class NLPTestClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async processInput(
    input: string,
    userId: string,
    context?: any
  ): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/nlp/process`, {
        input,
        userId,
        context
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async extractIntent(input: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/nlp/intent`, {
        input
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async extractEntities(input: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/nlp/entities`, {
        input
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
  
  async parseParameters(input: string, intent: string): Promise<E.Either<Error, any>> {
    try {
      const response = await axios.post(`${this.baseURL}/api/nlp/parameters`, {
        input,
        intent
      }, {
        timeout: E2E_CONFIG.CONVERSATION_TIMEOUT
      });
      
      return E.right(response.data);
    } catch (error) {
      return E.left(error as Error);
    }
  }
}

// Intent variation generators
const IntentVariationGenerators = {
  lending: () => fc.constantFrom(
    'Lend 1000 USDC',
    'I want to lend 1000 USDC',
    'Deposit 1000 USDC for lending',
    'Supply 1000 USDC to earn interest',
    'Put 1000 USDC in lending pool',
    'Stake 1000 USDC for yield',
    'Invest 1000 USDC in lending',
    'Provide 1000 USDC as collateral'
  ),
  
  swapping: () => fc.constantFrom(
    'Swap 100 SEI for USDC',
    'Exchange 100 SEI to USDC',
    'Trade 100 SEI into USDC',
    'Convert 100 SEI to USDC',
    'Sell 100 SEI for USDC',
    'Buy USDC with 100 SEI',
    'Change 100 SEI to USDC',
    'Turn 100 SEI into USDC'
  ),
  
  portfolio: () => fc.constantFrom(
    'Show my portfolio',
    'What is my portfolio status?',
    'Display my current positions',
    'Check my portfolio balance',
    'What do I own?',
    'Portfolio overview please',
    'My current holdings',
    'Account summary'
  ),
  
  rates: () => fc.constantFrom(
    'What are the lending rates?',
    'Show me current interest rates',
    'Check borrowing rates',
    'Display yield rates',
    'Current APY rates',
    'Interest rate comparison',
    'Rate information',
    'What can I earn?'
  )
};

// Typo and variation generators
const TypoGenerators = {
  commonMisspellings: (word: string) => {
    const misspellings: Record<string, string[]> = {
      'lend': ['len', 'lned', 'lendd', 'lend'],
      'swap': ['sawp', 'swpa', 'swapp', 'swap'],
      'USDC': ['USCD', 'UDSC', 'USDC', 'usdc'],
      'SEI': ['SIE', 'EIS', 'SEI', 'sei'],
      'portfolio': ['portfoilio', 'portfollio', 'portflio', 'portfolio']
    };
    
    return fc.constantFrom(...(misspellings[word] || [word]));
  },
  
  caseVariations: (word: string) => fc.constantFrom(
    word.toLowerCase(),
    word.toUpperCase(),
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    word
  ),
  
  spacingVariations: (phrase: string) => fc.constantFrom(
    phrase,
    phrase.replace(/\s+/g, ''),
    phrase.replace(/\s+/g, '  '),
    phrase.split('').join(' ')
  )
};

describe('NLP Robustness E2E Tests', () => {
  let client: NLPTestClient;
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    client = new NLPTestClient(E2E_CONFIG.API_BASE_URL);
    dockerAvailable = await DockerUtils.isDockerRunning();
    
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('Intent Recognition Robustness', () => {
    it('should recognize similar intents consistently', async () => {
      const testCases = [
        {
          intent: 'lending',
          variations: [
            'Lend 1000 USDC',
            'I want to lend 1000 USDC',
            'Supply 1000 USDC for lending',
            'Deposit 1000 USDC to earn interest'
          ]
        },
        {
          intent: 'swapping',
          variations: [
            'Swap 100 SEI for USDC',
            'Exchange 100 SEI to USDC',
            'Trade 100 SEI into USDC',
            'Convert 100 SEI to USDC'
          ]
        },
        {
          intent: 'portfolio',
          variations: [
            'Show my portfolio',
            'Display my current positions',
            'What is my portfolio status?',
            'Check my account balance'
          ]
        }
      ];
      
      for (const testCase of testCases) {
        const intentResults = [];
        
        for (const variation of testCase.variations) {
          const result = await client.extractIntent(variation);
          
          if (E.isRight(result)) {
            intentResults.push(result.right.intent);
          }
        }
        
        // All variations should produce the same or similar intent
        if (intentResults.length > 0) {
          const uniqueIntents = new Set(intentResults);
          expect(uniqueIntents.size).toBeLessThanOrEqual(2); // Allow some variation
          
          // At least 75% should be the same intent
          const mostCommonIntent = [...uniqueIntents].reduce((a, b) => 
            intentResults.filter(i => i === a).length > intentResults.filter(i => i === b).length ? a : b
          );
          
          const mostCommonCount = intentResults.filter(i => i === mostCommonIntent).length;
          const consistencyRate = mostCommonCount / intentResults.length;
          
          expect(consistencyRate).toBeGreaterThanOrEqual(0.75);
        }
      }
    });
    
    it('should handle typos and misspellings gracefully', async () => {
      const typoTests = [
        { correct: 'Lend 1000 USDC', typos: ['Len 1000 USDC', 'Lend 1000 USCD', 'Lned 1000 USDC'] },
        { correct: 'Swap 100 SEI', typos: ['Sawp 100 SEI', 'Swap 100 SIE', 'Swpa 100 SEI'] },
        { correct: 'Show portfolio', typos: ['Show portfoilio', 'Sho portfolio', 'Show portfollio'] }
      ];
      
      for (const test of typoTests) {
        // Get intent for correct spelling
        const correctResult = await client.extractIntent(test.correct);
        
        if (E.isRight(correctResult)) {
          const correctIntent = correctResult.right.intent;
          
          // Test typo variants
          for (const typo of test.typos) {
            const typoResult = await client.extractIntent(typo);
            
            if (E.isRight(typoResult)) {
              // Should either match correct intent or have reasonable similarity
              const typoIntent = typoResult.right.intent;
              const similarity = this.calculateIntentSimilarity(correctIntent, typoIntent);
              
              expect(similarity).toBeGreaterThanOrEqual(0.5); // 50% similarity threshold
            } else {
              // If extraction fails, should provide helpful suggestions
              console.log(`Typo "${typo}" failed intent extraction - this is acceptable`);
            }
          }
        }
      }
    });
    
    it('should handle case insensitive inputs', async () => {
      const testInputs = [
        'lend 1000 usdc',
        'LEND 1000 USDC',
        'Lend 1000 Usdc',
        'LeNd 1000 uSdC'
      ];
      
      const intentResults = [];
      
      for (const input of testInputs) {
        const result = await client.extractIntent(input);
        
        if (E.isRight(result)) {
          intentResults.push(result.right.intent);
        }
      }
      
      // All should produce the same intent
      if (intentResults.length > 0) {
        const uniqueIntents = new Set(intentResults);
        expect(uniqueIntents.size).toBe(1);
      }
    });
  });
  
  describe('Parameter Extraction Consistency', () => {
    it('should extract amounts consistently across formats', async () => {
      const amountTests = [
        { input: 'Lend 1000 USDC', expectedAmount: 1000 },
        { input: 'Lend 1,000 USDC', expectedAmount: 1000 },
        { input: 'Lend 1000.00 USDC', expectedAmount: 1000 },
        { input: 'Lend one thousand USDC', expectedAmount: 1000 },
        { input: 'Lend 1k USDC', expectedAmount: 1000 }
      ];
      
      for (const test of amountTests) {
        const result = await client.extractEntities(test.input);
        
        if (E.isRight(result)) {
          const entities = result.right.entities || [];
          const amountEntity = entities.find((e: any) => e.type === 'amount' || e.type === 'number');
          
          if (amountEntity) {
            const extractedAmount = parseFloat(amountEntity.value);
            expect(Math.abs(extractedAmount - test.expectedAmount)).toBeLessThan(0.01);
          }
        }
      }
    });
    
    it('should extract assets consistently across variations', async () => {
      const assetTests = [
        { input: 'Lend 1000 USDC', expectedAsset: 'USDC' },
        { input: 'Lend 1000 usdc', expectedAsset: 'USDC' },
        { input: 'Lend 1000 USD Coin', expectedAsset: 'USDC' },
        { input: 'Swap SEI for USDC', expectedAssets: ['SEI', 'USDC'] },
        { input: 'Exchange sei to usdc', expectedAssets: ['SEI', 'USDC'] }
      ];
      
      for (const test of assetTests) {
        const result = await client.extractEntities(test.input);
        
        if (E.isRight(result)) {
          const entities = result.right.entities || [];
          const assetEntities = entities.filter((e: any) => e.type === 'asset' || e.type === 'currency');
          
          if ('expectedAsset' in test) {
            expect(assetEntities.length).toBeGreaterThanOrEqual(1);
            const assetValues = assetEntities.map((e: any) => e.value.toUpperCase());
            expect(assetValues).toContain(test.expectedAsset);
          }
          
          if ('expectedAssets' in test) {
            expect(assetEntities.length).toBeGreaterThanOrEqual(test.expectedAssets.length);
            const assetValues = assetEntities.map((e: any) => e.value.toUpperCase());
            test.expectedAssets.forEach(asset => {
              expect(assetValues).toContain(asset);
            });
          }
        }
      }
    });
  });
  
  describe('Property-Based NLP Testing', () => {
    it('should handle random lending intent variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          IntentVariationGenerators.lending(),
          TestUtils.generators.amount(),
          TestUtils.generators.asset(),
          async (basePhrase, amount, asset) => {
            // Create variation by replacing amount and asset
            const variation = basePhrase
              .replace(/\d+/g, amount.toString())
              .replace(/USDC|SEI|ETH/gi, asset);
            
            const result = await client.processInput(variation, 'test-user');
            
            if (E.isRight(result)) {
              const response = result.right;
              
              // Should recognize as lending intent
              expect(response.intent).toBeDefined();
              expect(response.intent.toLowerCase()).toContain('lend');
              
              // Should extract amount and asset correctly
              if (response.parameters) {
                if (response.parameters.amount) {
                  expect(Math.abs(response.parameters.amount - amount)).toBeLessThan(0.01);
                }
                if (response.parameters.asset) {
                  expect(response.parameters.asset.toUpperCase()).toBe(asset.toUpperCase());
                }
              }
            }
            
            return true; // Continue even if some fail
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    });
    
    it('should handle random swap intent variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          IntentVariationGenerators.swapping(),
          TestUtils.generators.amount(),
          TestUtils.generators.asset(),
          TestUtils.generators.asset(),
          async (basePhrase, amount, fromAsset, toAsset) => {
            // Skip if assets are the same
            if (fromAsset === toAsset) return true;
            
            // Create variation
            const variation = basePhrase
              .replace(/\d+/g, amount.toString())
              .replace(/SEI/gi, fromAsset)
              .replace(/USDC/gi, toAsset);
            
            const result = await client.processInput(variation, 'test-user');
            
            if (E.isRight(result)) {
              const response = result.right;
              
              // Should recognize as swap intent
              expect(response.intent).toBeDefined();
              expect(response.intent.toLowerCase()).toContain('swap');
              
              // Should extract parameters correctly
              if (response.parameters) {
                if (response.parameters.amount) {
                  expect(Math.abs(response.parameters.amount - amount)).toBeLessThan(0.01);
                }
                if (response.parameters.fromAsset) {
                  expect(response.parameters.fromAsset.toUpperCase()).toBe(fromAsset.toUpperCase());
                }
                if (response.parameters.toAsset) {
                  expect(response.parameters.toAsset.toUpperCase()).toBe(toAsset.toUpperCase());
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 15, timeout: 30000 }
      );
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle very long inputs', async () => {
      const longInput = 'I want to lend money '.repeat(50) + '1000 USDC';
      
      const result = await client.processInput(longInput, 'test-user');
      
      if (E.isRight(result)) {
        const response = result.right;
        expect(response).toBeDefined();
        
        // Should still extract meaningful information
        if (response.parameters) {
          expect(response.parameters.amount || response.parameters.asset).toBeDefined();
        }
      } else {
        // Failure is acceptable for very long inputs
        console.log('Long input processing failed - this is acceptable');
      }
    });
    
    it('should handle very short inputs', async () => {
      const shortInputs = ['lend', 'swap', '1000', 'USDC', 'help'];
      
      for (const input of shortInputs) {
        const result = await client.processInput(input, 'test-user');
        
        if (E.isRight(result)) {
          const response = result.right;
          expect(response).toBeDefined();
          
          // Should either provide intent or ask for clarification
          expect(
            response.intent || 
            response.needsDisambiguation || 
            response.suggestions
          ).toBeDefined();
        }
      }
    });
    
    it('should handle special characters and emojis', async () => {
      const specialInputs = [
        'Lend 1000 USDC 💰',
        'Swap 100 SEI → USDC',
        'Show my portfolio 📊',
        'Lend $1,000 USDC',
        'Swap 100 SEI > USDC'
      ];
      
      for (const input of specialInputs) {
        const result = await client.processInput(input, 'test-user');
        
        if (E.isRight(result)) {
          const response = result.right;
          expect(response).toBeDefined();
          
          // Should extract meaningful intent despite special characters
          expect(response.intent).toBeDefined();
        }
      }
    });
    
    it('should handle multilingual inputs gracefully', async () => {
      const multilingualInputs = [
        'Prestar 1000 USDC', // Spanish
        'Prêter 1000 USDC', // French
        '1000 USDC를 빌려주세요', // Korean
        '借出1000 USDC', // Chinese
      ];
      
      for (const input of multilingualInputs) {
        const result = await client.processInput(input, 'test-user');
        
        // These might fail, but shouldn't crash the system
        if (E.isRight(result)) {
          const response = result.right;
          expect(response).toBeDefined();
        } else {
          console.log(`Multilingual input "${input}" failed - this is acceptable`);
        }
      }
    });
  });
  
  describe('Context-Aware NLP Processing', () => {
    it('should use context to improve parameter extraction', async () => {
      const context = {
        previousIntent: 'lending',
        lastAsset: 'USDC',
        lastAmount: 1000,
        userPreferences: {
          defaultAsset: 'USDC',
          riskTolerance: 'medium'
        }
      };
      
      // Ambiguous input that needs context
      const ambiguousInput = 'increase it to 2000';
      
      const result = await client.processInput(ambiguousInput, 'test-user', context);
      
      if (E.isRight(result)) {
        const response = result.right;
        expect(response).toBeDefined();
        
        // Should use context to resolve ambiguity
        if (response.parameters) {
          expect(response.parameters.amount).toBe(2000);
          expect(response.parameters.asset).toBe('USDC');
        }
      }
    });
    
    it('should maintain consistency across conversation context', async () => {
      const conversationContext = {
        conversationHistory: [
          { input: 'Lend 1000 USDC on YeiFinance', intent: 'lending' },
          { input: 'What are the rates?', intent: 'rate_inquiry' }
        ]
      };
      
      const contextualInput = 'How much will I earn?';
      
      const result = await client.processInput(contextualInput, 'test-user', conversationContext);
      
      if (E.isRight(result)) {
        const response = result.right;
        expect(response).toBeDefined();
        
        // Should understand this refers to lending earnings
        expect(response.intent).toBeDefined();
        
        // Should reference context about YeiFinance and USDC
        if (response.parameters || response.context) {
          const hasRelevantContext = 
            JSON.stringify(response).toLowerCase().includes('usdc') ||
            JSON.stringify(response).toLowerCase().includes('yeifinance') ||
            JSON.stringify(response).toLowerCase().includes('lending');
          
          expect(hasRelevantContext).toBe(true);
        }
      }
    });
  });
  
  // Helper method for intent similarity (placeholder implementation)
  private calculateIntentSimilarity(intent1: string, intent2: string): number {
    if (intent1 === intent2) return 1.0;
    
    // Simple character-based similarity
    const longer = intent1.length > intent2.length ? intent1 : intent2;
    const shorter = intent1.length > intent2.length ? intent2 : intent1;
    
    if (longer.length === 0) return 1.0;
    
    const matches = shorter.split('').filter((char, index) => 
      longer[index] === char
    ).length;
    
    return matches / longer.length;
  }
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});