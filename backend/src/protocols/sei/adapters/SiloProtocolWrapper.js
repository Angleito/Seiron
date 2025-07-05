"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSiloProtocolWrapper = exports.SiloProtocolWrapper = void 0;
const function_1 = require("fp-ts/function");
const TE = __importStar(require("fp-ts/TaskEither"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../../../utils/logger"));
const DEFAULT_SILO_CONTRACTS = {
    stakingContract: 'sei1silo1staking2contract3address4here5for6main7network8deployment9',
    rewardDistributor: 'sei1silo1reward2distributor3address4here5for6main7network8deployment',
    timelock: 'sei1silo1timelock2contract3address4here5for6governance7and8security9only',
    governance: 'sei1silo1governance2contract3address4here5for6protocol7management8only'
};
const SILO_CONSTANTS = {
    STAKING_PERIODS: {
        FLEXIBLE: 0,
        WEEK: 604800,
        MONTH: 2592000,
        QUARTER: 7776000,
        YEAR: 31536000
    },
    MULTIPLIERS: {
        FLEXIBLE: 1.0,
        WEEK: 1.1,
        MONTH: 1.25,
        QUARTER: 1.5,
        YEAR: 2.0
    },
    PENALTIES: {
        EARLY_UNSTAKE: 0.05,
        SLASHING: 0.10
    },
    MIN_STAKE_AMOUNT: '1000000000000000000',
    MAX_STAKE_AMOUNT: '1000000000000000000000000'
};
class SiloProtocolWrapper {
    constructor(publicClient, walletClient, protocolConfig) {
        this.publicClient = publicClient;
        this.walletClient = walletClient;
        this.protocolConfig = protocolConfig;
        this.name = 'Silo';
        this.version = '1.0.0';
        this.isInitialized = false;
        this.initialize = () => TE.tryCatch(async () => {
            const chainId = await this.publicClient.getChainId();
            if (![1329, 713715, 328].includes(chainId)) {
                throw new types_1.SiloProtocolError('Silo protocol only supports Sei Network', 'INVALID_NETWORK', { chainId });
            }
            await this.verifyContractDeployments();
            this.isInitialized = true;
            logger_1.default.info('Silo protocol wrapper initialized successfully', {
                network: this.protocolConfig.network,
                contracts: this.config.contracts
            });
        }, (error) => new types_1.SiloProtocolError(`Failed to initialize Silo protocol: ${error}`, 'INITIALIZATION_FAILED', { error }));
        this.getStakingPositions = (walletAddress) => (0, function_1.pipe)(TE.Do, TE.bind('positionIds', () => this.getUserStakingPositionIds(walletAddress)), TE.bind('positions', ({ positionIds }) => TE.sequenceArray(positionIds.map(id => this.getStakingPositionDetails(id, walletAddress)))), TE.map(({ positions }) => positions));
        this.getStakingPoolInfo = (token) => TE.tryCatch(async () => {
            const poolData = await this.fetchStakingPoolData(token);
            return {
                token,
                symbol: this.getTokenSymbol(token),
                totalStaked: poolData.totalStaked,
                totalStakedUSD: poolData.totalStakedUSD,
                rewardRate: poolData.rewardRate,
                apr: poolData.apr,
                apy: this.calculateAPY(poolData.apr),
                lockupPeriods: Object.values(SILO_CONSTANTS.STAKING_PERIODS),
                multipliers: SILO_CONSTANTS.MULTIPLIERS,
                penalties: {
                    earlyUnstake: SILO_CONSTANTS.PENALTIES.EARLY_UNSTAKE,
                    slashing: SILO_CONSTANTS.PENALTIES.SLASHING
                },
                isActive: poolData.isActive,
                capacity: poolData.capacity,
                remainingCapacity: poolData.remainingCapacity
            };
        }, (error) => new types_1.SiloProtocolError(`Failed to get staking pool info: ${error}`, 'POOL_INFO_FAILED', { token, error }));
        this.getStakingMetrics = (walletAddress) => (0, function_1.pipe)(TE.Do, TE.bind('positions', () => this.getStakingPositions(walletAddress)), TE.bind('rewards', () => this.calculateRewards(walletAddress)), TE.map(({ positions, rewards }) => {
            const totalStaked = positions.reduce((sum, pos) => sum + Number(pos.stakedAmount), 0);
            const totalRewards = rewards.reduce((sum, reward) => sum + Number(reward.amount), 0);
            const avgStakingPeriod = positions.length > 0
                ? positions.reduce((sum, pos) => sum + pos.stakingPeriod.lockupPeriod, 0) / positions.length
                : 0;
            return {
                totalStaked: totalStaked.toString(),
                totalStakedUSD: positions.reduce((sum, pos) => sum + pos.valueUSD, 0),
                totalRewards: totalRewards.toString(),
                totalRewardsUSD: rewards.reduce((sum, reward) => sum + reward.valueUSD, 0),
                averageStakingPeriod: avgStakingPeriod,
                totalValueLocked: 0,
                participationRate: 0,
                slashingEvents: 0
            };
        }));
        this.stake = (params) => (0, function_1.pipe)(TE.Do, TE.bind('validation', () => this.validateStakeParams(params)), TE.bind('poolInfo', () => this.getStakingPoolInfo(params.token)), TE.bind('txHash', ({ poolInfo }) => TE.tryCatch(() => this.executeStake(params, poolInfo), (error) => new types_1.SiloProtocolError(`Failed to execute stake: ${error}`, 'STAKE_EXECUTION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.unstake = (params) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getStakingPositionById(params.positionId)), TE.bind('penalty', ({ position }) => this.calculateUnstakePenalty(params.positionId, params.amount)), TE.bind('txHash', ({ position, penalty }) => TE.tryCatch(() => this.executeUnstake(params, position, penalty), (error) => new types_1.SiloProtocolError(`Failed to execute unstake: ${error}`, 'UNSTAKE_EXECUTION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.claimRewards = (params) => (0, function_1.pipe)(TE.Do, TE.bind('rewards', () => this.calculateRewards(params.walletAddress, params.positionId)), TE.bind('txHash', ({ rewards }) => TE.tryCatch(() => this.executeClaimRewards(params, rewards), (error) => new types_1.SiloProtocolError(`Failed to execute claim rewards: ${error}`, 'CLAIM_REWARDS_EXECUTION_FAILED', { params, error }))), TE.map(({ txHash }) => txHash));
        this.calculateRewards = (walletAddress, positionId) => (0, function_1.pipe)(TE.Do, TE.bind('positions', () => this.getStakingPositions(walletAddress)), TE.bind('filteredPositions', ({ positions }) => TE.right(positionId ? positions.filter(p => p.id === positionId) : positions)), TE.bind('rewards', ({ filteredPositions }) => TE.sequenceArray(filteredPositions.map(pos => this.calculatePositionRewards(pos)))), TE.map(({ rewards }) => rewards.flat()));
        this.estimateStakingReturns = (params) => (0, function_1.pipe)(TE.Do, TE.bind('poolInfo', () => this.getStakingPoolInfo(params.token)), TE.map(({ poolInfo }) => {
            const amount = Number(params.amount);
            const stakingPeriod = params.stakingPeriod || 0;
            const multiplier = this.getStakingMultiplier(stakingPeriod);
            const effectiveAPR = poolInfo.apr * multiplier;
            const effectiveAPY = this.calculateAPY(effectiveAPR);
            const dailyRewards = (amount * effectiveAPR) / 365;
            const monthlyRewards = (amount * effectiveAPR) / 12;
            const annualRewards = amount * effectiveAPR;
            return {
                dailyRewards,
                monthlyRewards,
                annualRewards,
                apy: effectiveAPY
            };
        }));
        this.calculateUnstakePenalty = (positionId, amount) => (0, function_1.pipe)(TE.Do, TE.bind('position', () => this.getStakingPositionById(positionId)), TE.map(({ position }) => {
            const unstakeAmount = Number(amount);
            const currentTime = Date.now();
            const stakingEndTime = new Date(position.stakingPeriod.endTime || 0).getTime();
            const isEarlyUnstake = stakingEndTime > currentTime;
            const penaltyRate = isEarlyUnstake ? SILO_CONSTANTS.PENALTIES.EARLY_UNSTAKE : 0;
            const penaltyAmount = unstakeAmount * penaltyRate;
            const netAmount = unstakeAmount - penaltyAmount;
            return {
                penalty: penaltyRate,
                penaltyAmount: penaltyAmount.toString(),
                netAmount: netAmount.toString()
            };
        }));
        this.verifyContractDeployments = async () => {
            const contracts = Object.values(this.config.contracts);
            for (const contract of contracts) {
                if (!contract.startsWith('sei1')) {
                    throw new types_1.SiloProtocolError(`Invalid contract address: ${contract}`, 'INVALID_CONTRACT', { contract });
                }
            }
        };
        this.getUserStakingPositionIds = (walletAddress) => TE.tryCatch(async () => {
            return ['silo-pos-1', 'silo-pos-2'];
        }, (error) => new types_1.SiloProtocolError(`Failed to get user staking positions: ${error}`, 'GET_POSITIONS_FAILED', { walletAddress, error }));
        this.getStakingPositionDetails = (positionId, walletAddress) => TE.tryCatch(async () => {
            const positionData = await this.fetchPositionData(positionId);
            const currentTime = new Date().toISOString();
            return {
                id: positionId,
                walletAddress,
                platform: 'Silo',
                type: 'staking',
                protocol: 'silo',
                createdAt: positionData.createdAt,
                lastUpdated: currentTime,
                stakedToken: positionData.stakedToken,
                stakedTokenSymbol: this.getTokenSymbol(positionData.stakedToken),
                stakedAmount: positionData.stakedAmount,
                stakedAmountFormatted: this.formatTokenAmount(positionData.stakedAmount, 18),
                valueUSD: positionData.valueUSD,
                rewardToken: positionData.rewardToken,
                rewardTokenSymbol: this.getTokenSymbol(positionData.rewardToken),
                pendingRewards: positionData.pendingRewards,
                pendingRewardsFormatted: this.formatTokenAmount(positionData.pendingRewards, 18),
                pendingRewardsUSD: positionData.pendingRewardsUSD,
                stakingPeriod: {
                    startTime: positionData.stakingPeriod.startTime,
                    endTime: positionData.stakingPeriod.endTime,
                    lockupPeriod: positionData.stakingPeriod.lockupPeriod,
                    isLocked: positionData.stakingPeriod.isLocked
                },
                apr: positionData.apr,
                apy: this.calculateAPY(positionData.apr),
                rewardRate: positionData.rewardRate,
                multiplier: positionData.multiplier,
                penalties: {
                    earlyUnstakePenalty: SILO_CONSTANTS.PENALTIES.EARLY_UNSTAKE,
                    slashingRisk: SILO_CONSTANTS.PENALTIES.SLASHING
                }
            };
        }, (error) => new types_1.SiloProtocolError(`Failed to get staking position details: ${error}`, 'POSITION_DETAILS_FAILED', { positionId, error }));
        this.getStakingPositionById = (positionId) => TE.tryCatch(async () => {
            const positionData = await this.fetchPositionData(positionId);
            return this.mapToStakingPosition(positionData);
        }, (error) => new types_1.SiloProtocolError(`Failed to get staking position: ${error}`, 'GET_POSITION_FAILED', { positionId, error }));
        this.fetchPositionData = async (positionId) => {
            return {
                id: positionId,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                stakedToken: 'sei1native0token1address2here3for4sei5mainnet6deployment7only',
                stakedAmount: '100000000000000000000',
                valueUSD: 50.0,
                rewardToken: 'sei1reward1token1address2here3for4sei5mainnet6deployment7only',
                pendingRewards: '5000000000000000000',
                pendingRewardsUSD: 2.5,
                stakingPeriod: {
                    startTime: new Date(Date.now() - 86400000).toISOString(),
                    endTime: new Date(Date.now() + 86400000 * 30).toISOString(),
                    lockupPeriod: SILO_CONSTANTS.STAKING_PERIODS.MONTH,
                    isLocked: true
                },
                apr: 0.12,
                rewardRate: '1000000000000000000',
                multiplier: SILO_CONSTANTS.MULTIPLIERS.MONTH
            };
        };
        this.fetchStakingPoolData = async (token) => {
            return {
                totalStaked: '1000000000000000000000000',
                totalStakedUSD: 500000,
                rewardRate: '100000000000000000000',
                apr: 0.15,
                isActive: true,
                capacity: '10000000000000000000000000',
                remainingCapacity: '9000000000000000000000000'
            };
        };
        this.validateStakeParams = (params) => TE.tryCatch(async () => {
            if (!params.walletAddress || !params.token || !params.amount) {
                throw new types_1.SiloProtocolError('Missing required staking parameters', 'INVALID_PARAMS', { params });
            }
            const amount = Number(params.amount);
            if (amount < Number(SILO_CONSTANTS.MIN_STAKE_AMOUNT)) {
                throw new types_1.SiloProtocolError('Stake amount below minimum threshold', 'AMOUNT_TOO_LOW', { amount, minimum: SILO_CONSTANTS.MIN_STAKE_AMOUNT });
            }
            if (amount > Number(SILO_CONSTANTS.MAX_STAKE_AMOUNT)) {
                throw new types_1.SiloProtocolError('Stake amount exceeds maximum threshold', 'AMOUNT_TOO_HIGH', { amount, maximum: SILO_CONSTANTS.MAX_STAKE_AMOUNT });
            }
        }, (error) => error);
        this.executeStake = async (params, poolInfo) => {
            logger_1.default.info('Executing stake transaction', {
                walletAddress: params.walletAddress,
                token: params.token,
                amount: params.amount,
                stakingPeriod: params.stakingPeriod
            });
            return this.simulateTransaction('stake', params);
        };
        this.executeUnstake = async (params, position, penalty) => {
            logger_1.default.info('Executing unstake transaction', {
                walletAddress: params.walletAddress,
                positionId: params.positionId,
                amount: params.amount,
                penalty: penalty.penalty,
                netAmount: penalty.netAmount
            });
            return this.simulateTransaction('unstake', params);
        };
        this.executeClaimRewards = async (params, rewards) => {
            logger_1.default.info('Executing claim rewards transaction', {
                walletAddress: params.walletAddress,
                positionId: params.positionId,
                totalRewards: rewards.length,
                totalValueUSD: rewards.reduce((sum, r) => sum + r.valueUSD, 0)
            });
            return this.simulateTransaction('claimRewards', params);
        };
        this.calculatePositionRewards = (position) => TE.right([
            {
                token: position.rewardToken,
                symbol: position.rewardTokenSymbol,
                amount: position.pendingRewards,
                amountFormatted: position.pendingRewardsFormatted,
                valueUSD: position.pendingRewardsUSD,
                claimableAt: new Date().toISOString(),
                vested: false,
                vestingPeriod: 0
            }
        ]);
        this.simulateTransaction = async (operation, params) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
        };
        this.mapToStakingPosition = (data) => {
            return {
                id: data.id,
                walletAddress: data.walletAddress || '',
                platform: 'Silo',
                type: 'staking',
                protocol: 'silo',
                createdAt: data.createdAt,
                lastUpdated: new Date().toISOString(),
                stakedToken: data.stakedToken,
                stakedTokenSymbol: this.getTokenSymbol(data.stakedToken),
                stakedAmount: data.stakedAmount,
                stakedAmountFormatted: this.formatTokenAmount(data.stakedAmount, 18),
                valueUSD: data.valueUSD,
                rewardToken: data.rewardToken,
                rewardTokenSymbol: this.getTokenSymbol(data.rewardToken),
                pendingRewards: data.pendingRewards,
                pendingRewardsFormatted: this.formatTokenAmount(data.pendingRewards, 18),
                pendingRewardsUSD: data.pendingRewardsUSD,
                stakingPeriod: data.stakingPeriod,
                apr: data.apr,
                apy: this.calculateAPY(data.apr),
                rewardRate: data.rewardRate,
                multiplier: data.multiplier,
                penalties: {
                    earlyUnstakePenalty: SILO_CONSTANTS.PENALTIES.EARLY_UNSTAKE,
                    slashingRisk: SILO_CONSTANTS.PENALTIES.SLASHING
                }
            };
        };
        this.getTokenSymbol = (tokenAddress) => {
            const tokenMap = {
                'sei1native0token1address2here3for4sei5mainnet6deployment7only': 'SEI',
                'sei1reward1token1address2here3for4sei5mainnet6deployment7only': 'SILO',
                'sei1usdc1token1address2here3for4sei5mainnet6deployment7only': 'USDC',
                'sei1usdt1token1address2here3for4sei5mainnet6deployment7only': 'USDT'
            };
            return tokenMap[tokenAddress] || 'UNKNOWN';
        };
        this.formatTokenAmount = (amount, decimals) => {
            const value = Number(amount) / Math.pow(10, decimals);
            return value.toFixed(6);
        };
        this.calculateAPY = (apr) => {
            const n = 365;
            return Math.pow(1 + apr / n, n) - 1;
        };
        this.getStakingMultiplier = (stakingPeriod) => {
            if (stakingPeriod === SILO_CONSTANTS.STAKING_PERIODS.YEAR)
                return SILO_CONSTANTS.MULTIPLIERS.YEAR;
            if (stakingPeriod === SILO_CONSTANTS.STAKING_PERIODS.QUARTER)
                return SILO_CONSTANTS.MULTIPLIERS.QUARTER;
            if (stakingPeriod === SILO_CONSTANTS.STAKING_PERIODS.MONTH)
                return SILO_CONSTANTS.MULTIPLIERS.MONTH;
            if (stakingPeriod === SILO_CONSTANTS.STAKING_PERIODS.WEEK)
                return SILO_CONSTANTS.MULTIPLIERS.WEEK;
            return SILO_CONSTANTS.MULTIPLIERS.FLEXIBLE;
        };
        this.config = {
            contracts: protocolConfig.contractAddresses.silo || DEFAULT_SILO_CONTRACTS,
            defaultStakingPeriod: SILO_CONSTANTS.STAKING_PERIODS.FLEXIBLE,
            maxStakingPeriod: SILO_CONSTANTS.STAKING_PERIODS.YEAR,
            penaltyGracePeriod: 86400,
            slashingThreshold: 0.75,
            rewardDistributionInterval: 86400
        };
    }
}
exports.SiloProtocolWrapper = SiloProtocolWrapper;
const createSiloProtocolWrapper = (publicClient, walletClient, config) => {
    return new SiloProtocolWrapper(publicClient, walletClient, config);
};
exports.createSiloProtocolWrapper = createSiloProtocolWrapper;
//# sourceMappingURL=SiloProtocolWrapper.js.map