/**
 * @fileoverview Sei blockchain-specific type definitions
 * Includes Cosmos SDK types and Sei-specific features
 */

import type {
  Transaction,
  TradingPair,
  Timestamp,
  ReadonlyRecord,
  Result
} from './data.js';

/**
 * Cosmos SDK base types
 */

/** Cosmos coin type */
export type Coin = {
  readonly denom: string;
  readonly amount: string; // BigInt as string
};

/** Cosmos message type */
export type CosmosMsg = {
  readonly type: string;
  readonly value: ReadonlyRecord<string, unknown>;
};

/** Cosmos transaction response */
export type TxResponse = {
  readonly height: string;
  readonly txhash: string;
  readonly codespace: string;
  readonly code: number;
  readonly data: string;
  readonly raw_log: string;
  readonly logs: ReadonlyArray<ABCIMessageLog>;
  readonly info: string;
  readonly gas_wanted: string;
  readonly gas_used: string;
  readonly tx: CosmosTransaction;
  readonly timestamp: string;
};

/** ABCI message log */
export type ABCIMessageLog = {
  readonly msg_index: number;
  readonly log: string;
  readonly events: ReadonlyArray<StringEvent>;
};

/** String event type */
export type StringEvent = {
  readonly type: string;
  readonly attributes: ReadonlyArray<EventAttribute>;
};

/** Event attribute */
export type EventAttribute = {
  readonly key: string;
  readonly value: string;
};

/**
 * Sei-specific transaction types
 */

/** Sei transaction structure */
export type SeiTransaction = Transaction & {
  readonly seiSpecific: {
    readonly msgs: ReadonlyArray<CosmosMsg>;
    readonly fee: {
      readonly amount: ReadonlyArray<Coin>;
      readonly gas: string;
    };
    readonly signatures: ReadonlyArray<string>;
    readonly memo: string;
    readonly timeoutHeight: string;
  };
};

/** Cosmos transaction type */
export type CosmosTransaction = {
  readonly body: {
    readonly messages: ReadonlyArray<CosmosMsg>;
    readonly memo: string;
    readonly timeout_height: string;
    readonly extension_options: ReadonlyArray<unknown>;
    readonly non_critical_extension_options: ReadonlyArray<unknown>;
  };
  readonly auth_info: {
    readonly signer_infos: ReadonlyArray<SignerInfo>;
    readonly fee: CosmosTransactionFee;
  };
  readonly signatures: ReadonlyArray<string>;
};

/** Signer info */
export type SignerInfo = {
  readonly public_key: {
    readonly type: string;
    readonly value: string;
  };
  readonly mode_info: {
    readonly single: {
      readonly mode: string;
    };
  };
  readonly sequence: string;
};

/** Transaction fee */
export type CosmosTransactionFee = {
  readonly amount: ReadonlyArray<Coin>;
  readonly gas_limit: string;
  readonly payer: string;
  readonly granter: string;
};

/**
 * Sei DEX types
 */

/** Sei order type */
export type SeiOrderType = 
  | 'LIMIT'
  | 'MARKET'
  | 'FOKMARKET'
  | 'FOKLIMIT'
  | 'IOCMARKET'
  | 'IOCLIMIT';

/** Sei position direction */
export type PositionDirection = 'LONG' | 'SHORT';

/** Sei order status */
export type OrderStatus = 
  | 'PLACED'
  | 'FAILED_TO_PLACE'
  | 'CANCELLED'
  | 'FULFILLED';

/** Sei DEX order */
export type SeiOrder = {
  readonly orderId: string;
  readonly account: string;
  readonly contractAddr: string;
  readonly price: string; // Decimal as string
  readonly quantity: string; // Decimal as string
  readonly priceDenom: string;
  readonly assetDenom: string;
  readonly orderType: SeiOrderType;
  readonly positionDirection: PositionDirection;
  readonly data: string;
  readonly statusDescription: string;
  readonly nominal: string; // Decimal as string
  readonly triggerPrice: string; // Decimal as string
  readonly triggerStatus: boolean;
  readonly placedBy: string;
  readonly orderId2: string;
  readonly status: OrderStatus;
};

/** Sei DEX match */
export type SeiMatch = {
  readonly orderId: string;
  readonly executedQuantity: string; // Decimal as string
  readonly executedPrice: string; // Decimal as string
  readonly timestamp: Timestamp;
  readonly account: string;
  readonly contractAddr: string;
  readonly positionDirection: PositionDirection;
};

/** Sei DEX settlement */
export type SeiSettlement = {
  readonly orderId: string;
  readonly account: string;
  readonly executedQuantity: string; // Decimal as string
  readonly totalNotional: string; // Decimal as string
  readonly executedPrice: string; // Decimal as string
  readonly contractAddr: string;
  readonly positionDirection: PositionDirection;
  readonly orderType: SeiOrderType;
  readonly timestamp: Timestamp;
};

/** Sei DEX pair */
export type SeiDexPair = TradingPair & {
  readonly contractAddr: string;
  readonly priceDenom: string;
  readonly assetDenom: string;
  readonly tickSize: string; // Minimum price increment
  readonly quantityTickSize: string; // Minimum quantity increment
  readonly active: boolean;
};

/**
 * Sei validator types
 */

/** Validator status */
export type ValidatorStatus = 
  | 'BOND_STATUS_UNBONDED'
  | 'BOND_STATUS_UNBONDING'
  | 'BOND_STATUS_BONDED';

/** Sei validator */
export type SeiValidator = {
  readonly operator_address: string;
  readonly consensus_pubkey: {
    readonly type: string;
    readonly value: string;
  };
  readonly jailed: boolean;
  readonly status: ValidatorStatus;
  readonly tokens: string; // BigInt as string
  readonly delegator_shares: string; // Decimal as string
  readonly description: {
    readonly moniker: string;
    readonly identity: string;
    readonly website: string;
    readonly security_contact: string;
    readonly details: string;
  };
  readonly unbonding_height: string;
  readonly unbonding_time: string;
  readonly commission: {
    readonly commission_rates: {
      readonly rate: string; // Decimal as string
      readonly max_rate: string; // Decimal as string
      readonly max_change_rate: string; // Decimal as string
    };
    readonly update_time: string;
  };
  readonly min_self_delegation: string;
};

/** Delegation */
export type Delegation = {
  readonly delegator_address: string;
  readonly validator_address: string;
  readonly shares: string; // Decimal as string
};

/** Unbonding delegation */
export type UnbondingDelegation = {
  readonly delegator_address: string;
  readonly validator_address: string;
  readonly entries: ReadonlyArray<{
    readonly creation_height: string;
    readonly completion_time: string;
    readonly initial_balance: string;
    readonly balance: string;
  }>;
};

/**
 * Sei governance types
 */

/** Proposal status */
export type ProposalStatus = 
  | 'PROPOSAL_STATUS_UNSPECIFIED'
  | 'PROPOSAL_STATUS_DEPOSIT_PERIOD'
  | 'PROPOSAL_STATUS_VOTING_PERIOD'
  | 'PROPOSAL_STATUS_PASSED'
  | 'PROPOSAL_STATUS_REJECTED'
  | 'PROPOSAL_STATUS_FAILED';

/** Vote option */
export type VoteOption = 
  | 'VOTE_OPTION_UNSPECIFIED'
  | 'VOTE_OPTION_YES'
  | 'VOTE_OPTION_ABSTAIN'
  | 'VOTE_OPTION_NO'
  | 'VOTE_OPTION_NO_WITH_VETO';

/** Governance proposal */
export type GovernanceProposal = {
  readonly proposal_id: string;
  readonly content: {
    readonly type: string;
    readonly value: ReadonlyRecord<string, unknown>;
  };
  readonly status: ProposalStatus;
  readonly final_tally_result: {
    readonly yes: string;
    readonly abstain: string;
    readonly no: string;
    readonly no_with_veto: string;
  };
  readonly submit_time: string;
  readonly deposit_end_time: string;
  readonly total_deposit: ReadonlyArray<Coin>;
  readonly voting_start_time: string;
  readonly voting_end_time: string;
};

/** Vote */
export type Vote = {
  readonly proposal_id: string;
  readonly voter: string;
  readonly option: VoteOption;
  readonly options: ReadonlyArray<{
    readonly option: VoteOption;
    readonly weight: string; // Decimal as string
  }>;
};

/**
 * Sei IBC types
 */

/** IBC channel state */
export type IBCChannelState = 
  | 'STATE_UNINITIALIZED_UNSPECIFIED'
  | 'STATE_INIT'
  | 'STATE_TRYOPEN'
  | 'STATE_OPEN'
  | 'STATE_CLOSED';

/** IBC channel */
export type IBCChannel = {
  readonly state: IBCChannelState;
  readonly ordering: 'ORDER_NONE_UNSPECIFIED' | 'ORDER_UNORDERED' | 'ORDER_ORDERED';
  readonly counterparty: {
    readonly port_id: string;
    readonly channel_id: string;
  };
  readonly connection_hops: ReadonlyArray<string>;
  readonly version: string;
};

/** IBC transfer */
export type IBCTransfer = {
  readonly source_port: string;
  readonly source_channel: string;
  readonly token: Coin;
  readonly sender: string;
  readonly receiver: string;
  readonly timeout_height: {
    readonly revision_number: string;
    readonly revision_height: string;
  };
  readonly timeout_timestamp: string;
  readonly memo: string;
};

/**
 * Sei module-specific types
 */

/** Sei epoch */
export type SeiEpoch = {
  readonly epoch_number: string;
  readonly start_time: Timestamp;
  readonly end_time: Timestamp;
  readonly duration: number; // seconds
  readonly current_epoch_start_height: string;
  readonly current_epoch_start_time: Timestamp;
};

/** Sei oracle price */
export type SeiOraclePrice = {
  readonly denom: string;
  readonly price: string; // Decimal as string
  readonly timestamp: Timestamp;
  readonly feeder: string;
};

/** Sei exchange rate */
export type SeiExchangeRate = {
  readonly denom: string;
  readonly rate: string; // Decimal as string
  readonly last_update: Timestamp;
  readonly last_update_height: string;
};

/**
 * Sei network statistics
 */

/** Network statistics */
export type SeiNetworkStats = {
  readonly total_validators: number;
  readonly active_validators: number;
  readonly total_supply: ReadonlyArray<Coin>;
  readonly bonded_tokens: string; // BigInt as string
  readonly not_bonded_tokens: string; // BigInt as string
  readonly inflation: string; // Decimal as string
  readonly staking_apr: string; // Decimal as string
  readonly community_pool: ReadonlyArray<Coin>;
  readonly timestamp: Timestamp;
};

/** Block performance metrics */
export type SeiBlockMetrics = {
  readonly height: string;
  readonly block_time: number; // seconds
  readonly num_txs: number;
  readonly total_gas_wanted: string;
  readonly total_gas_used: string;
  readonly proposer_address: string;
  readonly timestamp: Timestamp;
};

/**
 * Derived data types for analytics
 */

/** DEX trading volume by pair */
export type SeiDexVolumeData = {
  readonly pair: SeiDexPair;
  readonly timestamp: Timestamp;
  readonly volume24h: string; // Decimal as string
  readonly trades24h: number;
  readonly price: string; // Decimal as string
  readonly priceChange24h: string; // Decimal as string
  readonly high24h: string; // Decimal as string
  readonly low24h: string; // Decimal as string
};

/** Validator performance metrics */
export type ValidatorMetrics = {
  readonly validator: SeiValidator;
  readonly timestamp: Timestamp;
  readonly uptime: number; // percentage
  readonly missed_blocks: number;
  readonly commission_rate: string; // Decimal as string
  readonly voting_power: string; // Decimal as string
  readonly delegators_count: number;
  readonly self_delegation: string; // Decimal as string
};

/** Network health indicators */
export type NetworkHealth = {
  readonly timestamp: Timestamp;
  readonly block_time_avg: number; // seconds
  readonly transaction_throughput: number; // TPS
  readonly validator_uptime_avg: number; // percentage
  readonly network_hash_rate: string; // if applicable
  readonly gas_price_avg: string; // Decimal as string
  readonly active_addresses_24h: number;
};

/**
 * Query and filtering types
 */

/** Sei-specific query filters */
export type SeiQueryFilters = {
  readonly height_range?: {
    readonly min_height: string;
    readonly max_height: string;
  };
  readonly validator_address?: string;
  readonly delegator_address?: string;
  readonly contract_address?: string;
  readonly denom?: string;
  readonly order_status?: ReadonlyArray<OrderStatus>;
  readonly position_direction?: ReadonlyArray<PositionDirection>;
  readonly message_types?: ReadonlyArray<string>;
};

/** Sei API response wrapper */
export type SeiApiResponse<T> = {
  readonly result: T;
  readonly height: string;
  readonly pagination?: {
    readonly next_key: string;
    readonly total: string;
  };
};

/**
 * Configuration types for Sei data collection
 */

/** Sei node configuration */
export type SeiNodeConfig = {
  readonly rpc_endpoint: string;
  readonly rest_endpoint: string;
  readonly grpc_endpoint?: string;
  readonly chain_id: string;
  readonly network: 'mainnet' | 'testnet' | 'devnet';
  readonly timeout_ms: number;
  readonly max_retries: number;
};

/** Sei DEX monitoring config */
export type SeiDexMonitorConfig = {
  readonly enabled_pairs: ReadonlyArray<string>;
  readonly order_book_depth: number;
  readonly settlement_tracking: boolean;
  readonly price_feed_interval_ms: number;
  readonly historical_data_depth_days: number;
};

/**
 * Error types specific to Sei
 */

/** Sei RPC error */
export type SeiRpcError = {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
};

/** Sei transaction error */
export type SeiTxError = {
  readonly codespace: string;
  readonly code: number;
  readonly log: string;
  readonly hash?: string;
};

/**
 * Type utilities for Sei data processing
 */

/** Extract message type from Cosmos message */
export type ExtractMsgType<T extends CosmosMsg> = T['type'];

/** Union of all Sei message types */
export type SeiMsgTypes = 
  | '/cosmwasm.wasm.v1.MsgExecuteContract'
  | '/cosmos.bank.v1beta1.MsgSend'
  | '/cosmos.staking.v1beta1.MsgDelegate'
  | '/cosmos.staking.v1beta1.MsgUndelegate'
  | '/cosmos.gov.v1beta1.MsgVote'
  | '/ibc.applications.transfer.v1.MsgTransfer'
  | string; // Allow for custom message types

/** Sei event processing result */
export type SeiEventProcessingResult<T> = Result<
  ReadonlyArray<T>,
  SeiRpcError | SeiTxError
>;

/**
 * Type guards for Sei-specific types
 */

/** Type guard for Sei transaction */
export const isSeiTransaction = (tx: Transaction): tx is SeiTransaction =>
  'seiSpecific' in tx && typeof tx.seiSpecific === 'object';

/** Type guard for Sei order */
export const isSeiOrder = (obj: unknown): obj is SeiOrder =>
  typeof obj === 'object' &&
  obj !== null &&
  'orderId' in obj &&
  'orderType' in obj;