import type { Transaction, TradingPair, Timestamp, ReadonlyRecord, Result } from './data.js';
export type Coin = {
    readonly denom: string;
    readonly amount: string;
};
export type CosmosMsg = {
    readonly type: string;
    readonly value: ReadonlyRecord<string, unknown>;
};
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
export type ABCIMessageLog = {
    readonly msg_index: number;
    readonly log: string;
    readonly events: ReadonlyArray<StringEvent>;
};
export type StringEvent = {
    readonly type: string;
    readonly attributes: ReadonlyArray<EventAttribute>;
};
export type EventAttribute = {
    readonly key: string;
    readonly value: string;
};
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
export type CosmosTransactionFee = {
    readonly amount: ReadonlyArray<Coin>;
    readonly gas_limit: string;
    readonly payer: string;
    readonly granter: string;
};
export type SeiOrderType = 'LIMIT' | 'MARKET' | 'FOKMARKET' | 'FOKLIMIT' | 'IOCMARKET' | 'IOCLIMIT';
export type PositionDirection = 'LONG' | 'SHORT';
export type OrderStatus = 'PLACED' | 'FAILED_TO_PLACE' | 'CANCELLED' | 'FULFILLED';
export type SeiOrder = {
    readonly orderId: string;
    readonly account: string;
    readonly contractAddr: string;
    readonly price: string;
    readonly quantity: string;
    readonly priceDenom: string;
    readonly assetDenom: string;
    readonly orderType: SeiOrderType;
    readonly positionDirection: PositionDirection;
    readonly data: string;
    readonly statusDescription: string;
    readonly nominal: string;
    readonly triggerPrice: string;
    readonly triggerStatus: boolean;
    readonly placedBy: string;
    readonly orderId2: string;
    readonly status: OrderStatus;
};
export type SeiMatch = {
    readonly orderId: string;
    readonly executedQuantity: string;
    readonly executedPrice: string;
    readonly timestamp: Timestamp;
    readonly account: string;
    readonly contractAddr: string;
    readonly positionDirection: PositionDirection;
};
export type SeiSettlement = {
    readonly orderId: string;
    readonly account: string;
    readonly executedQuantity: string;
    readonly totalNotional: string;
    readonly executedPrice: string;
    readonly contractAddr: string;
    readonly positionDirection: PositionDirection;
    readonly orderType: SeiOrderType;
    readonly timestamp: Timestamp;
};
export type SeiDexPair = TradingPair & {
    readonly contractAddr: string;
    readonly priceDenom: string;
    readonly assetDenom: string;
    readonly tickSize: string;
    readonly quantityTickSize: string;
    readonly active: boolean;
};
export type ValidatorStatus = 'BOND_STATUS_UNBONDED' | 'BOND_STATUS_UNBONDING' | 'BOND_STATUS_BONDED';
export type SeiValidator = {
    readonly operator_address: string;
    readonly consensus_pubkey: {
        readonly type: string;
        readonly value: string;
    };
    readonly jailed: boolean;
    readonly status: ValidatorStatus;
    readonly tokens: string;
    readonly delegator_shares: string;
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
            readonly rate: string;
            readonly max_rate: string;
            readonly max_change_rate: string;
        };
        readonly update_time: string;
    };
    readonly min_self_delegation: string;
};
export type Delegation = {
    readonly delegator_address: string;
    readonly validator_address: string;
    readonly shares: string;
};
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
export type ProposalStatus = 'PROPOSAL_STATUS_UNSPECIFIED' | 'PROPOSAL_STATUS_DEPOSIT_PERIOD' | 'PROPOSAL_STATUS_VOTING_PERIOD' | 'PROPOSAL_STATUS_PASSED' | 'PROPOSAL_STATUS_REJECTED' | 'PROPOSAL_STATUS_FAILED';
export type VoteOption = 'VOTE_OPTION_UNSPECIFIED' | 'VOTE_OPTION_YES' | 'VOTE_OPTION_ABSTAIN' | 'VOTE_OPTION_NO' | 'VOTE_OPTION_NO_WITH_VETO';
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
export type Vote = {
    readonly proposal_id: string;
    readonly voter: string;
    readonly option: VoteOption;
    readonly options: ReadonlyArray<{
        readonly option: VoteOption;
        readonly weight: string;
    }>;
};
export type IBCChannelState = 'STATE_UNINITIALIZED_UNSPECIFIED' | 'STATE_INIT' | 'STATE_TRYOPEN' | 'STATE_OPEN' | 'STATE_CLOSED';
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
export type SeiEpoch = {
    readonly epoch_number: string;
    readonly start_time: Timestamp;
    readonly end_time: Timestamp;
    readonly duration: number;
    readonly current_epoch_start_height: string;
    readonly current_epoch_start_time: Timestamp;
};
export type SeiOraclePrice = {
    readonly denom: string;
    readonly price: string;
    readonly timestamp: Timestamp;
    readonly feeder: string;
};
export type SeiExchangeRate = {
    readonly denom: string;
    readonly rate: string;
    readonly last_update: Timestamp;
    readonly last_update_height: string;
};
export type SeiNetworkStats = {
    readonly total_validators: number;
    readonly active_validators: number;
    readonly total_supply: ReadonlyArray<Coin>;
    readonly bonded_tokens: string;
    readonly not_bonded_tokens: string;
    readonly inflation: string;
    readonly staking_apr: string;
    readonly community_pool: ReadonlyArray<Coin>;
    readonly timestamp: Timestamp;
};
export type SeiBlockMetrics = {
    readonly height: string;
    readonly block_time: number;
    readonly num_txs: number;
    readonly total_gas_wanted: string;
    readonly total_gas_used: string;
    readonly proposer_address: string;
    readonly timestamp: Timestamp;
};
export type SeiDexVolumeData = {
    readonly pair: SeiDexPair;
    readonly timestamp: Timestamp;
    readonly volume24h: string;
    readonly trades24h: number;
    readonly price: string;
    readonly priceChange24h: string;
    readonly high24h: string;
    readonly low24h: string;
};
export type ValidatorMetrics = {
    readonly validator: SeiValidator;
    readonly timestamp: Timestamp;
    readonly uptime: number;
    readonly missed_blocks: number;
    readonly commission_rate: string;
    readonly voting_power: string;
    readonly delegators_count: number;
    readonly self_delegation: string;
};
export type NetworkHealth = {
    readonly timestamp: Timestamp;
    readonly block_time_avg: number;
    readonly transaction_throughput: number;
    readonly validator_uptime_avg: number;
    readonly network_hash_rate: string;
    readonly gas_price_avg: string;
    readonly active_addresses_24h: number;
};
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
export type SeiApiResponse<T> = {
    readonly result: T;
    readonly height: string;
    readonly pagination?: {
        readonly next_key: string;
        readonly total: string;
    };
};
export type SeiNodeConfig = {
    readonly rpc_endpoint: string;
    readonly rest_endpoint: string;
    readonly grpc_endpoint?: string;
    readonly chain_id: string;
    readonly network: 'mainnet' | 'testnet' | 'devnet';
    readonly timeout_ms: number;
    readonly max_retries: number;
};
export type SeiDexMonitorConfig = {
    readonly enabled_pairs: ReadonlyArray<string>;
    readonly order_book_depth: number;
    readonly settlement_tracking: boolean;
    readonly price_feed_interval_ms: number;
    readonly historical_data_depth_days: number;
};
export type SeiRpcError = {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
};
export type SeiTxError = {
    readonly codespace: string;
    readonly code: number;
    readonly log: string;
    readonly hash?: string;
};
export type ExtractMsgType<T extends CosmosMsg> = T['type'];
export type SeiMsgTypes = '/cosmwasm.wasm.v1.MsgExecuteContract' | '/cosmos.bank.v1beta1.MsgSend' | '/cosmos.staking.v1beta1.MsgDelegate' | '/cosmos.staking.v1beta1.MsgUndelegate' | '/cosmos.gov.v1beta1.MsgVote' | '/ibc.applications.transfer.v1.MsgTransfer' | string;
export type SeiEventProcessingResult<T> = Result<ReadonlyArray<T>, SeiRpcError | SeiTxError>;
export declare const isSeiTransaction: (tx: Transaction) => tx is SeiTransaction;
export declare const isSeiOrder: (obj: unknown) => obj is SeiOrder;
//# sourceMappingURL=sei.d.ts.map