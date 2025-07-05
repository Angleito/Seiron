"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TakaraRiskAssessment = exports.createTakaraProtocolWrapper = exports.TakaraProtocolWrapper = exports.TAKARA_ORACLE_ABI = exports.TAKARA_CTOKEN_ABI = exports.TAKARA_COMPTROLLER_ABI = exports.TAKARA_ERROR_MESSAGES = exports.TAKARA_MANTISSA = exports.TAKARA_BLOCKS_PER_YEAR = exports.TAKARA_WAD = exports.TAKARA_RAY = exports.TAKARA_ASSET_BY_ADDRESS = exports.TAKARA_ASSET_BY_SYMBOL = exports.TAKARA_PROTOCOL_CONFIG = exports.TAKARA_SUPPORTED_ASSETS = exports.TAKARA_ADDRESSES = void 0;
const tslib_1 = require("tslib");
const function_1 = require("fp-ts/function");
const E = tslib_1.__importStar(require("fp-ts/Either"));
const TE = tslib_1.__importStar(require("fp-ts/TaskEither"));
const ethers_1 = require("ethers");
exports.TAKARA_ADDRESSES = {
    COMPTROLLER: '0x0000000000000000000000000000000000000000',
    PRICE_ORACLE: '0x0000000000000000000000000000000000000000',
    INTEREST_RATE_MODEL: '0x0000000000000000000000000000000000000000',
    LIQUIDATION_INCENTIVE: '0x0000000000000000000000000000000000000000',
};
exports.TAKARA_SUPPORTED_ASSETS = [
    {
        symbol: 'SEI',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 200000000000000000n,
        collateralFactor: 750000000000000000n,
        liquidationThreshold: 850000000000000000n,
        liquidationIncentive: 1100000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
    {
        symbol: 'iSEI',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 200000000000000000n,
        collateralFactor: 700000000000000000n,
        liquidationThreshold: 800000000000000000n,
        liquidationIncentive: 1100000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
    {
        symbol: 'USDT',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 6,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 100000000000000000n,
        collateralFactor: 800000000000000000n,
        liquidationThreshold: 900000000000000000n,
        liquidationIncentive: 1050000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
    {
        symbol: 'USDC',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 6,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 100000000000000000n,
        collateralFactor: 800000000000000000n,
        liquidationThreshold: 900000000000000000n,
        liquidationIncentive: 1050000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
    {
        symbol: 'fastUSD',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 100000000000000000n,
        collateralFactor: 750000000000000000n,
        liquidationThreshold: 850000000000000000n,
        liquidationIncentive: 1080000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
    {
        symbol: 'uBTC',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 8,
        aTokenAddress: '0x0000000000000000000000000000000000000000',
        stableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        variableDebtTokenAddress: '0x0000000000000000000000000000000000000000',
        interestRateStrategyAddress: '0x0000000000000000000000000000000000000000',
        oracle: '0x0000000000000000000000000000000000000000',
        cTokenAddress: '0x0000000000000000000000000000000000000000',
        exchangeRate: 1000000000000000000n,
        totalSupply: 0n,
        totalBorrows: 0n,
        reserveFactor: 200000000000000000n,
        collateralFactor: 700000000000000000n,
        liquidationThreshold: 800000000000000000n,
        liquidationIncentive: 1130000000000000000n,
        borrowCap: 0n,
        supplyCap: 0n,
        isActive: true,
        isFrozen: false,
        isPaused: false,
    },
];
exports.TAKARA_PROTOCOL_CONFIG = {
    name: 'Takara Protocol',
    version: '1.0.0',
    chainId: 1329,
    poolAddressProvider: exports.TAKARA_ADDRESSES.COMPTROLLER,
    pool: exports.TAKARA_ADDRESSES.COMPTROLLER,
    poolDataProvider: exports.TAKARA_ADDRESSES.COMPTROLLER,
    priceOracle: exports.TAKARA_ADDRESSES.PRICE_ORACLE,
    aaveOracle: exports.TAKARA_ADDRESSES.PRICE_ORACLE,
    incentivesController: undefined,
    collector: undefined,
};
exports.TAKARA_ASSET_BY_SYMBOL = exports.TAKARA_SUPPORTED_ASSETS.reduce((acc, asset) => ({
    ...acc,
    [asset.symbol]: asset,
}), {});
exports.TAKARA_ASSET_BY_ADDRESS = exports.TAKARA_SUPPORTED_ASSETS.reduce((acc, asset) => ({
    ...acc,
    [asset.address.toLowerCase()]: asset,
    [asset.cTokenAddress.toLowerCase()]: asset,
}), {});
exports.TAKARA_RAY = BigInt('1000000000000000000000000000');
exports.TAKARA_WAD = BigInt('1000000000000000000');
exports.TAKARA_BLOCKS_PER_YEAR = BigInt('10512000');
exports.TAKARA_MANTISSA = BigInt('1000000000000000000');
exports.TAKARA_ERROR_MESSAGES = {
    MARKET_NOT_LISTED: 'Market not listed',
    MARKET_NOT_ENTERED: 'Market not entered',
    INSUFFICIENT_CASH: 'Insufficient cash in market',
    BORROW_CAP_EXCEEDED: 'Borrow cap exceeded',
    SUPPLY_CAP_EXCEEDED: 'Supply cap exceeded',
    COMPTROLLER_REJECTION: 'Comptroller rejection',
    PRICE_ERROR: 'Price oracle error',
    MATH_ERROR: 'Math error in calculation',
    TOKEN_INSUFFICIENT_ALLOWANCE: 'Insufficient token allowance',
    TOKEN_TRANSFER_FAILED: 'Token transfer failed',
    LIQUIDATION_INVALID: 'Invalid liquidation',
    LIQUIDATION_TOO_MUCH: 'Liquidation amount too high',
};
exports.TAKARA_COMPTROLLER_ABI = [
    'function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)',
    'function enterMarkets(address[] calldata cTokens) returns (uint256[] memory)',
    'function exitMarket(address cToken) returns (uint256)',
    'function getAccountLiquidity(address account) view returns (uint256, uint256, uint256)',
    'function getHypotheticalAccountLiquidity(address account, address cTokenModify, uint256 redeemTokens, uint256 borrowAmount) view returns (uint256, uint256, uint256)',
    'function liquidateCalculateSeizeTokens(address cTokenBorrowed, address cTokenCollateral, uint256 repayAmount) view returns (uint256, uint256)',
    'function liquidationIncentiveMantissa() view returns (uint256)',
    'function closeFactorMantissa() view returns (uint256)',
    'function oracle() view returns (address)',
    'function getAllMarkets() view returns (address[] memory)',
    'function borrowCaps(address) view returns (uint256)',
    'function supplyCaps(address) view returns (uint256)',
    'function borrowGuardianPaused(address) view returns (bool)',
    'function mintGuardianPaused(address) view returns (bool)',
];
exports.TAKARA_CTOKEN_ABI = [
    'function mint(uint256 mintAmount) returns (uint256)',
    'function redeem(uint256 redeemTokens) returns (uint256)',
    'function redeemUnderlying(uint256 redeemAmount) returns (uint256)',
    'function borrow(uint256 borrowAmount) returns (uint256)',
    'function repayBorrow(uint256 repayAmount) returns (uint256)',
    'function repayBorrowBehalf(address borrower, uint256 repayAmount) returns (uint256)',
    'function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function balanceOfUnderlying(address owner) returns (uint256)',
    'function getAccountSnapshot(address account) view returns (uint256, uint256, uint256, uint256)',
    'function borrowRatePerBlock() view returns (uint256)',
    'function supplyRatePerBlock() view returns (uint256)',
    'function totalBorrowsCurrent() returns (uint256)',
    'function borrowBalanceCurrent(address account) returns (uint256)',
    'function borrowBalanceStored(address account) view returns (uint256)',
    'function exchangeRateCurrent() returns (uint256)',
    'function exchangeRateStored() view returns (uint256)',
    'function getCash() view returns (uint256)',
    'function totalReserves() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function totalBorrows() view returns (uint256)',
    'function accrualBlockNumber() view returns (uint256)',
    'function reserveFactorMantissa() view returns (uint256)',
    'function interestRateModel() view returns (address)',
    'function underlying() view returns (address)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
    'function decimals() view returns (uint8)',
];
exports.TAKARA_ORACLE_ABI = [
    'function getUnderlyingPrice(address cToken) view returns (uint256)',
    'function price(string calldata symbol) view returns (uint256)',
];
class TakaraProtocolWrapper {
    provider;
    signer;
    comptrollerContract;
    oracleContract;
    cTokenContracts;
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.cTokenContracts = new Map();
        this.comptrollerContract = new ethers_1.ethers.Contract(exports.TAKARA_ADDRESSES.COMPTROLLER, exports.TAKARA_COMPTROLLER_ABI, signer || provider);
        this.oracleContract = new ethers_1.ethers.Contract(exports.TAKARA_ADDRESSES.PRICE_ORACLE, exports.TAKARA_ORACLE_ABI, provider);
    }
    async getUserAccountData(user) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const [error, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(user);
            if (error !== 0n) {
                throw new Error(`Comptroller error: ${error}`);
            }
            const accountData = await this.getDetailedAccountData(user);
            return {
                totalCollateralBase: accountData.totalCollateralValueInUsd,
                totalDebtBase: accountData.totalBorrowValueInUsd,
                availableBorrowsBase: liquidity,
                currentLiquidationThreshold: await this.getWeightedLiquidationThreshold(user),
                ltv: await this.getWeightedLTV(user),
                healthFactor: shortfall > 0n ? exports.TAKARA_WAD : (liquidity + accountData.totalBorrowValueInUsd) / accountData.totalBorrowValueInUsd,
            };
        }, (error) => this.mapError(error, 'Failed to get user account data')))();
    }
    async getUserReserveData(user, asset) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(asset);
            if (!assetInfo) {
                throw new Error(`Asset ${asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const [error, cTokenBalance, borrowBalance, exchangeRate] = await cTokenContract.getAccountSnapshot(user);
            if (error !== 0n) {
                throw new Error(`CToken error: ${error}`);
            }
            const [supplyRatePerBlock, borrowRatePerBlock] = await Promise.all([
                cTokenContract.supplyRatePerBlock(),
                cTokenContract.borrowRatePerBlock(),
            ]);
            const underlyingBalance = (cTokenBalance * exchangeRate) / exports.TAKARA_MANTISSA;
            const supplyRate = supplyRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR;
            const borrowRate = borrowRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR;
            return {
                asset: assetInfo,
                currentATokenBalance: underlyingBalance,
                currentStableDebt: 0n,
                currentVariableDebt: borrowBalance,
                principalStableDebt: 0n,
                scaledVariableDebt: borrowBalance,
                stableBorrowRate: 0n,
                liquidityRate: supplyRate,
                usageAsCollateralEnabled: await this.isMarketEntered(user, assetInfo.cTokenAddress),
            };
        }, (error) => this.mapError(error, 'Failed to get user reserve data')))();
    }
    async getReserveData(asset) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(asset);
            if (!assetInfo) {
                throw new Error(`Asset ${asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const [supplyRatePerBlock, borrowRatePerBlock, totalSupply, totalBorrows, totalReserves, cash, exchangeRate,] = await Promise.all([
                cTokenContract.supplyRatePerBlock(),
                cTokenContract.borrowRatePerBlock(),
                cTokenContract.totalSupply(),
                cTokenContract.totalBorrows(),
                cTokenContract.totalReserves(),
                cTokenContract.getCash(),
                cTokenContract.exchangeRateStored(),
            ]);
            const totalSupplyUnderlying = (totalSupply * exchangeRate) / exports.TAKARA_MANTISSA;
            const availableLiquidity = cash;
            const utilizationRate = totalSupplyUnderlying > 0n
                ? (totalBorrows * exports.TAKARA_RAY) / totalSupplyUnderlying
                : 0n;
            const liquidityRate = supplyRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR;
            const variableBorrowRate = borrowRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR;
            return {
                asset: assetInfo,
                liquidityRate,
                variableBorrowRate,
                stableBorrowRate: 0n,
                utilizationRate,
                availableLiquidity,
                totalStableDebt: 0n,
                totalVariableDebt: totalBorrows,
                totalSupply: totalSupplyUnderlying,
                liquidityIndex: exports.TAKARA_RAY,
                variableBorrowIndex: exports.TAKARA_RAY,
                lastUpdateTimestamp: Date.now(),
            };
        }, (error) => this.mapError(error, 'Failed to get reserve data')))();
    }
    async getHealthFactor(user) {
        return (0, function_1.pipe)(await this.getUserAccountData(user), E.map((accountData) => {
            const isHealthy = accountData.healthFactor > exports.TAKARA_WAD;
            return {
                healthFactor: accountData.healthFactor,
                totalCollateralBase: accountData.totalCollateralBase,
                totalDebtBase: accountData.totalDebtBase,
                currentLiquidationThreshold: accountData.currentLiquidationThreshold,
                isHealthy,
                canBeLiquidated: !isHealthy,
            };
        }));
    }
    async supply(params) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(params.asset);
            if (!assetInfo) {
                throw new Error(`Asset ${params.asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            if (!assetInfo.isActive || assetInfo.isFrozen || assetInfo.isPaused) {
                throw new Error('Market is not active');
            }
            if (assetInfo.supplyCap > 0n) {
                const currentSupply = await this.getTotalSupply(assetInfo.cTokenAddress);
                if (currentSupply + params.amount > assetInfo.supplyCap) {
                    throw new Error(exports.TAKARA_ERROR_MESSAGES.SUPPLY_CAP_EXCEEDED);
                }
            }
            if (assetInfo.symbol !== 'SEI') {
                await this.ensureApproval(assetInfo.address, assetInfo.cTokenAddress, params.amount);
            }
            const tx = await cTokenContract.mint(params.amount.toString());
            const receipt = await tx.wait();
            const accountData = await this.getUserAccountData(await this.signer.getAddress());
            return {
                type: 'supply',
                asset: params.asset,
                amount: params.amount,
                user: params.onBehalfOf || await this.signer.getAddress(),
                timestamp: Date.now(),
                txHash: receipt.transactionHash,
                gasUsed: BigInt(receipt.gasUsed.toString()),
            };
        }, (error) => this.mapError(error, 'Supply transaction failed')))();
    }
    async withdraw(params) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(params.asset);
            if (!assetInfo) {
                throw new Error(`Asset ${params.asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const signerAddress = await this.signer.getAddress();
            let amountToWithdraw;
            let isRedeemTokens = false;
            if (params.amount === 'max') {
                const cTokenBalance = await cTokenContract.balanceOf(signerAddress);
                amountToWithdraw = cTokenBalance;
                isRedeemTokens = true;
            }
            else {
                amountToWithdraw = params.amount;
            }
            const [, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(signerAddress);
            if (shortfall > 0n) {
                throw new Error('Account has shortfall, cannot withdraw');
            }
            const tx = isRedeemTokens
                ? await cTokenContract.redeem(amountToWithdraw.toString())
                : await cTokenContract.redeemUnderlying(amountToWithdraw.toString());
            const receipt = await tx.wait();
            return {
                type: 'withdraw',
                asset: params.asset,
                amount: amountToWithdraw,
                user: signerAddress,
                timestamp: Date.now(),
                txHash: receipt.transactionHash,
                gasUsed: BigInt(receipt.gasUsed.toString()),
            };
        }, (error) => this.mapError(error, 'Withdraw transaction failed')))();
    }
    async borrow(params) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(params.asset);
            if (!assetInfo) {
                throw new Error(`Asset ${params.asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const signerAddress = await this.signer.getAddress();
            const borrower = params.onBehalfOf || signerAddress;
            if (!assetInfo.isActive || assetInfo.isFrozen || assetInfo.isPaused) {
                throw new Error('Market is not active for borrowing');
            }
            if (assetInfo.borrowCap > 0n) {
                const currentBorrows = await cTokenContract.totalBorrows();
                if (currentBorrows + params.amount > assetInfo.borrowCap) {
                    throw new Error(exports.TAKARA_ERROR_MESSAGES.BORROW_CAP_EXCEEDED);
                }
            }
            const [, liquidity, shortfall] = await this.comptrollerContract.getAccountLiquidity(borrower);
            if (shortfall > 0n) {
                throw new Error('Account has shortfall, cannot borrow');
            }
            const [, hypotheticalLiquidity, hypotheticalShortfall] = await this.comptrollerContract.getHypotheticalAccountLiquidity(borrower, assetInfo.cTokenAddress, 0, params.amount);
            if (hypotheticalShortfall > 0n) {
                throw new Error('Insufficient collateral for borrow amount');
            }
            const tx = await cTokenContract.borrow(params.amount.toString());
            const receipt = await tx.wait();
            const borrowRate = await cTokenContract.borrowRatePerBlock();
            const effectiveRate = borrowRate * exports.TAKARA_BLOCKS_PER_YEAR;
            return {
                type: 'borrow',
                asset: params.asset,
                amount: params.amount,
                user: borrower,
                timestamp: Date.now(),
                txHash: receipt.transactionHash,
                gasUsed: BigInt(receipt.gasUsed.toString()),
                effectiveRate,
            };
        }, (error) => this.mapError(error, 'Borrow transaction failed')))();
    }
    async repay(params) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(params.asset);
            if (!assetInfo) {
                throw new Error(`Asset ${params.asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const signerAddress = await this.signer.getAddress();
            const borrower = params.onBehalfOf || signerAddress;
            let amountToRepay;
            if (params.amount === 'max') {
                const borrowBalance = await cTokenContract.borrowBalanceCurrent(borrower);
                amountToRepay = (borrowBalance * 10001n) / 10000n;
            }
            else {
                amountToRepay = params.amount;
            }
            if (assetInfo.symbol !== 'SEI') {
                await this.ensureApproval(assetInfo.address, assetInfo.cTokenAddress, amountToRepay);
            }
            const tx = params.onBehalfOf
                ? await cTokenContract.repayBorrowBehalf(borrower, amountToRepay.toString())
                : await cTokenContract.repayBorrow(amountToRepay.toString());
            const receipt = await tx.wait();
            return {
                type: 'repay',
                asset: params.asset,
                amount: amountToRepay,
                user: borrower,
                timestamp: Date.now(),
                txHash: receipt.transactionHash,
                gasUsed: BigInt(receipt.gasUsed.toString()),
            };
        }, (error) => this.mapError(error, 'Repay transaction failed')))();
    }
    getProtocolConfig() {
        return exports.TAKARA_PROTOCOL_CONFIG;
    }
    async getSupportedAssets() {
        return E.right(exports.TAKARA_SUPPORTED_ASSETS);
    }
    async getLendingRates(asset) {
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(asset);
            if (!assetInfo) {
                throw new Error(`Asset ${asset} not supported`);
            }
            const cTokenContract = await this.getCTokenContract(assetInfo.cTokenAddress);
            const [supplyRatePerBlock, borrowRatePerBlock, totalSupply, totalBorrows, cash, exchangeRate,] = await Promise.all([
                cTokenContract.supplyRatePerBlock(),
                cTokenContract.borrowRatePerBlock(),
                cTokenContract.totalSupply(),
                cTokenContract.totalBorrows(),
                cTokenContract.getCash(),
                cTokenContract.exchangeRateStored(),
            ]);
            const totalSupplyUnderlying = (totalSupply * exchangeRate) / exports.TAKARA_MANTISSA;
            const utilizationRate = totalSupplyUnderlying > 0n
                ? (totalBorrows * exports.TAKARA_RAY) / totalSupplyUnderlying
                : 0n;
            return {
                supplyRate: supplyRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR,
                borrowRate: borrowRatePerBlock * exports.TAKARA_BLOCKS_PER_YEAR,
                utilizationRate,
                totalSupply: totalSupplyUnderlying,
                totalBorrows,
                availableLiquidity: cash,
            };
        }, (error) => this.mapError(error, 'Failed to get lending rates')))();
    }
    async enterMarkets(assets) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const cTokenAddresses = assets.map(asset => {
                const assetInfo = this.getAssetInfo(asset);
                if (!assetInfo) {
                    throw new Error(`Asset ${asset} not supported`);
                }
                return assetInfo.cTokenAddress;
            });
            const tx = await this.comptrollerContract.enterMarkets(cTokenAddresses);
            await tx.wait();
        }, (error) => this.mapError(error, 'Failed to enter markets')))();
    }
    async exitMarket(asset) {
        if (!this.signer) {
            return E.left(this.createError('contract_error', 'Signer required for write operations'));
        }
        return (0, function_1.pipe)(TE.tryCatch(async () => {
            const assetInfo = this.getAssetInfo(asset);
            if (!assetInfo) {
                throw new Error(`Asset ${asset} not supported`);
            }
            const tx = await this.comptrollerContract.exitMarket(assetInfo.cTokenAddress);
            await tx.wait();
        }, (error) => this.mapError(error, 'Failed to exit market')))();
    }
    getAssetInfo(assetIdentifier) {
        return exports.TAKARA_ASSET_BY_SYMBOL[assetIdentifier] ||
            exports.TAKARA_ASSET_BY_ADDRESS[assetIdentifier.toLowerCase()];
    }
    async getCTokenContract(cTokenAddress) {
        if (!this.cTokenContracts.has(cTokenAddress)) {
            const contract = new ethers_1.ethers.Contract(cTokenAddress, exports.TAKARA_CTOKEN_ABI, this.signer || this.provider);
            this.cTokenContracts.set(cTokenAddress, contract);
        }
        return this.cTokenContracts.get(cTokenAddress);
    }
    async ensureApproval(tokenAddress, spenderAddress, amount) {
        if (!this.signer)
            return;
        const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ['function approve(address spender, uint256 amount) returns (bool)'], this.signer);
        const tx = await tokenContract.approve(spenderAddress, amount.toString());
        await tx.wait();
    }
    async isMarketEntered(user, cTokenAddress) {
        try {
            const markets = await this.comptrollerContract.getAssetsIn(user);
            return markets.includes(cTokenAddress);
        }
        catch {
            return false;
        }
    }
    async getDetailedAccountData(user) {
        let totalSupplyBalance = 0n;
        let totalBorrowBalance = 0n;
        let totalCollateralValueInUsd = 0n;
        let totalBorrowValueInUsd = 0n;
        for (const asset of exports.TAKARA_SUPPORTED_ASSETS) {
            const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
            const [, cTokenBalance, borrowBalance, exchangeRate] = await cTokenContract.getAccountSnapshot(user);
            const underlyingBalance = (cTokenBalance * exchangeRate) / exports.TAKARA_MANTISSA;
            const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);
            const supplyValueUsd = (underlyingBalance * underlyingPrice) / exports.TAKARA_MANTISSA;
            const borrowValueUsd = (borrowBalance * underlyingPrice) / exports.TAKARA_MANTISSA;
            totalSupplyBalance += supplyValueUsd;
            totalBorrowBalance += borrowValueUsd;
            if (await this.isMarketEntered(user, asset.cTokenAddress)) {
                totalCollateralValueInUsd += (supplyValueUsd * asset.collateralFactor) / exports.TAKARA_MANTISSA;
            }
            totalBorrowValueInUsd += borrowValueUsd;
        }
        const liquidity = totalCollateralValueInUsd > totalBorrowValueInUsd
            ? totalCollateralValueInUsd - totalBorrowValueInUsd
            : 0n;
        const shortfall = totalBorrowValueInUsd > totalCollateralValueInUsd
            ? totalBorrowValueInUsd - totalCollateralValueInUsd
            : 0n;
        return {
            totalCollateralBase: totalCollateralValueInUsd,
            totalDebtBase: totalBorrowValueInUsd,
            availableBorrowsBase: liquidity,
            currentLiquidationThreshold: 0n,
            ltv: 0n,
            healthFactor: shortfall > 0n ? 0n : exports.TAKARA_WAD,
            liquidity,
            shortfall,
            totalSupplyBalance,
            totalBorrowBalance,
            totalCollateralValueInUsd,
            totalBorrowValueInUsd,
            maxBorrowValue: totalCollateralValueInUsd,
            availableBorrowValue: liquidity,
            utilizationRate: totalSupplyBalance > 0n ? (totalBorrowBalance * exports.TAKARA_RAY) / totalSupplyBalance : 0n,
            netApy: 0n,
        };
    }
    async getWeightedLiquidationThreshold(user) {
        let totalCollateralValue = 0n;
        let weightedThreshold = 0n;
        for (const asset of exports.TAKARA_SUPPORTED_ASSETS) {
            if (await this.isMarketEntered(user, asset.cTokenAddress)) {
                const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
                const [, cTokenBalance, , exchangeRate] = await cTokenContract.getAccountSnapshot(user);
                const underlyingBalance = (cTokenBalance * exchangeRate) / exports.TAKARA_MANTISSA;
                const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);
                const collateralValue = (underlyingBalance * underlyingPrice) / exports.TAKARA_MANTISSA;
                totalCollateralValue += collateralValue;
                weightedThreshold += (collateralValue * asset.liquidationThreshold) / exports.TAKARA_MANTISSA;
            }
        }
        return totalCollateralValue > 0n ? (weightedThreshold * exports.TAKARA_MANTISSA) / totalCollateralValue : 0n;
    }
    async getWeightedLTV(user) {
        let totalCollateralValue = 0n;
        let weightedLTV = 0n;
        for (const asset of exports.TAKARA_SUPPORTED_ASSETS) {
            if (await this.isMarketEntered(user, asset.cTokenAddress)) {
                const cTokenContract = await this.getCTokenContract(asset.cTokenAddress);
                const [, cTokenBalance, , exchangeRate] = await cTokenContract.getAccountSnapshot(user);
                const underlyingBalance = (cTokenBalance * exchangeRate) / exports.TAKARA_MANTISSA;
                const underlyingPrice = await this.oracleContract.getUnderlyingPrice(asset.cTokenAddress);
                const collateralValue = (underlyingBalance * underlyingPrice) / exports.TAKARA_MANTISSA;
                totalCollateralValue += collateralValue;
                weightedLTV += (collateralValue * asset.collateralFactor) / exports.TAKARA_MANTISSA;
            }
        }
        return totalCollateralValue > 0n ? (weightedLTV * exports.TAKARA_MANTISSA) / totalCollateralValue : 0n;
    }
    async getTotalSupply(cTokenAddress) {
        const cTokenContract = await this.getCTokenContract(cTokenAddress);
        const [totalSupply, exchangeRate] = await Promise.all([
            cTokenContract.totalSupply(),
            cTokenContract.exchangeRateStored(),
        ]);
        return (totalSupply * exchangeRate) / exports.TAKARA_MANTISSA;
    }
    mapError(error, context) {
        const message = error?.message || context;
        if (message.includes('Comptroller')) {
            const code = this.extractComptrollerErrorCode(message);
            return this.createError('comptroller_rejection', message, code);
        }
        if (message.includes('market not listed')) {
            return this.createError('market_not_listed', message);
        }
        if (message.includes('market not entered')) {
            return this.createError('market_not_entered', message);
        }
        if (message.includes('insufficient cash')) {
            return this.createError('insufficient_cash', message);
        }
        if (message.includes('borrow cap') || message.includes('BORROW_CAP_EXCEEDED')) {
            return this.createError('borrow_cap_exceeded', message);
        }
        if (message.includes('supply cap') || message.includes('SUPPLY_CAP_EXCEEDED')) {
            return this.createError('supply_cap_exceeded', message);
        }
        if (message.includes('insufficient allowance')) {
            return this.createError('token_insufficient_allowance', message);
        }
        if (message.includes('transfer failed')) {
            return this.createError('token_transfer_failed', message);
        }
        if (message.includes('liquidation') && message.includes('invalid')) {
            return this.createError('liquidation_invalid', message);
        }
        if (message.includes('liquidation') && message.includes('too much')) {
            return this.createError('liquidation_too_much', message);
        }
        if (message.includes('price') || message.includes('oracle')) {
            return this.createError('price_error', message);
        }
        if (message.includes('math') || message.includes('overflow') || message.includes('underflow')) {
            return this.createError('math_error', message);
        }
        if (error?.code === 'NETWORK_ERROR') {
            return this.createError('network_error', message);
        }
        if (message.includes('health factor') || message.includes('shortfall')) {
            return this.createError('health_factor_too_low', message);
        }
        if (message.includes('collateral') || message.includes('insufficient')) {
            return this.createError('insufficient_collateral', message);
        }
        if (message.includes('liquidity')) {
            return this.createError('insufficient_liquidity', message);
        }
        return this.createError('contract_error', message, error?.code);
    }
    extractComptrollerErrorCode(message) {
        const match = message.match(/error[:\s]*(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    }
    createError(type, message, code) {
        const baseError = { type, message };
        if (code !== undefined) {
            return { ...baseError, code: typeof code === 'string' ? code : code };
        }
        return baseError;
    }
}
exports.TakaraProtocolWrapper = TakaraProtocolWrapper;
const createTakaraProtocolWrapper = (provider, signer) => {
    return new TakaraProtocolWrapper(provider, signer);
};
exports.createTakaraProtocolWrapper = createTakaraProtocolWrapper;
exports.TakaraRiskAssessment = {
    calculateLiquidationRisk: (healthFactor) => {
        if (healthFactor < exports.TAKARA_WAD)
            return 'critical';
        if (healthFactor < (exports.TAKARA_WAD * 11n) / 10n)
            return 'high';
        if (healthFactor < (exports.TAKARA_WAD * 13n) / 10n)
            return 'medium';
        return 'low';
    },
    calculateOptimalBorrowAmount: (collateralValue, collateralFactor, currentBorrowValue, targetHealthFactor = (exports.TAKARA_WAD * 15n) / 10n) => {
        const maxBorrowValue = (collateralValue * collateralFactor) / exports.TAKARA_MANTISSA;
        const safeMaxBorrowValue = (maxBorrowValue * exports.TAKARA_MANTISSA) / targetHealthFactor;
        const availableBorrowValue = safeMaxBorrowValue > currentBorrowValue
            ? safeMaxBorrowValue - currentBorrowValue
            : 0n;
        return availableBorrowValue;
    },
    calculatePositionHealthScore: (healthFactor, utilizationRate, diversificationScore) => {
        const healthScore = Number(healthFactor) / Number(exports.TAKARA_WAD);
        const utilizationScore = 1 - (Number(utilizationRate) / Number(exports.TAKARA_RAY));
        const weightedScore = (healthScore * 0.5) + (utilizationScore * 0.3) + (diversificationScore * 0.2);
        return Math.max(0, Math.min(1, weightedScore));
    },
};
//# sourceMappingURL=TakaraProtocolWrapper.js.map