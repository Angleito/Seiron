/**
 * @fileoverview Asset Resolver
 * Resolves asset names and symbols with fuzzy matching and validation
 */

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

import {
  AssetInfo,
  AssetResolutionResult,
  AssetResolutionError,
  AssetResult
} from './types.js';

/**
 * Asset Database Entry
 */
interface AssetDatabaseEntry extends AssetInfo {
  readonly aliases: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly popularity: number;
}

/**
 * Fuzzy Match Result
 */
interface FuzzyMatchResult {
  readonly asset: AssetDatabaseEntry;
  readonly score: number;
  readonly matchType: 'exact' | 'alias' | 'fuzzy' | 'partial';
}

/**
 * Asset Resolver Configuration
 */
export interface AssetResolverConfig {
  readonly minFuzzyScore: number;
  readonly maxSuggestions: number;
  readonly enableFuzzyMatching: boolean;
  readonly preferStablecoins: boolean;
  readonly preferPopular: boolean;
}

/**
 * Asset Resolver
 */
export class AssetResolver {
  private readonly config: AssetResolverConfig;
  private readonly assetDatabase: Map<string, AssetDatabaseEntry>;
  private readonly symbolIndex: Map<string, string[]>;
  private readonly nameIndex: Map<string, string[]>;
  private readonly aliasIndex: Map<string, string[]>;

  constructor(config: AssetResolverConfig) {
    this.config = config;
    this.assetDatabase = this.initializeAssetDatabase();
    this.symbolIndex = this.buildSymbolIndex();
    this.nameIndex = this.buildNameIndex();
    this.aliasIndex = this.buildAliasIndex();
  }

  /**
   * Resolve asset from string input
   */
  async resolveAsset(input: string): Promise<E.Either<AssetResolutionError, AssetResolutionResult>> {
    try {
      const cleanInput = this.normalizeInput(input);
      
      if (!cleanInput) {
        return E.left(new AssetResolutionError(
          'Empty or invalid asset input',
          { input }
        ));
      }

      // Try exact matches first
      const exactMatch = this.findExactMatch(cleanInput);
      if (O.isSome(exactMatch)) {
        return E.right({
          resolved: exactMatch.value,
          confidence: 1.0,
          alternatives: [],
          suggestions: []
        });
      }

      // Try alias matches
      const aliasMatch = this.findAliasMatch(cleanInput);
      if (O.isSome(aliasMatch)) {
        return E.right({
          resolved: aliasMatch.value,
          confidence: 0.95,
          alternatives: [],
          suggestions: []
        });
      }

      // Try fuzzy matching if enabled
      if (this.config.enableFuzzyMatching) {
        const fuzzyMatches = this.findFuzzyMatches(cleanInput);
        
        if (fuzzyMatches.length > 0) {
          const bestMatch = fuzzyMatches[0];
          
          if (bestMatch.score >= this.config.minFuzzyScore) {
            const alternatives = fuzzyMatches
              .slice(1, this.config.maxSuggestions)
              .map(match => match.asset);

            return E.right({
              resolved: bestMatch.asset,
              confidence: bestMatch.score,
              alternatives,
              suggestions: this.generateSuggestions(cleanInput, fuzzyMatches)
            });
          }
        }
      }

      // No matches found
      const suggestions = this.generateSuggestionsForUnknown(cleanInput);
      
      return E.left(new AssetResolutionError(
        `Could not resolve asset: ${input}`,
        { input: cleanInput, suggestions }
      ));

    } catch (error) {
      return E.left(new AssetResolutionError(
        'Unexpected error during asset resolution',
        { originalError: error, input }
      ));
    }
  }

  /**
   * Get asset information by symbol
   */
  async getAssetInfo(symbol: string): Promise<O.Option<AssetInfo>> {
    const asset = this.assetDatabase.get(symbol.toUpperCase());
    return asset ? O.some(asset) : O.none;
  }

  /**
   * Search assets by criteria
   */
  async searchAssets(criteria: {
    query?: string;
    isStablecoin?: boolean;
    minMarketCap?: number;
    category?: string;
    limit?: number;
  }): Promise<ReadonlyArray<AssetInfo>> {
    const assets = Array.from(this.assetDatabase.values());
    
    let filtered = assets;

    // Apply filters
    if (criteria.query) {
      const queryLower = criteria.query.toLowerCase();
      filtered = filtered.filter(asset => 
        asset.symbol.toLowerCase().includes(queryLower) ||
        asset.name.toLowerCase().includes(queryLower) ||
        asset.aliases.some(alias => alias.toLowerCase().includes(queryLower))
      );
    }

    if (criteria.isStablecoin !== undefined) {
      filtered = filtered.filter(asset => asset.isStablecoin === criteria.isStablecoin);
    }

    if (criteria.minMarketCap !== undefined) {
      filtered = filtered.filter(asset => 
        asset.marketCap && asset.marketCap >= criteria.minMarketCap!
      );
    }

    // Sort by popularity and market cap
    filtered.sort((a, b) => {
      if (this.config.preferPopular) {
        const popularityDiff = b.popularity - a.popularity;
        if (popularityDiff !== 0) return popularityDiff;
      }
      
      const marketCapA = a.marketCap || 0;
      const marketCapB = b.marketCap || 0;
      return marketCapB - marketCapA;
    });

    // Apply limit
    const limit = criteria.limit || this.config.maxSuggestions;
    return filtered.slice(0, limit);
  }

  /**
   * Get popular assets
   */
  async getPopularAssets(limit: number = 10): Promise<ReadonlyArray<AssetInfo>> {
    const assets = Array.from(this.assetDatabase.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    return assets;
  }

  /**
   * Get stablecoins
   */
  async getStablecoins(): Promise<ReadonlyArray<AssetInfo>> {
    return Array.from(this.assetDatabase.values())
      .filter(asset => asset.isStablecoin)
      .sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Validate asset symbol
   */
  validateAssetSymbol(symbol: string): boolean {
    return this.assetDatabase.has(symbol.toUpperCase());
  }

  /**
   * Get asset suggestions for partial input
   */
  async getAssetSuggestions(partial: string, limit: number = 5): Promise<ReadonlyArray<string>> {
    const partialLower = partial.toLowerCase();
    const suggestions: string[] = [];

    // Find assets that start with the partial input
    for (const asset of this.assetDatabase.values()) {
      if (asset.symbol.toLowerCase().startsWith(partialLower)) {
        suggestions.push(asset.symbol);
      } else if (asset.name.toLowerCase().startsWith(partialLower)) {
        suggestions.push(asset.symbol);
      } else {
        // Check aliases
        for (const alias of asset.aliases) {
          if (alias.toLowerCase().startsWith(partialLower)) {
            suggestions.push(asset.symbol);
            break;
          }
        }
      }
    }

    // Sort by popularity and return top results
    const sortedSuggestions = suggestions
      .map(symbol => ({ symbol, popularity: this.assetDatabase.get(symbol)?.popularity || 0 }))
      .sort((a, b) => b.popularity - a.popularity)
      .map(item => item.symbol)
      .slice(0, limit);

    return sortedSuggestions;
  }

  /**
   * Normalize input string
   */
  private normalizeInput(input: string): string {
    return input.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * Find exact symbol match
   */
  private findExactMatch(input: string): O.Option<AssetDatabaseEntry> {
    const asset = this.assetDatabase.get(input);
    return asset ? O.some(asset) : O.none;
  }

  /**
   * Find alias match
   */
  private findAliasMatch(input: string): O.Option<AssetDatabaseEntry> {
    const inputLower = input.toLowerCase();
    
    for (const asset of this.assetDatabase.values()) {
      if (asset.aliases.some(alias => alias.toLowerCase() === inputLower)) {
        return O.some(asset);
      }
    }
    
    return O.none;
  }

  /**
   * Find fuzzy matches
   */
  private findFuzzyMatches(input: string): ReadonlyArray<FuzzyMatchResult> {
    const matches: FuzzyMatchResult[] = [];
    const inputLower = input.toLowerCase();

    for (const asset of this.assetDatabase.values()) {
      // Check symbol similarity
      const symbolScore = this.calculateSimilarity(inputLower, asset.symbol.toLowerCase());
      if (symbolScore > 0.3) {
        matches.push({
          asset,
          score: symbolScore * 0.9, // Slight penalty for fuzzy matches
          matchType: 'fuzzy'
        });
      }

      // Check name similarity
      const nameScore = this.calculateSimilarity(inputLower, asset.name.toLowerCase());
      if (nameScore > 0.3) {
        matches.push({
          asset,
          score: nameScore * 0.8,
          matchType: 'fuzzy'
        });
      }

      // Check partial matches
      if (asset.symbol.toLowerCase().includes(inputLower) || 
          asset.name.toLowerCase().includes(inputLower)) {
        matches.push({
          asset,
          score: 0.7,
          matchType: 'partial'
        });
      }
    }

    // Remove duplicates and sort by score
    const uniqueMatches = this.removeDuplicateMatches(matches);
    return uniqueMatches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return 1 - (distance / maxLen);
  }

  /**
   * Remove duplicate matches
   */
  private removeDuplicateMatches(matches: FuzzyMatchResult[]): FuzzyMatchResult[] {
    const seen = new Set<string>();
    const unique: FuzzyMatchResult[] = [];

    for (const match of matches) {
      if (!seen.has(match.asset.symbol)) {
        seen.add(match.asset.symbol);
        unique.push(match);
      }
    }

    return unique;
  }

  /**
   * Generate suggestions from matches
   */
  private generateSuggestions(
    input: string,
    matches: ReadonlyArray<FuzzyMatchResult>
  ): ReadonlyArray<string> {
    return matches
      .slice(0, 3)
      .map(match => `Did you mean ${match.asset.symbol} (${match.asset.name})?`);
  }

  /**
   * Generate suggestions for unknown input
   */
  private generateSuggestionsForUnknown(input: string): ReadonlyArray<string> {
    const suggestions: string[] = [];

    // Suggest popular assets
    if (this.config.preferPopular) {
      suggestions.push('Try popular assets like USDC, SEI, or ETH');
    }

    // Suggest stablecoins if input might be related
    if (input.includes('USD') || input.includes('STABLE') || this.config.preferStablecoins) {
      suggestions.push('For stable value, consider USDC or USDT');
    }

    // Suggest checking spelling
    suggestions.push('Check the spelling of the asset symbol');

    return suggestions;
  }

  /**
   * Build symbol index
   */
  private buildSymbolIndex(): Map<string, string[]> {
    const index = new Map<string, string[]>();
    
    for (const [symbol, asset] of this.assetDatabase) {
      const key = symbol.toLowerCase();
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(symbol);
    }
    
    return index;
  }

  /**
   * Build name index
   */
  private buildNameIndex(): Map<string, string[]> {
    const index = new Map<string, string[]>();
    
    for (const [symbol, asset] of this.assetDatabase) {
      const key = asset.name.toLowerCase();
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(symbol);
    }
    
    return index;
  }

  /**
   * Build alias index
   */
  private buildAliasIndex(): Map<string, string[]> {
    const index = new Map<string, string[]>();
    
    for (const [symbol, asset] of this.assetDatabase) {
      for (const alias of asset.aliases) {
        const key = alias.toLowerCase();
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key)!.push(symbol);
      }
    }
    
    return index;
  }

  /**
   * Initialize asset database
   */
  private initializeAssetDatabase(): Map<string, AssetDatabaseEntry> {
    const database = new Map<string, AssetDatabaseEntry>();

    // Major assets on Sei Network
    const assets: AssetDatabaseEntry[] = [
      {
        symbol: 'SEI',
        name: 'Sei',
        decimals: 6,
        chainId: 1329, // Sei mainnet
        isStablecoin: false,
        isWrapped: false,
        aliases: ['sei', 'seinetwork'],
        tags: ['native', 'gas'],
        popularity: 100,
        marketCap: 1000000000,
        dailyVolume: 50000000,
        priceUsd: 0.5
      },
      {
        symbol: 'WSEI',
        name: 'Wrapped SEI',
        decimals: 6,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: true,
        underlyingAsset: 'SEI',
        aliases: ['wsei', 'wrapped-sei'],
        tags: ['wrapped', 'defi'],
        popularity: 90
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: 1329,
        isStablecoin: true,
        isWrapped: false,
        aliases: ['usdc', 'usd-coin', 'dollar', 'stable'],
        tags: ['stablecoin', 'defi'],
        popularity: 95,
        marketCap: 25000000000,
        dailyVolume: 2000000000,
        priceUsd: 1.0
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        chainId: 1329,
        isStablecoin: true,
        isWrapped: false,
        aliases: ['usdt', 'tether', 'stable'],
        tags: ['stablecoin', 'defi'],
        popularity: 85,
        marketCap: 80000000000,
        dailyVolume: 15000000000,
        priceUsd: 1.0
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: false,
        aliases: ['eth', 'ethereum', 'ether'],
        tags: ['major', 'defi'],
        popularity: 98,
        marketCap: 200000000000,
        dailyVolume: 8000000000,
        priceUsd: 2000
      },
      {
        symbol: 'WETH',
        name: 'Wrapped Ethereum',
        decimals: 18,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: true,
        underlyingAsset: 'ETH',
        aliases: ['weth', 'wrapped-eth'],
        tags: ['wrapped', 'defi'],
        popularity: 88
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: false,
        aliases: ['btc', 'bitcoin'],
        tags: ['major', 'store-of-value'],
        popularity: 99,
        marketCap: 500000000000,
        dailyVolume: 10000000000,
        priceUsd: 45000
      },
      {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: true,
        underlyingAsset: 'BTC',
        aliases: ['wbtc', 'wrapped-btc'],
        tags: ['wrapped', 'defi'],
        popularity: 80
      },
      {
        symbol: 'ATOM',
        name: 'Cosmos',
        decimals: 6,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: false,
        aliases: ['atom', 'cosmos'],
        tags: ['cosmos', 'ibc'],
        popularity: 75,
        marketCap: 3000000000,
        dailyVolume: 150000000,
        priceUsd: 12
      },
      {
        symbol: 'OSMO',
        name: 'Osmosis',
        decimals: 6,
        chainId: 1329,
        isStablecoin: false,
        isWrapped: false,
        aliases: ['osmo', 'osmosis'],
        tags: ['cosmos', 'dex', 'ibc'],
        popularity: 70,
        marketCap: 500000000,
        dailyVolume: 25000000,
        priceUsd: 1.5
      }
    ];

    // Add assets to database
    for (const asset of assets) {
      database.set(asset.symbol, asset);
    }

    return database;
  }
}