import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { PublicClient, WalletClient, encodeFunctionData, parseAbi } from 'viem';

import {
  LiquidityPosition,
  PoolInfo,
  LiquidityParams,
  RemoveLiquidityParams,
  CollectFeesParams,
  LiquidityResult,
  LiquidityError,
  AddLiquidityResponse,
  RemoveLiquidityResponse,
  CollectFeesResponse,
  PositionValue
} from './types';
import {
  DRAGONSWAP_V2_ADDRESSES,
  FEE_TIERS,
  TICK_SPACINGS,
  GAS_LIMITS
} from './constants';
import {
  getSqrtRatioAtTick,
  getAmountsForLiquidity,
  getLiquidityForAmounts,
  validateTickRange,
  calculatePositionValueUSD
} from './utils';

// DragonSwap V2 Position Manager ABI (subset)
const POSITION_MANAGER_ABI = parseAbi([
  'function mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256)) external returns (uint256,uint128,uint256,uint256)',
  'function increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256)) external returns (uint128,uint256,uint256)',
  'function decreaseLiquidity((uint256,uint128,uint256,uint256,uint256)) external returns (uint256,uint256)',
  'function collect((uint256,address,uint128,uint128)) external returns (uint256,uint256)',
  'function positions(uint256) external view returns (uint96,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)',
  'function tokenOfOwnerByIndex(address,uint256) external view returns (uint256)'
]);

// Pool ABI (subset)
const POOL_ABI = parseAbi([
  'function slot0() external view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)',
  'function liquidity() external view returns (uint128)',
  'function feeGrowthGlobal0X128() external view returns (uint256)',
  'function feeGrowthGlobal1X128() external view returns (uint256)',
  'function protocolFees() external view returns (uint128,uint128)'
]);

export class DragonSwapAdapter {
  private publicClient: PublicClient;
  private walletClient: WalletClient;

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  /**
   * Add liquidity to a pool
   */
  public addLiquidity = (params: LiquidityParams): TE.TaskEither<LiquidityError, AddLiquidityResponse> =>
    pipe(
      this.validateLiquidityParams(params),
      TE.fromEither,
      TE.chain(() => this.executeMint(params))
    );

  /**
   * Remove liquidity from a position
   */
  public removeLiquidity = (params: RemoveLiquidityParams): TE.TaskEither<LiquidityError, RemoveLiquidityResponse> =>
    pipe(
      this.validatePosition(params.positionId),
      TE.chain(() => this.executeDecreaseLiquidity(params))
    );

  /**
   * Collect fees from a position
   */
  public collectFees = (params: CollectFeesParams): TE.TaskEither<LiquidityError, CollectFeesResponse> =>
    pipe(
      this.validatePosition(params.positionId),
      TE.chain(() => this.executeCollect(params))
    );

  /**
   * Adjust position range
   */
  public adjustRange = (
    positionId: string,
    newTickLower: number,
    newTickUpper: number
  ): TE.TaskEither<LiquidityError, AddLiquidityResponse> =>
    pipe(
      this.getPosition(positionId),
      TE.chain(position => {
        // Remove current liquidity
        return pipe(
          this.removeLiquidity({
            positionId,
            liquidity: position.liquidity,
            amount0Min: 0n,
            amount1Min: 0n,
            deadline: Math.floor(Date.now() / 1000) + 300
          }),
          TE.chain(removeResult => {
            // Add new position with adjusted range
            return this.addLiquidity({
              token0: position.token0,
              token1: position.token1,
              fee: FEE_TIERS.MEDIUM, // Default fee tier
              tickLower: newTickLower,
              tickUpper: newTickUpper,
              amount0Desired: removeResult.amount0,
              amount1Desired: removeResult.amount1,
              amount0Min: 0n,
              amount1Min: 0n,
              deadline: Math.floor(Date.now() / 1000) + 300
            });
          })
        );
      })
    );

  /**
   * Get user positions
   */
  public getPositions = (userAddress: string): TE.TaskEither<LiquidityError, LiquidityPosition[]> =>
    TE.tryCatch(
      async () => {
        // Get position count (simplified - in practice would use balance)
        const positions: LiquidityPosition[] = [];
        
        for (let i = 0; i < 10; i++) { // Check first 10 positions
          try {
            const positionId = await this.publicClient.readContract({
              address: DRAGONSWAP_V2_ADDRESSES.POSITION_MANAGER,
              abi: POSITION_MANAGER_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [userAddress as `0x${string}`, BigInt(i)]
            });

            const position = await this.getPositionData(positionId.toString());
            if (E.isRight(position)) {
              positions.push(position.right);
            }
          } catch {
            break; // No more positions
          }
        }

        return positions;
      },
      (error) => ({ type: 'position_not_found', positionId: 'all' }) as LiquidityError
    );

  /**
   * Get pool information
   */
  public getPoolInfo = (token0: string, token1: string, fee: number): TE.TaskEither<LiquidityError, PoolInfo> =>
    TE.tryCatch(
      async () => {
        const poolAddress = await this.getPoolAddress(token0, token1, fee);
        
        const [slot0, liquidity, feeGrowthGlobal0, feeGrowthGlobal1, protocolFees] = await Promise.all([
          this.publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'slot0'
          }),
          this.publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'liquidity'
          }),
          this.publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'feeGrowthGlobal0X128'
          }),
          this.publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'feeGrowthGlobal1X128'
          }),
          this.publicClient.readContract({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: 'protocolFees'
          })
        ]);

        return {
          token0,
          token1,
          fee,
          tickSpacing: TICK_SPACINGS[fee as keyof typeof TICK_SPACINGS] || 60,
          sqrtPriceX96: slot0[0],
          tick: slot0[1],
          liquidity: liquidity,
          feeGrowthGlobal0X128: feeGrowthGlobal0,
          feeGrowthGlobal1X128: feeGrowthGlobal1,
          protocolFees: [protocolFees[0], protocolFees[1]]
        };
      },
      (error) => ({ type: 'pool_not_exists', token0, token1 }) as LiquidityError
    );

  // Private helper methods

  private validateLiquidityParams = (params: LiquidityParams): LiquidityResult<LiquidityParams> => {
    if (!validateTickRange(params.tickLower, params.tickUpper, TICK_SPACINGS[params.fee as keyof typeof TICK_SPACINGS] || 60)) {
      return E.left({ type: 'invalid_range', tickLower: params.tickLower, tickUpper: params.tickUpper });
    }
    return E.right(params);
  };

  private validatePosition = (positionId: string): TE.TaskEither<LiquidityError, LiquidityPosition> =>
    this.getPosition(positionId);

  private getPosition = (positionId: string): TE.TaskEither<LiquidityError, LiquidityPosition> =>
    TE.tryCatch(
      async () => {
        const position = await this.getPositionData(positionId);
        if (E.isLeft(position)) {
          throw new Error('Position not found');
        }
        return position.right;
      },
      () => ({ type: 'position_not_found', positionId }) as LiquidityError
    );

  private getPositionData = async (positionId: string): Promise<LiquidityResult<LiquidityPosition>> => {
    try {
      const positionData = await this.publicClient.readContract({
        address: DRAGONSWAP_V2_ADDRESSES.POSITION_MANAGER,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [BigInt(positionId)]
      });

      const [nonce, operator, token0, token1, fee, tickLower, tickUpper, liquidity, 
             feeGrowthInside0LastX128, feeGrowthInside1LastX128, tokensOwed0, tokensOwed1] = positionData;

      // Get current pool price to determine if position is in range
      const poolInfo = await this.getPoolInfo(token0, token1, fee)();
      const currentTick = E.isRight(poolInfo) ? poolInfo.right.tick : 0;

      return E.right({
        positionId,
        token0,
        token1,
        liquidity,
        tickLower,
        tickUpper,
        feeGrowthInside0LastX128,
        feeGrowthInside1LastX128,
        tokensOwed0,
        tokensOwed1,
        currentPrice: 0, // Would calculate from sqrtPriceX96
        inRange: currentTick >= tickLower && currentTick <= tickUpper
      });
    } catch (error) {
      return E.left({ type: 'position_not_found', positionId });
    }
  };

  private executeMint = (params: LiquidityParams): TE.TaskEither<LiquidityError, AddLiquidityResponse> =>
    TE.tryCatch(
      async () => {
        const mintParams = [
          params.token0,
          params.token1,
          params.fee,
          params.tickLower,
          params.tickUpper,
          params.amount0Desired,
          params.amount1Desired,
          params.amount0Min,
          params.amount1Min,
          await this.walletClient.account?.address,
          params.deadline
        ];

        const hash = await this.walletClient.writeContract({
          address: DRAGONSWAP_V2_ADDRESSES.POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: 'mint',
          args: [mintParams],
          gas: BigInt(GAS_LIMITS.ADD_LIQUIDITY)
        });

        // Wait for transaction and get receipt
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        
        // Extract position ID and amounts from logs (simplified)
        return {
          positionId: '1', // Would extract from logs
          liquidity: 1000n, // Would extract from logs
          amount0: params.amount0Desired,
          amount1: params.amount1Desired,
          txHash: hash
        };
      },
      (error) => ({ type: 'insufficient_liquidity', pool: `${params.token0}/${params.token1}` }) as LiquidityError
    );

  private executeDecreaseLiquidity = (params: RemoveLiquidityParams): TE.TaskEither<LiquidityError, RemoveLiquidityResponse> =>
    TE.tryCatch(
      async () => {
        const decreaseParams = [
          BigInt(params.positionId),
          params.liquidity,
          params.amount0Min,
          params.amount1Min,
          params.deadline
        ];

        const hash = await this.walletClient.writeContract({
          address: DRAGONSWAP_V2_ADDRESSES.POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: 'decreaseLiquidity',
          args: [decreaseParams],
          gas: BigInt(GAS_LIMITS.REMOVE_LIQUIDITY)
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return {
          amount0: 1000n, // Would extract from logs
          amount1: 500n,  // Would extract from logs
          txHash: hash
        };
      },
      (error) => ({ type: 'position_not_found', positionId: params.positionId }) as LiquidityError
    );

  private executeCollect = (params: CollectFeesParams): TE.TaskEither<LiquidityError, CollectFeesResponse> =>
    TE.tryCatch(
      async () => {
        const collectParams = [
          BigInt(params.positionId),
          await this.walletClient.account?.address,
          params.amount0Max,
          params.amount1Max
        ];

        const hash = await this.walletClient.writeContract({
          address: DRAGONSWAP_V2_ADDRESSES.POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: 'collect',
          args: [collectParams],
          gas: BigInt(GAS_LIMITS.COLLECT_FEES)
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return {
          amount0: 10n, // Would extract from logs
          amount1: 5n,  // Would extract from logs
          txHash: hash
        };
      },
      (error) => ({ type: 'position_not_found', positionId: params.positionId }) as LiquidityError
    );

  private getPoolAddress = async (token0: string, token1: string, fee: number): Promise<`0x${string}`> => {
    // Simplified - would use factory to compute pool address
    return '0x0000000000000000000000000000000000000006' as `0x${string}`;
  };
}

// Factory function for creating adapter instance
export const createDragonSwapAdapter = (
  publicClient: PublicClient,
  walletClient: WalletClient
): DragonSwapAdapter => {
  return new DragonSwapAdapter(publicClient, walletClient);
};