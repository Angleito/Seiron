/**
 * Risk Types Unit Tests
 * Tests for type guards and validation functions
 */

import {
  isValidRiskLevel,
  isValidAlertSeverity,
  isValidRiskCategory,
  RiskLevel,
  AlertSeverity,
  RiskCategory
} from '../types';

import { testPureFunction, forAll } from '@/test-utils';

describe('Risk Types', () => {
  describe('Type Guards', () => {
    describe('isValidRiskLevel', () => {
      testPureFunction(isValidRiskLevel, [
        {
          input: ['low'],
          expected: true,
          description: 'should accept valid risk level "low"'
        },
        {
          input: ['medium'],
          expected: true,
          description: 'should accept valid risk level "medium"'
        },
        {
          input: ['high'],
          expected: true,
          description: 'should accept valid risk level "high"'
        },
        {
          input: ['critical'],
          expected: true,
          description: 'should accept valid risk level "critical"'
        },
        {
          input: ['invalid'],
          expected: false,
          description: 'should reject invalid risk level'
        },
        {
          input: [''],
          expected: false,
          description: 'should reject empty string'
        },
        {
          input: ['Low'],
          expected: false,
          description: 'should reject capitalized risk level'
        }
      ]);

      test('should be case sensitive', () => {
        expect(isValidRiskLevel('LOW')).toBe(false);
        expect(isValidRiskLevel('Medium')).toBe(false);
        expect(isValidRiskLevel('HIGH')).toBe(false);
        expect(isValidRiskLevel('Critical')).toBe(false);
      });

      test('should handle edge cases', () => {
        expect(isValidRiskLevel('low ')).toBe(false); // trailing space
        expect(isValidRiskLevel(' low')).toBe(false); // leading space
        expect(isValidRiskLevel('lo w')).toBe(false); // space in middle
      });

      test('should be pure function', () => {
        const input = 'medium';
        const result1 = isValidRiskLevel(input);
        const result2 = isValidRiskLevel(input);
        
        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result1).toBe(result2);
      });
    });

    describe('isValidAlertSeverity', () => {
      testPureFunction(isValidAlertSeverity, [
        {
          input: ['info'],
          expected: true,
          description: 'should accept valid alert severity "info"'
        },
        {
          input: ['warning'],
          expected: true,
          description: 'should accept valid alert severity "warning"'
        },
        {
          input: ['critical'],
          expected: true,
          description: 'should accept valid alert severity "critical"'
        },
        {
          input: ['error'],
          expected: false,
          description: 'should reject "error" as alert severity'
        },
        {
          input: ['debug'],
          expected: false,
          description: 'should reject "debug" as alert severity'
        },
        {
          input: [''],
          expected: false,
          description: 'should reject empty string'
        }
      ]);

      test('should be case sensitive', () => {
        expect(isValidAlertSeverity('INFO')).toBe(false);
        expect(isValidAlertSeverity('Warning')).toBe(false);
        expect(isValidAlertSeverity('CRITICAL')).toBe(false);
      });
    });

    describe('isValidRiskCategory', () => {
      testPureFunction(isValidRiskCategory, [
        {
          input: ['liquidation'],
          expected: true,
          description: 'should accept valid risk category "liquidation"'
        },
        {
          input: ['concentration'],
          expected: true,
          description: 'should accept valid risk category "concentration"'
        },
        {
          input: ['correlation'],
          expected: true,
          description: 'should accept valid risk category "correlation"'
        },
        {
          input: ['volatility'],
          expected: true,
          description: 'should accept valid risk category "volatility"'
        },
        {
          input: ['market'],
          expected: false,
          description: 'should reject "market" as risk category'
        },
        {
          input: ['credit'],
          expected: false,
          description: 'should reject "credit" as risk category'
        },
        {
          input: [''],
          expected: false,
          description: 'should reject empty string'
        }
      ]);

      test('should be case sensitive', () => {
        expect(isValidRiskCategory('LIQUIDATION')).toBe(false);
        expect(isValidRiskCategory('Concentration')).toBe(false);
        expect(isValidRiskCategory('CORRELATION')).toBe(false);
        expect(isValidRiskCategory('Volatility')).toBe(false);
      });
    });
  });

  describe('Type Safety', () => {
    test('should properly type narrow with type guards', () => {
      const testRiskLevel = (level: string): RiskLevel | null => {
        if (isValidRiskLevel(level)) {
          // TypeScript should narrow the type here
          return level; // This should be typed as RiskLevel
        }
        return null;
      };

      expect(testRiskLevel('low')).toBe('low');
      expect(testRiskLevel('invalid')).toBe(null);
    });

    test('should properly type narrow alert severity', () => {
      const testAlertSeverity = (severity: string): AlertSeverity | null => {
        if (isValidAlertSeverity(severity)) {
          return severity; // This should be typed as AlertSeverity
        }
        return null;
      };

      expect(testAlertSeverity('warning')).toBe('warning');
      expect(testAlertSeverity('invalid')).toBe(null);
    });

    test('should properly type narrow risk category', () => {
      const testRiskCategory = (category: string): RiskCategory | null => {
        if (isValidRiskCategory(category)) {
          return category; // This should be typed as RiskCategory
        }
        return null;
      };

      expect(testRiskCategory('liquidation')).toBe('liquidation');
      expect(testRiskCategory('invalid')).toBe(null);
    });
  });

  describe('Exhaustiveness Tests', () => {
    test('should cover all valid risk levels', () => {
      const validRiskLevels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      
      validRiskLevels.forEach(level => {
        expect(isValidRiskLevel(level)).toBe(true);
      });
    });

    test('should cover all valid alert severities', () => {
      const validAlertSeverities: AlertSeverity[] = ['info', 'warning', 'critical'];
      
      validAlertSeverities.forEach(severity => {
        expect(isValidAlertSeverity(severity)).toBe(true);
      });
    });

    test('should cover all valid risk categories', () => {
      const validRiskCategories: RiskCategory[] = ['liquidation', 'concentration', 'correlation', 'volatility'];
      
      validRiskCategories.forEach(category => {
        expect(isValidRiskCategory(category)).toBe(true);
      });
    });
  });

  describe('Property-based Tests', () => {
    test('should reject random strings as risk levels', () => {
      const generateRandomString = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < Math.floor(Math.random() * 20) + 1; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      forAll(
        generateRandomString,
        (randomString) => {
          const validLevels = ['low', 'medium', 'high', 'critical'];
          if (validLevels.includes(randomString)) {
            return isValidRiskLevel(randomString);
          } else {
            return !isValidRiskLevel(randomString);
          }
        },
        100
      );
    });

    test('should reject random strings as alert severities', () => {
      const generateRandomString = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < Math.floor(Math.random() * 15) + 1; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      forAll(
        generateRandomString,
        (randomString) => {
          const validSeverities = ['info', 'warning', 'critical'];
          if (validSeverities.includes(randomString)) {
            return isValidAlertSeverity(randomString);
          } else {
            return !isValidAlertSeverity(randomString);
          }
        },
        100
      );
    });

    test('should reject random strings as risk categories', () => {
      const generateRandomString = (): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < Math.floor(Math.random() * 20) + 1; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      forAll(
        generateRandomString,
        (randomString) => {
          const validCategories = ['liquidation', 'concentration', 'correlation', 'volatility'];
          if (validCategories.includes(randomString)) {
            return isValidRiskCategory(randomString);
          } else {
            return !isValidRiskCategory(randomString);
          }
        },
        100
      );
    });
  });

  describe('Performance Tests', () => {
    test('type guards should be performant', () => {
      const iterations = 10000;
      const testStrings = ['low', 'medium', 'high', 'critical', 'invalid', '', 'random'];
      
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const testString = testStrings[i % testStrings.length];
        isValidRiskLevel(testString);
        isValidAlertSeverity(testString);
        isValidRiskCategory(testString);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete in reasonable time (less than 100ms for 10k iterations)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters', () => {
      const specialChars = ['low-', 'medium!', 'high@', 'critical#', 'low$', 'medium%'];
      
      specialChars.forEach(char => {
        expect(isValidRiskLevel(char)).toBe(false);
        expect(isValidAlertSeverity(char)).toBe(false);
        expect(isValidRiskCategory(char)).toBe(false);
      });
    });

    test('should handle numeric strings', () => {
      const numericStrings = ['1', '2', '3', '4', '0'];
      
      numericStrings.forEach(num => {
        expect(isValidRiskLevel(num)).toBe(false);
        expect(isValidAlertSeverity(num)).toBe(false);
        expect(isValidRiskCategory(num)).toBe(false);
      });
    });

    test('should handle whitespace variations', () => {
      const whitespaceVariations = [
        ' low', 'low ', ' low ', 'lo w', 'l ow',
        '\tlow', 'low\t', '\nlow', 'low\n',
        'low\r', 'low\r\n'
      ];
      
      whitespaceVariations.forEach(variation => {
        expect(isValidRiskLevel(variation)).toBe(false);
        expect(isValidAlertSeverity(variation)).toBe(false);
        expect(isValidRiskCategory(variation)).toBe(false);
      });
    });

    test('should handle unicode characters', () => {
      const unicodeStrings = ['löw', 'medíum', 'hìgh', 'critícal'];
      
      unicodeStrings.forEach(unicode => {
        expect(isValidRiskLevel(unicode)).toBe(false);
        expect(isValidAlertSeverity(unicode)).toBe(false);
        expect(isValidRiskCategory(unicode)).toBe(false);
      });
    });
  });
});