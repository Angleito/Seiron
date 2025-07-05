/**
 * Type validation utilities for Sei blockchain data types
 * Uses runtime type checking to ensure data integrity
 */

import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { 
  SeiNetworkData, 
  SeiTokenData, 
  CryptoMarketData, 
  SeiDeFiData, 
  SeiWalletAnalysis 
} from '../adapters/types'
import { 
  ValidationError, 
  ValidationResult, 
  Validator,
  VALIDATION_CODES 
} from '../../types/utils/validation'

// ============================================================================
// Helper Functions
// ============================================================================

const createValidationError = (
  field: string,
  code: string,
  message: string,
  value?: unknown
): ValidationError => ({
  field,
  code,
  message,
  value,
  context: { timestamp: Date.now() }
})

const isString = (value: unknown): value is string => 
  typeof value === 'string'

const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value) && isFinite(value)

const isBoolean = (value: unknown): value is boolean => 
  typeof value === 'boolean'

const isArray = (value: unknown): value is unknown[] => 
  Array.isArray(value)

const isObject = (value: unknown): value is Record<string, unknown> => 
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOptionalField = <T>(value: unknown): value is T | undefined | null => 
  value === undefined || value === null

const validateRequired = (value: unknown, field: string): E.Either<ValidationError, unknown> => {
  if (value === undefined || value === null) {
    return E.left(createValidationError(field, VALIDATION_CODES.REQUIRED, `${field} is required`))
  }
  return E.right(value)
}

const validateString = (value: unknown, field: string): E.Either<ValidationError, string> => {
  if (!isString(value)) {
    return E.left(createValidationError(field, VALIDATION_CODES.TYPE_ERROR, `${field} must be a string`, value))
  }
  return E.right(value)
}

const validateNumber = (value: unknown, field: string): E.Either<ValidationError, number> => {
  if (!isNumber(value)) {
    return E.left(createValidationError(field, VALIDATION_CODES.TYPE_ERROR, `${field} must be a number`, value))
  }
  return E.right(value)
}

const validateBoolean = (value: unknown, field: string): E.Either<ValidationError, boolean> => {
  if (!isBoolean(value)) {
    return E.left(createValidationError(field, VALIDATION_CODES.TYPE_ERROR, `${field} must be a boolean`, value))
  }
  return E.right(value)
}

const validateArray = <T>(
  value: unknown, 
  field: string, 
  itemValidator?: (item: unknown, index: number) => E.Either<ValidationError, T>
): E.Either<ValidationError, T[]> => {
  if (!isArray(value)) {
    return E.left(createValidationError(field, VALIDATION_CODES.TYPE_ERROR, `${field} must be an array`, value))
  }
  
  if (itemValidator) {
    const validatedItems: T[] = []
    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i], i)
      if (E.isLeft(itemResult)) {
        return E.left({
          ...itemResult.left,
          field: `${field}[${i}]`
        })
      }
      validatedItems.push(itemResult.right)
    }
    return E.right(validatedItems)
  }
  
  return E.right(value as T[])
}

const validateObject = (value: unknown, field: string): E.Either<ValidationError, Record<string, unknown>> => {
  if (!isObject(value)) {
    return E.left(createValidationError(field, VALIDATION_CODES.TYPE_ERROR, `${field} must be an object`, value))
  }
  return E.right(value)
}

const validateOptionalString = (value: unknown, field: string): E.Either<ValidationError, string | undefined> => {
  if (isOptionalField(value)) {
    return E.right(undefined)
  }
  return validateString(value, field)
}

const validateOptionalNumber = (value: unknown, field: string): E.Either<ValidationError, number | undefined> => {
  if (isOptionalField(value)) {
    return E.right(undefined)
  }
  return validateNumber(value, field)
}

const validateUnion = <T>(
  value: unknown,
  field: string,
  allowedValues: T[],
  typeName: string
): E.Either<ValidationError, T> => {
  if (!allowedValues.includes(value as T)) {
    return E.left(createValidationError(
      field,
      VALIDATION_CODES.CUSTOM,
      `${field} must be one of: ${allowedValues.join(', ')}`,
      value
    ))
  }
  return E.right(value as T)
}

const validatePositiveNumber = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (num < 0) {
        return E.left(createValidationError(field, VALIDATION_CODES.MIN_VALUE, `${field} must be positive`, value))
      }
      return E.right(num)
    })
  )
}

const validateNonNegativeNumber = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (num < 0) {
        return E.left(createValidationError(field, VALIDATION_CODES.MIN_VALUE, `${field} must be non-negative`, value))
      }
      return E.right(num)
    })
  )
}

const validatePercentage = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (num < 0 || num > 100) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be between 0 and 100`, value))
      }
      return E.right(num)
    })
  )
}

const validateProbability = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (num < 0 || num > 1) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be between 0 and 1`, value))
      }
      return E.right(num)
    })
  )
}

const validateAPR = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (num < 0 || num > 1000) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be between 0 and 1000 (reasonable APR)`, value))
      }
      return E.right(num)
    })
  )
}

const validateSafeNumber = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (Number.isNaN(num)) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} cannot be NaN`, value))
      }
      if (num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} cannot be infinite`, value))
      }
      if (!Number.isFinite(num)) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be finite`, value))
      }
      if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be within safe integer range`, value))
      }
      return E.right(num)
    })
  )
}

const validateInteger = (value: unknown, field: string): E.Either<ValidationError, number> => {
  return pipe(
    validateNumber(value, field),
    E.chain(num => {
      if (!Number.isInteger(num)) {
        return E.left(createValidationError(field, VALIDATION_CODES.CUSTOM, `${field} must be an integer`, value))
      }
      return E.right(num)
    })
  )
}

const validateStringLength = (
  value: unknown, 
  field: string, 
  minLength = 0, 
  maxLength = Infinity
): E.Either<ValidationError, string> => {
  return pipe(
    validateString(value, field),
    E.chain(str => {
      if (str.length < minLength) {
        return E.left(createValidationError(field, VALIDATION_CODES.MIN_LENGTH, `${field} must be at least ${minLength} characters`, value))
      }
      if (str.length > maxLength) {
        return E.left(createValidationError(field, VALIDATION_CODES.MAX_LENGTH, `${field} must be at most ${maxLength} characters`, value))
      }
      return E.right(str)
    })
  )
}

// ============================================================================
// SeiNetworkData Validator
// ============================================================================

export const validateSeiNetworkData: Validator<SeiNetworkData> = (value: unknown): E.Either<ValidationError[], SeiNetworkData> => {
  const errors: ValidationError[] = []
  
  const objResult = validateObject(value, 'SeiNetworkData')
  if (E.isLeft(objResult)) {
    return E.left([objResult.left])
  }
  
  const data = objResult.right
  
  // Validate required fields
  const networkIdResult = validateStringLength(data.networkId, 'networkId', 1, 50)
  if (E.isLeft(networkIdResult)) errors.push(networkIdResult.left)
  
  const chainIdResult = validateStringLength(data.chainId, 'chainId', 1, 50)
  if (E.isLeft(chainIdResult)) errors.push(chainIdResult.left)
  
  const statusResult = validateUnion(data.status, 'status', ['active', 'maintenance', 'degraded'], 'NetworkStatus')
  if (E.isLeft(statusResult)) errors.push(statusResult.left)
  
  const blockHeightResult = validatePositiveNumber(data.blockHeight, 'blockHeight')
  if (E.isLeft(blockHeightResult)) errors.push(blockHeightResult.left)
  
  const blockTimeResult = validatePositiveNumber(data.blockTime, 'blockTime')
  if (E.isLeft(blockTimeResult)) errors.push(blockTimeResult.left)
  
  const totalValidatorsResult = validatePositiveNumber(data.totalValidators, 'totalValidators')
  if (E.isLeft(totalValidatorsResult)) errors.push(totalValidatorsResult.left)
  
  const activeValidatorsResult = validatePositiveNumber(data.activeValidators, 'activeValidators')
  if (E.isLeft(activeValidatorsResult)) errors.push(activeValidatorsResult.left)
  
  const bondedTokensResult = validateString(data.bondedTokens, 'bondedTokens')
  if (E.isLeft(bondedTokensResult)) errors.push(bondedTokensResult.left)
  
  const stakingRatioResult = validateNumber(data.stakingRatio, 'stakingRatio')
  if (E.isLeft(stakingRatioResult)) errors.push(stakingRatioResult.left)
  
  const inflationResult = validateNumber(data.inflation, 'inflation')
  if (E.isLeft(inflationResult)) errors.push(inflationResult.left)
  
  const communityPoolResult = validateString(data.communityPool, 'communityPool')
  if (E.isLeft(communityPoolResult)) errors.push(communityPoolResult.left)
  
  // Validate nested governance object
  const governanceResult = validateObject(data.governance, 'governance')
  if (E.isLeft(governanceResult)) {
    errors.push(governanceResult.left)
  } else {
    const gov = governanceResult.right
    const activeProposalsResult = validatePositiveNumber(gov.activeProposals, 'governance.activeProposals')
    if (E.isLeft(activeProposalsResult)) errors.push(activeProposalsResult.left)
    
    const votingPeriodResult = validatePositiveNumber(gov.votingPeriod, 'governance.votingPeriod')
    if (E.isLeft(votingPeriodResult)) errors.push(votingPeriodResult.left)
    
    const depositPeriodResult = validatePositiveNumber(gov.depositPeriod, 'governance.depositPeriod')
    if (E.isLeft(depositPeriodResult)) errors.push(depositPeriodResult.left)
  }
  
  // Validate nested metrics object
  const metricsResult = validateObject(data.metrics, 'metrics')
  if (E.isLeft(metricsResult)) {
    errors.push(metricsResult.left)
  } else {
    const metrics = metricsResult.right
    const tpsResult = validatePositiveNumber(metrics.tps, 'metrics.tps')
    if (E.isLeft(tpsResult)) errors.push(tpsResult.left)
    
    const avgBlockTimeResult = validatePositiveNumber(metrics.avgBlockTime, 'metrics.avgBlockTime')
    if (E.isLeft(avgBlockTimeResult)) errors.push(avgBlockTimeResult.left)
    
    const avgGasPriceResult = validateString(metrics.avgGasPrice, 'metrics.avgGasPrice')
    if (E.isLeft(avgGasPriceResult)) errors.push(avgGasPriceResult.left)
    
    const networkHashRateResult = validateOptionalString(metrics.networkHashRate, 'metrics.networkHashRate')
    if (E.isLeft(networkHashRateResult)) errors.push(networkHashRateResult.left)
  }
  
  if (errors.length > 0) {
    return E.left(errors)
  }
  
  return E.right(data as unknown as SeiNetworkData)
}

// ============================================================================
// SeiTokenData Validator
// ============================================================================

export const validateSeiTokenData: Validator<SeiTokenData> = (value: unknown): E.Either<ValidationError[], SeiTokenData> => {
  const errors: ValidationError[] = []
  
  const objResult = validateObject(value, 'SeiTokenData')
  if (E.isLeft(objResult)) {
    return E.left([objResult.left])
  }
  
  const data = objResult.right
  
  // Validate required fields
  const symbolResult = validateStringLength(data.symbol, 'symbol', 1, 20)
  if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
  
  const nameResult = validateStringLength(data.name, 'name', 1, 100)
  if (E.isLeft(nameResult)) errors.push(nameResult.left)
  
  const addressResult = validateOptionalString(data.address, 'address')
  if (E.isLeft(addressResult)) errors.push(addressResult.left)
  
  const decimalsResult = validatePositiveNumber(data.decimals, 'decimals')
  if (E.isLeft(decimalsResult)) errors.push(decimalsResult.left)
  
  const totalSupplyResult = validateString(data.totalSupply, 'totalSupply')
  if (E.isLeft(totalSupplyResult)) errors.push(totalSupplyResult.left)
  
  const circulatingSupplyResult = validateString(data.circulatingSupply, 'circulatingSupply')
  if (E.isLeft(circulatingSupplyResult)) errors.push(circulatingSupplyResult.left)
  
  // Validate nested price object
  const priceResult = validateObject(data.price, 'price')
  if (E.isLeft(priceResult)) {
    errors.push(priceResult.left)
  } else {
    const price = priceResult.right
    const usdResult = validatePositiveNumber(price.usd, 'price.usd')
    if (E.isLeft(usdResult)) errors.push(usdResult.left)
    
    const change24hResult = validateNumber(price.change24h, 'price.change24h')
    if (E.isLeft(change24hResult)) errors.push(change24hResult.left)
    
    const change7dResult = validateNumber(price.change7d, 'price.change7d')
    if (E.isLeft(change7dResult)) errors.push(change7dResult.left)
    
    const marketCapResult = validatePositiveNumber(price.marketCap, 'price.marketCap')
    if (E.isLeft(marketCapResult)) errors.push(marketCapResult.left)
    
    const volume24hResult = validatePositiveNumber(price.volume24h, 'price.volume24h')
    if (E.isLeft(volume24hResult)) errors.push(volume24hResult.left)
    
    const rankResult = validateOptionalNumber(price.rank, 'price.rank')
    if (E.isLeft(rankResult)) errors.push(rankResult.left)
  }
  
  // Validate nested metadata object
  const metadataResult = validateObject(data.metadata, 'metadata')
  if (E.isLeft(metadataResult)) {
    errors.push(metadataResult.left)
  } else {
    const metadata = metadataResult.right
    const logoUrlResult = validateOptionalString(metadata.logoUrl, 'metadata.logoUrl')
    if (E.isLeft(logoUrlResult)) errors.push(logoUrlResult.left)
    
    const descriptionResult = validateOptionalString(metadata.description, 'metadata.description')
    if (E.isLeft(descriptionResult)) errors.push(descriptionResult.left)
    
    const websiteResult = validateOptionalString(metadata.website, 'metadata.website')
    if (E.isLeft(websiteResult)) errors.push(websiteResult.left)
    
    const twitterResult = validateOptionalString(metadata.twitter, 'metadata.twitter')
    if (E.isLeft(twitterResult)) errors.push(twitterResult.left)
    
    const coingeckoIdResult = validateOptionalString(metadata.coingeckoId, 'metadata.coingeckoId')
    if (E.isLeft(coingeckoIdResult)) errors.push(coingeckoIdResult.left)
    
    const isNativeResult = validateBoolean(metadata.isNative, 'metadata.isNative')
    if (E.isLeft(isNativeResult)) errors.push(isNativeResult.left)
    
    const isVerifiedResult = validateBoolean(metadata.isVerified, 'metadata.isVerified')
    if (E.isLeft(isVerifiedResult)) errors.push(isVerifiedResult.left)
  }
  
  if (errors.length > 0) {
    return E.left(errors)
  }
  
  return E.right(data as unknown as SeiTokenData)
}

// ============================================================================
// CryptoMarketData Validator
// ============================================================================

export const validateCryptoMarketData: Validator<CryptoMarketData> = (value: unknown): E.Either<ValidationError[], CryptoMarketData> => {
  const errors: ValidationError[] = []
  
  const objResult = validateObject(value, 'CryptoMarketData')
  if (E.isLeft(objResult)) {
    return E.left([objResult.left])
  }
  
  const data = objResult.right
  
  // Validate required fields
  const timestampResult = validatePositiveNumber(data.timestamp, 'timestamp')
  if (E.isLeft(timestampResult)) errors.push(timestampResult.left)
  
  // Validate tokens array
  const tokensResult = validateArray(data.tokens, 'tokens', (item, index) => {
    const tokenResult = validateSeiTokenData(item)
    if (E.isLeft(tokenResult)) {
      // Return the first error from the array, formatted for single item validation
      return E.left(tokenResult.left[0] || createValidationError(`tokens[${index}]`, VALIDATION_CODES.TYPE_ERROR, 'Invalid token data'))
    }
    return E.right(tokenResult.right)
  })
  if (E.isLeft(tokensResult)) {
    errors.push(tokensResult.left)
  }
  
  // Validate nested marketSummary object
  const marketSummaryResult = validateObject(data.marketSummary, 'marketSummary')
  if (E.isLeft(marketSummaryResult)) {
    errors.push(marketSummaryResult.left)
  } else {
    const summary = marketSummaryResult.right
    const totalMarketCapResult = validatePositiveNumber(summary.totalMarketCap, 'marketSummary.totalMarketCap')
    if (E.isLeft(totalMarketCapResult)) errors.push(totalMarketCapResult.left)
    
    const totalVolume24hResult = validatePositiveNumber(summary.totalVolume24h, 'marketSummary.totalVolume24h')
    if (E.isLeft(totalVolume24hResult)) errors.push(totalVolume24hResult.left)
    
    const btcDominanceResult = validateNumber(summary.btcDominance, 'marketSummary.btcDominance')
    if (E.isLeft(btcDominanceResult)) errors.push(btcDominanceResult.left)
    
    const ethDominanceResult = validateNumber(summary.ethDominance, 'marketSummary.ethDominance')
    if (E.isLeft(ethDominanceResult)) errors.push(ethDominanceResult.left)
    
    const defiTvlResult = validatePositiveNumber(summary.defiTvl, 'marketSummary.defiTvl')
    if (E.isLeft(defiTvlResult)) errors.push(defiTvlResult.left)
    
    const fearGreedIndexResult = validateOptionalNumber(summary.fearGreedIndex, 'marketSummary.fearGreedIndex')
    if (E.isLeft(fearGreedIndexResult)) errors.push(fearGreedIndexResult.left)
  }
  
  // Validate nested trending object
  const trendingResult = validateObject(data.trending, 'trending')
  if (E.isLeft(trendingResult)) {
    errors.push(trendingResult.left)
  } else {
    const trending = trendingResult.right
    
    // Validate gainers array
    const gainersResult = validateArray(trending.gainers, 'trending.gainers')
    if (E.isLeft(gainersResult)) {
      errors.push(gainersResult.left)
    } else {
      const gainers = gainersResult.right as unknown[]
      gainers.forEach((gainer, index) => {
        const gainerResult = validateObject(gainer, `trending.gainers[${index}]`)
        if (E.isLeft(gainerResult)) {
          errors.push(gainerResult.left)
        } else {
          const g = gainerResult.right
          const symbolResult = validateStringLength(g.symbol, `trending.gainers[${index}].symbol`, 1, 20)
          if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
          
          const change24hResult = validateNumber(g.change24h, `trending.gainers[${index}].change24h`)
          if (E.isLeft(change24hResult)) errors.push(change24hResult.left)
          
          const volume24hResult = validatePositiveNumber(g.volume24h, `trending.gainers[${index}].volume24h`)
          if (E.isLeft(volume24hResult)) errors.push(volume24hResult.left)
        }
      })
    }
    
    // Validate losers array
    const losersResult = validateArray(trending.losers, 'trending.losers')
    if (E.isLeft(losersResult)) {
      errors.push(losersResult.left)
    } else {
      const losers = losersResult.right as unknown[]
      losers.forEach((loser, index) => {
        const loserResult = validateObject(loser, `trending.losers[${index}]`)
        if (E.isLeft(loserResult)) {
          errors.push(loserResult.left)
        } else {
          const l = loserResult.right
          const symbolResult = validateStringLength(l.symbol, `trending.losers[${index}].symbol`, 1, 20)
          if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
          
          const change24hResult = validateNumber(l.change24h, `trending.losers[${index}].change24h`)
          if (E.isLeft(change24hResult)) errors.push(change24hResult.left)
          
          const volume24hResult = validatePositiveNumber(l.volume24h, `trending.losers[${index}].volume24h`)
          if (E.isLeft(volume24hResult)) errors.push(volume24hResult.left)
        }
      })
    }
    
    // Validate mostActive array
    const mostActiveResult = validateArray(trending.mostActive, 'trending.mostActive')
    if (E.isLeft(mostActiveResult)) {
      errors.push(mostActiveResult.left)
    } else {
      const mostActive = mostActiveResult.right as unknown[]
      mostActive.forEach((active, index) => {
        const activeResult = validateObject(active, `trending.mostActive[${index}]`)
        if (E.isLeft(activeResult)) {
          errors.push(activeResult.left)
        } else {
          const a = activeResult.right
          const symbolResult = validateStringLength(a.symbol, `trending.mostActive[${index}].symbol`, 1, 20)
          if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
          
          const volume24hResult = validatePositiveNumber(a.volume24h, `trending.mostActive[${index}].volume24h`)
          if (E.isLeft(volume24hResult)) errors.push(volume24hResult.left)
          
          const volumeChange24hResult = validateNumber(a.volumeChange24h, `trending.mostActive[${index}].volumeChange24h`)
          if (E.isLeft(volumeChange24hResult)) errors.push(volumeChange24hResult.left)
        }
      })
    }
  }
  
  if (errors.length > 0) {
    return E.left(errors)
  }
  
  return E.right(data as unknown as CryptoMarketData)
}

// ============================================================================
// SeiDeFiData Validator
// ============================================================================

export const validateSeiDeFiData: Validator<SeiDeFiData> = (value: unknown): E.Either<ValidationError[], SeiDeFiData> => {
  const errors: ValidationError[] = []
  
  const objResult = validateObject(value, 'SeiDeFiData')
  if (E.isLeft(objResult)) {
    return E.left([objResult.left])
  }
  
  const data = objResult.right
  
  // Validate protocols array
  const protocolsResult = validateArray(data.protocols, 'protocols')
  if (E.isLeft(protocolsResult)) {
    errors.push(protocolsResult.left)
  } else {
    const protocols = protocolsResult.right as unknown[]
    protocols.forEach((protocol, index) => {
      const protocolResult = validateObject(protocol, `protocols[${index}]`)
      if (E.isLeft(protocolResult)) {
        errors.push(protocolResult.left)
      } else {
        const p = protocolResult.right
        
        // Validate all required protocol fields
        const nameResult = validateStringLength(p.name, `protocols[${index}].name`, 1, 100)
        if (E.isLeft(nameResult)) errors.push(nameResult.left)
        
        const categoryResult = validateString(p.category, `protocols[${index}].category`)
        if (E.isLeft(categoryResult)) errors.push(categoryResult.left)
        
        const tvlResult = validatePositiveNumber(p.tvl, `protocols[${index}].tvl`)
        if (E.isLeft(tvlResult)) errors.push(tvlResult.left)
        
        const tvlChange24hResult = validateNumber(p.tvlChange24h, `protocols[${index}].tvlChange24h`)
        if (E.isLeft(tvlChange24hResult)) errors.push(tvlChange24hResult.left)
        
        const volume24hResult = validatePositiveNumber(p.volume24h, `protocols[${index}].volume24h`)
        if (E.isLeft(volume24hResult)) errors.push(volume24hResult.left)
        
        const fees24hResult = validatePositiveNumber(p.fees24h, `protocols[${index}].fees24h`)
        if (E.isLeft(fees24hResult)) errors.push(fees24hResult.left)
        
        const users24hResult = validatePositiveNumber(p.users24h, `protocols[${index}].users24h`)
        if (E.isLeft(users24hResult)) errors.push(users24hResult.left)
        
        // Validate chains array
        const chainsResult = validateArray(p.chains, `protocols[${index}].chains`)
        if (E.isLeft(chainsResult)) {
          errors.push(chainsResult.left)
        } else {
          const chains = chainsResult.right as unknown[]
          chains.forEach((chain, chainIndex) => {
            const chainResult = validateString(chain, `protocols[${index}].chains[${chainIndex}]`)
            if (E.isLeft(chainResult)) errors.push(chainResult.left)
          })
        }
        
        // Validate optional token object
        if (p.token !== undefined) {
          const tokenResult = validateObject(p.token, `protocols[${index}].token`)
          if (E.isLeft(tokenResult)) {
            errors.push(tokenResult.left)
          } else {
            const token = tokenResult.right
            const symbolResult = validateString(token.symbol, `protocols[${index}].token.symbol`)
            if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
            
            const priceResult = validatePositiveNumber(token.price, `protocols[${index}].token.price`)
            if (E.isLeft(priceResult)) errors.push(priceResult.left)
            
            const change24hResult = validateNumber(token.change24h, `protocols[${index}].token.change24h`)
            if (E.isLeft(change24hResult)) errors.push(change24hResult.left)
          }
        }
      }
    })
  }
  
  // Validate opportunities array
  const opportunitiesResult = validateArray(data.opportunities, 'opportunities')
  if (E.isLeft(opportunitiesResult)) {
    errors.push(opportunitiesResult.left)
  } else {
    const opportunities = opportunitiesResult.right as unknown[]
    opportunities.forEach((opportunity, index) => {
      const opportunityResult = validateObject(opportunity, `opportunities[${index}]`)
      if (E.isLeft(opportunityResult)) {
        errors.push(opportunityResult.left)
      } else {
        const o = opportunityResult.right
        
        // Validate all required opportunity fields
        const idResult = validateString(o.id, `opportunities[${index}].id`)
        if (E.isLeft(idResult)) errors.push(idResult.left)
        
        const protocolResult = validateString(o.protocol, `opportunities[${index}].protocol`)
        if (E.isLeft(protocolResult)) errors.push(protocolResult.left)
        
        const typeResult = validateUnion(o.type, `opportunities[${index}].type`, 
          ['lending', 'farming', 'staking', 'liquidity', 'arbitrage'], 'OpportunityType')
        if (E.isLeft(typeResult)) errors.push(typeResult.left)
        
        // Validate APR and APY as positive numbers
        const aprResult = validatePositiveNumber(o.apr, `opportunities[${index}].apr`)
        if (E.isLeft(aprResult)) errors.push(aprResult.left)
        
        const apyResult = validatePositiveNumber(o.apy, `opportunities[${index}].apy`)
        if (E.isLeft(apyResult)) errors.push(apyResult.left)
        
        const tvlResult = validatePositiveNumber(o.tvl, `opportunities[${index}].tvl`)
        if (E.isLeft(tvlResult)) errors.push(tvlResult.left)
        
        const riskResult = validateUnion(o.risk, `opportunities[${index}].risk`, 
          ['low', 'medium', 'high'], 'RiskLevel')
        if (E.isLeft(riskResult)) errors.push(riskResult.left)
        
        const descriptionResult = validateString(o.description, `opportunities[${index}].description`)
        if (E.isLeft(descriptionResult)) errors.push(descriptionResult.left)
        
        // Validate requirements object
        const requirementsResult = validateObject(o.requirements, `opportunities[${index}].requirements`)
        if (E.isLeft(requirementsResult)) {
          errors.push(requirementsResult.left)
        } else {
          const req = requirementsResult.right
          
          const minAmountResult = validateString(req.minAmount, `opportunities[${index}].requirements.minAmount`)
          if (E.isLeft(minAmountResult)) errors.push(minAmountResult.left)
          
          // Validate tokens array
          const tokensResult = validateArray(req.tokens, `opportunities[${index}].requirements.tokens`)
          if (E.isLeft(tokensResult)) {
            errors.push(tokensResult.left)
          } else {
            const tokens = tokensResult.right as unknown[]
            tokens.forEach((token, tokenIndex) => {
              const tokenResult = validateString(token, `opportunities[${index}].requirements.tokens[${tokenIndex}]`)
              if (E.isLeft(tokenResult)) errors.push(tokenResult.left)
            })
          }
          
          // Validate optional lockPeriod
          if (req.lockPeriod !== undefined && req.lockPeriod !== null) {
            const lockPeriodResult = validatePositiveNumber(req.lockPeriod, `opportunities[${index}].requirements.lockPeriod`)
            if (E.isLeft(lockPeriodResult)) errors.push(lockPeriodResult.left)
          }
        }
      }
    })
  }
  
  // Validate aggregatedMetrics object
  const aggregatedMetricsResult = validateObject(data.aggregatedMetrics, 'aggregatedMetrics')
  if (E.isLeft(aggregatedMetricsResult)) {
    errors.push(aggregatedMetricsResult.left)
  } else {
    const metrics = aggregatedMetricsResult.right
    
    // Validate totalTvl property specifically
    const totalTvlResult = validatePositiveNumber(metrics.totalTvl, 'aggregatedMetrics.totalTvl')
    if (E.isLeft(totalTvlResult)) errors.push(totalTvlResult.left)
    
    const totalVolume24hResult = validatePositiveNumber(metrics.totalVolume24h, 'aggregatedMetrics.totalVolume24h')
    if (E.isLeft(totalVolume24hResult)) errors.push(totalVolume24hResult.left)
    
    const totalFees24hResult = validatePositiveNumber(metrics.totalFees24h, 'aggregatedMetrics.totalFees24h')
    if (E.isLeft(totalFees24hResult)) errors.push(totalFees24hResult.left)
    
    const protocolCountResult = validatePositiveNumber(metrics.protocolCount, 'aggregatedMetrics.protocolCount')
    if (E.isLeft(protocolCountResult)) errors.push(protocolCountResult.left)
    
    const avgAprResult = validatePositiveNumber(metrics.avgApr, 'aggregatedMetrics.avgApr')
    if (E.isLeft(avgAprResult)) errors.push(avgAprResult.left)
    
    const topCategoryResult = validateString(metrics.topCategory, 'aggregatedMetrics.topCategory')
    if (E.isLeft(topCategoryResult)) errors.push(topCategoryResult.left)
  }
  
  if (errors.length > 0) {
    return E.left(errors)
  }
  
  return E.right(data as unknown as SeiDeFiData)
}

// ============================================================================
// SeiWalletAnalysis Validator
// ============================================================================

export const validateSeiWalletAnalysis: Validator<SeiWalletAnalysis> = (value: unknown): E.Either<ValidationError[], SeiWalletAnalysis> => {
  const errors: ValidationError[] = []
  
  const objResult = validateObject(value, 'SeiWalletAnalysis')
  if (E.isLeft(objResult)) {
    return E.left([objResult.left])
  }
  
  const data = objResult.right
  
  // Validate required fields
  const addressResult = validateStringLength(data.address, 'address', 1, 100)
  if (E.isLeft(addressResult)) errors.push(addressResult.left)
  
  // Validate nested totalValue object
  const totalValueResult = validateObject(data.totalValue, 'totalValue')
  if (E.isLeft(totalValueResult)) {
    errors.push(totalValueResult.left)
  } else {
    const totalValue = totalValueResult.right
    const usdResult = pipe(
      validateSafeNumber(totalValue.usd, 'totalValue.usd'),
      E.chain(num => validateNonNegativeNumber(num, 'totalValue.usd'))
    )
    if (E.isLeft(usdResult)) errors.push(usdResult.left)
    
    const nativeResult = validateString(totalValue.native, 'totalValue.native')
    if (E.isLeft(nativeResult)) errors.push(nativeResult.left)
  }
  
  // Validate holdings array
  const holdingsResult = validateArray(data.holdings, 'holdings')
  if (E.isLeft(holdingsResult)) {
    errors.push(holdingsResult.left)
  } else {
    const holdings = holdingsResult.right as unknown[]
    holdings.forEach((holding, index) => {
      const holdingResult = validateObject(holding, `holdings[${index}]`)
      if (E.isLeft(holdingResult)) {
        errors.push(holdingResult.left)
      } else {
        const h = holdingResult.right
        
        // Validate token (required)
        const tokenResult = validateSeiTokenData(h.token)
        if (E.isLeft(tokenResult)) {
          tokenResult.left.forEach(error => {
            errors.push({
              ...error,
              field: `holdings[${index}].token.${error.field}`
            })
          })
        }
        
        // Validate amount (required)
        const amountResult = validateString(h.amount, `holdings[${index}].amount`)
        if (E.isLeft(amountResult)) errors.push(amountResult.left)
        
        // Validate value (required)
        const valueResult = pipe(
          validateSafeNumber(h.value, `holdings[${index}].value`),
          E.chain(num => validateNonNegativeNumber(num, `holdings[${index}].value`))
        )
        if (E.isLeft(valueResult)) errors.push(valueResult.left)
        
        // Validate percentage (required, 0-100)
        const percentageResult = validatePercentage(h.percentage, `holdings[${index}].percentage`)
        if (E.isLeft(percentageResult)) errors.push(percentageResult.left)
        
        // Validate optional costBasis
        const costBasisResult = validateOptionalNumber(h.costBasis, `holdings[${index}].costBasis`)
        if (E.isLeft(costBasisResult)) errors.push(costBasisResult.left)
        
        // Validate optional pnl object
        if (h.pnl !== undefined) {
          const pnlResult = validateObject(h.pnl, `holdings[${index}].pnl`)
          if (E.isLeft(pnlResult)) {
            errors.push(pnlResult.left)
          } else {
            const pnl = pnlResult.right
            const realizedResult = validateNumber(pnl.realized, `holdings[${index}].pnl.realized`)
            if (E.isLeft(realizedResult)) errors.push(realizedResult.left)
            
            const unrealizedResult = validateNumber(pnl.unrealized, `holdings[${index}].pnl.unrealized`)
            if (E.isLeft(unrealizedResult)) errors.push(unrealizedResult.left)
            
            const pnlPercentageResult = validateNumber(pnl.percentage, `holdings[${index}].pnl.percentage`)
            if (E.isLeft(pnlPercentageResult)) errors.push(pnlPercentageResult.left)
          }
        }
      }
    })
  }
  
  // Validate performance object (required)
  const performanceResult = validateObject(data.performance, 'performance')
  if (E.isLeft(performanceResult)) {
    errors.push(performanceResult.left)
  } else {
    const performance = performanceResult.right
    
    // Validate performance metrics
    const totalReturnResult = validateNumber(performance.totalReturn, 'performance.totalReturn')
    if (E.isLeft(totalReturnResult)) errors.push(totalReturnResult.left)
    
    const totalReturnPercentageResult = validateNumber(performance.totalReturnPercentage, 'performance.totalReturnPercentage')
    if (E.isLeft(totalReturnPercentageResult)) errors.push(totalReturnPercentageResult.left)
    
    // Validate bestAsset object
    const bestAssetResult = validateObject(performance.bestAsset, 'performance.bestAsset')
    if (E.isLeft(bestAssetResult)) {
      errors.push(bestAssetResult.left)
    } else {
      const bestAsset = bestAssetResult.right
      const symbolResult = validateStringLength(bestAsset.symbol, 'performance.bestAsset.symbol', 1, 20)
      if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
      
      const returnResult = validateNumber(bestAsset.return, 'performance.bestAsset.return')
      if (E.isLeft(returnResult)) errors.push(returnResult.left)
      
      const returnPercentageResult = validateNumber(bestAsset.returnPercentage, 'performance.bestAsset.returnPercentage')
      if (E.isLeft(returnPercentageResult)) errors.push(returnPercentageResult.left)
    }
    
    // Validate worstAsset object
    const worstAssetResult = validateObject(performance.worstAsset, 'performance.worstAsset')
    if (E.isLeft(worstAssetResult)) {
      errors.push(worstAssetResult.left)
    } else {
      const worstAsset = worstAssetResult.right
      const symbolResult = validateStringLength(worstAsset.symbol, 'performance.worstAsset.symbol', 1, 20)
      if (E.isLeft(symbolResult)) errors.push(symbolResult.left)
      
      const returnResult = validateNumber(worstAsset.return, 'performance.worstAsset.return')
      if (E.isLeft(returnResult)) errors.push(returnResult.left)
      
      const returnPercentageResult = validateNumber(worstAsset.returnPercentage, 'performance.worstAsset.returnPercentage')
      if (E.isLeft(returnPercentageResult)) errors.push(returnPercentageResult.left)
    }
    
    // Validate riskMetrics object
    const riskMetricsResult = validateObject(performance.riskMetrics, 'performance.riskMetrics')
    if (E.isLeft(riskMetricsResult)) {
      errors.push(riskMetricsResult.left)
    } else {
      const riskMetrics = riskMetricsResult.right
      
      // Validate volatility (must be positive)
      const volatilityResult = validatePositiveNumber(riskMetrics.volatility, 'performance.riskMetrics.volatility')
      if (E.isLeft(volatilityResult)) errors.push(volatilityResult.left)
      
      // Validate sharpeRatio (can be negative)
      const sharpeRatioResult = validateNumber(riskMetrics.sharpeRatio, 'performance.riskMetrics.sharpeRatio')
      if (E.isLeft(sharpeRatioResult)) errors.push(sharpeRatioResult.left)
      
      // Validate maxDrawdown (must be between 0-1)
      const maxDrawdownResult = validateProbability(riskMetrics.maxDrawdown, 'performance.riskMetrics.maxDrawdown')
      if (E.isLeft(maxDrawdownResult)) errors.push(maxDrawdownResult.left)
      
      // Validate beta (can be negative)
      const betaResult = validateNumber(riskMetrics.beta, 'performance.riskMetrics.beta')
      if (E.isLeft(betaResult)) errors.push(betaResult.left)
    }
  }
  
  // Validate recommendations array (required)
  const recommendationsResult = validateArray(data.recommendations, 'recommendations')
  if (E.isLeft(recommendationsResult)) {
    errors.push(recommendationsResult.left)
  } else {
    const recommendations = recommendationsResult.right as unknown[]
    recommendations.forEach((recommendation, index) => {
      const recResult = validateObject(recommendation, `recommendations[${index}]`)
      if (E.isLeft(recResult)) {
        errors.push(recResult.left)
      } else {
        const rec = recResult.right
        
        // Validate required fields
        const idResult = validateStringLength(rec.id, `recommendations[${index}].id`, 1, 50)
        if (E.isLeft(idResult)) errors.push(idResult.left)
        
        const typeResult = validateUnion(rec.type, `recommendations[${index}].type`, 
          ['diversification', 'rebalancing', 'opportunity', 'risk'], 'RecommendationType')
        if (E.isLeft(typeResult)) errors.push(typeResult.left)
        
        const priorityResult = validateUnion(rec.priority, `recommendations[${index}].priority`,
          ['high', 'medium', 'low'], 'Priority')
        if (E.isLeft(priorityResult)) errors.push(priorityResult.left)
        
        const titleResult = validateStringLength(rec.title, `recommendations[${index}].title`, 1, 100)
        if (E.isLeft(titleResult)) errors.push(titleResult.left)
        
        const descriptionResult = validateStringLength(rec.description, `recommendations[${index}].description`, 1, 500)
        if (E.isLeft(descriptionResult)) errors.push(descriptionResult.left)
        
        // Validate actionItems array
        const actionItemsResult = validateArray(rec.actionItems, `recommendations[${index}].actionItems`)
        if (E.isLeft(actionItemsResult)) {
          errors.push(actionItemsResult.left)
        } else {
          const actionItems = actionItemsResult.right as unknown[]
          actionItems.forEach((item, itemIndex) => {
            const itemResult = validateStringLength(item, `recommendations[${index}].actionItems[${itemIndex}]`, 1, 100)
            if (E.isLeft(itemResult)) errors.push(itemResult.left)
          })
        }
        
        // Validate expectedImpact object
        const impactResult = validateObject(rec.expectedImpact, `recommendations[${index}].expectedImpact`)
        if (E.isLeft(impactResult)) {
          errors.push(impactResult.left)
        } else {
          const impact = impactResult.right
          
          const impactTypeResult = validateUnion(impact.type, `recommendations[${index}].expectedImpact.type`,
            ['return', 'risk', 'efficiency'], 'ImpactType')
          if (E.isLeft(impactTypeResult)) errors.push(impactTypeResult.left)
          
          const valueResult = validateNumber(impact.value, `recommendations[${index}].expectedImpact.value`)
          if (E.isLeft(valueResult)) errors.push(valueResult.left)
          
          const timeframeResult = validateStringLength(impact.timeframe, `recommendations[${index}].expectedImpact.timeframe`, 1, 50)
          if (E.isLeft(timeframeResult)) errors.push(timeframeResult.left)
        }
      }
    })
  }
  
  // Validate defiPositions array (required)
  const defiPositionsResult = validateArray(data.defiPositions, 'defiPositions')
  if (E.isLeft(defiPositionsResult)) {
    errors.push(defiPositionsResult.left)
  } else {
    const defiPositions = defiPositionsResult.right as unknown[]
    defiPositions.forEach((position, index) => {
      const posResult = validateObject(position, `defiPositions[${index}]`)
      if (E.isLeft(posResult)) {
        errors.push(posResult.left)
      } else {
        const pos = posResult.right
        
        // Validate required fields
        const protocolResult = validateStringLength(pos.protocol, `defiPositions[${index}].protocol`, 1, 50)
        if (E.isLeft(protocolResult)) errors.push(protocolResult.left)
        
        const typeResult = validateUnion(pos.type, `defiPositions[${index}].type`,
          ['lending', 'farming', 'staking', 'liquidity'], 'DefiPositionType')
        if (E.isLeft(typeResult)) errors.push(typeResult.left)
        
        // Validate tokens array
        const tokensResult = validateArray(pos.tokens, `defiPositions[${index}].tokens`)
        if (E.isLeft(tokensResult)) {
          errors.push(tokensResult.left)
        } else {
          const tokens = tokensResult.right as unknown[]
          tokens.forEach((token, tokenIndex) => {
            const tokenResult = validateStringLength(token, `defiPositions[${index}].tokens[${tokenIndex}]`, 1, 20)
            if (E.isLeft(tokenResult)) errors.push(tokenResult.left)
          })
        }
        
        const valueResult = validatePositiveNumber(pos.value, `defiPositions[${index}].value`)
        if (E.isLeft(valueResult)) errors.push(valueResult.left)
        
        const aprResult = validateAPR(pos.apr, `defiPositions[${index}].apr`)
        if (E.isLeft(aprResult)) errors.push(aprResult.left)
        
        // Validate rewards object
        const rewardsResult = validateObject(pos.rewards, `defiPositions[${index}].rewards`)
        if (E.isLeft(rewardsResult)) {
          errors.push(rewardsResult.left)
        } else {
          const rewards = rewardsResult.right
          
          const pendingResult = pipe(
            validateSafeNumber(rewards.pending, `defiPositions[${index}].rewards.pending`),
            E.chain(num => validateNonNegativeNumber(num, `defiPositions[${index}].rewards.pending`))
          )
          if (E.isLeft(pendingResult)) errors.push(pendingResult.left)
          
          const claimedResult = pipe(
            validateSafeNumber(rewards.claimed, `defiPositions[${index}].rewards.claimed`),
            E.chain(num => validateNonNegativeNumber(num, `defiPositions[${index}].rewards.claimed`))
          )
          if (E.isLeft(claimedResult)) errors.push(claimedResult.left)
        }
        
        const riskLevelResult = validateUnion(pos.riskLevel, `defiPositions[${index}].riskLevel`,
          ['low', 'medium', 'high'], 'RiskLevel')
        if (E.isLeft(riskLevelResult)) errors.push(riskLevelResult.left)
      }
    })
  }
  
  // Validate transactionHistory object (required)
  const txHistoryResult = validateObject(data.transactionHistory, 'transactionHistory')
  if (E.isLeft(txHistoryResult)) {
    errors.push(txHistoryResult.left)
  } else {
    const txHistory = txHistoryResult.right
    
    // Validate totalTransactions (must be non-negative integer)
    const totalTxResult = pipe(
      validateNonNegativeNumber(txHistory.totalTransactions, 'transactionHistory.totalTransactions'),
      E.chain(num => validateInteger(num, 'transactionHistory.totalTransactions'))
    )
    if (E.isLeft(totalTxResult)) errors.push(totalTxResult.left)
    
    // Validate avgGasSpent (must be non-negative)
    const avgGasResult = validateNonNegativeNumber(txHistory.avgGasSpent, 'transactionHistory.avgGasSpent')
    if (E.isLeft(avgGasResult)) errors.push(avgGasResult.left)
    
    // Validate mostUsedProtocols array
    const protocolsResult = validateArray(txHistory.mostUsedProtocols, 'transactionHistory.mostUsedProtocols')
    if (E.isLeft(protocolsResult)) {
      errors.push(protocolsResult.left)
    } else {
      const protocols = protocolsResult.right as unknown[]
      protocols.forEach((protocol, protocolIndex) => {
        const protocolResult = validateStringLength(protocol, `transactionHistory.mostUsedProtocols[${protocolIndex}]`, 1, 50)
        if (E.isLeft(protocolResult)) errors.push(protocolResult.left)
      })
    }
    
    // Validate tradingPairs array
    const tradingPairsResult = validateArray(txHistory.tradingPairs, 'transactionHistory.tradingPairs')
    if (E.isLeft(tradingPairsResult)) {
      errors.push(tradingPairsResult.left)
    } else {
      const tradingPairs = tradingPairsResult.right as unknown[]
      tradingPairs.forEach((pair, pairIndex) => {
        const pairResult = validateObject(pair, `transactionHistory.tradingPairs[${pairIndex}]`)
        if (E.isLeft(pairResult)) {
          errors.push(pairResult.left)
        } else {
          const p = pairResult.right
          
          const pairNameResult = validateStringLength(p.pair, `transactionHistory.tradingPairs[${pairIndex}].pair`, 1, 50)
          if (E.isLeft(pairNameResult)) errors.push(pairNameResult.left)
          
          const volumeResult = validatePositiveNumber(p.volume, `transactionHistory.tradingPairs[${pairIndex}].volume`)
          if (E.isLeft(volumeResult)) errors.push(volumeResult.left)
          
          const frequencyResult = pipe(
            validateNonNegativeNumber(p.frequency, `transactionHistory.tradingPairs[${pairIndex}].frequency`),
            E.chain(num => validateInteger(num, `transactionHistory.tradingPairs[${pairIndex}].frequency`))
          )
          if (E.isLeft(frequencyResult)) errors.push(frequencyResult.left)
        }
      })
    }
  }
  
  if (errors.length > 0) {
    return E.left(errors)
  }
  
  return E.right(data as unknown as SeiWalletAnalysis)
}

// ============================================================================
// Utility Functions
// ============================================================================

export const createValidationResult = <T>(
  isValid: boolean,
  data?: T,
  errors: ValidationError[] = [],
  warnings: string[] = []
): ValidationResult<T> => ({
  isValid,
  data,
  errors,
  warnings
})

export const validateWithResult = <T>(
  validator: Validator<T>,
  data: unknown
): ValidationResult<T> => {
  const result = validator(data)
  if (E.isLeft(result)) {
    return createValidationResult<T>(false, undefined, result.left)
  }
  return createValidationResult(true, result.right)
}

// Export all validators
export const validators = {
  seiNetworkData: validateSeiNetworkData,
  seiTokenData: validateSeiTokenData,
  cryptoMarketData: validateCryptoMarketData,
  seiDeFiData: validateSeiDeFiData,
  seiWalletAnalysis: validateSeiWalletAnalysis
} as const

export type ValidatorType = keyof typeof validators