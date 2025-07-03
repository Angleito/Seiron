/**
 * @fileoverview Intent Templates and Patterns
 * Pre-defined patterns for recognizing DeFi operation intents
 */

import { 
  DefiIntent, 
  EntityType, 
  IntentPattern, 
  NLPatterns 
} from './types.js';

/**
 * Intent Template Manager
 */
export class IntentTemplates {
  private readonly patterns: NLPatterns;

  constructor() {
    this.patterns = this.initializePatterns();
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): ReadonlyArray<IntentPattern> {
    return [
      ...this.patterns.lending,
      ...this.patterns.liquidity,
      ...this.patterns.trading,
      ...this.patterns.arbitrage,
      ...this.patterns.portfolio,
      ...this.patterns.information
    ];
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: keyof NLPatterns): ReadonlyArray<IntentPattern> {
    return this.patterns[category];
  }

  /**
   * Get patterns by intent
   */
  getPatternsByIntent(intent: DefiIntent): ReadonlyArray<IntentPattern> {
    return this.getAllPatterns().filter(pattern => pattern.intent === intent);
  }

  /**
   * Initialize all patterns
   */
  private initializePatterns(): NLPatterns {
    return {
      lending: this.createLendingPatterns(),
      liquidity: this.createLiquidityPatterns(),
      trading: this.createTradingPatterns(),
      arbitrage: this.createArbitragePatterns(),
      portfolio: this.createPortfolioPatterns(),
      information: this.createInformationPatterns()
    };
  }

  /**
   * Create lending patterns
   */
  private createLendingPatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Lending/Supply patterns
      {
        intent: DefiIntent.LEND,
        patterns: [
          /(?:lend|supply|deposit|provide)\s+(\d+(?:\.\d+)?)\s+(\w+)/i,
          /(?:lend|supply|deposit|provide)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:to|on|at)\s+(\w+)/i,
          /(?:lend|supply|deposit|provide)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:for|at)\s+(?:the\s+)?best\s+(?:rate|apy|yield)/i,
          /(?:lend|supply|deposit|provide)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:for|to get)\s+(?:maximum|max|highest)\s+(?:yield|return|apy)/i,
          /(?:lend|supply|deposit|provide)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:with|using)\s+(?:minimal|low|minimum)\s+risk/i,
          /(?:earn|generate)\s+(?:yield|interest|return)\s+(?:on|with|from)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:stake|deposit)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:to|for)\s+(?:earn|generate|get)\s+(?:yield|interest|apy)/i,
          /(?:optimize|maximize)\s+(?:yield|return)\s+(?:on|for)\s+(\d+(?:\.\d+)?)\s*(\w+)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.PERCENTAGE],
        confidence: 0.9,
        examples: [
          'Lend 1000 USDC',
          'Supply 500 USDT to DragonSwap',
          'Deposit 100 SEI for the best rate',
          'Provide 1000 USDC for maximum yield',
          'Lend 500 USDT with minimal risk',
          'Earn yield on 1000 USDC',
          'Stake 100 SEI to earn APY',
          'Optimize yield on 1000 USDC'
        ]
      },

      // Borrowing patterns
      {
        intent: DefiIntent.BORROW,
        patterns: [
          /(?:borrow|take|loan|get)\s+(\d+(?:\.\d+)?)\s+(\w+)/i,
          /(?:borrow|take|loan|get)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:from|at|on)\s+(\w+)/i,
          /(?:borrow|take|loan|get)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:against|using)\s+(\w+)\s+(?:collateral|as collateral)/i,
          /(?:borrow|take|loan|get)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:at|with)\s+(\d+(?:\.\d+)?%)\s+(?:interest|rate|apy)/i,
          /(?:leverage|margin)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:by|with)\s+(\d+x)/i,
          /(?:take out|get)\s+(?:a\s+)?(?:loan|credit)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:borrow|take|loan|get)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:for|to)\s+(?:trading|investment|yield farming)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.LEVERAGE, EntityType.PERCENTAGE],
        confidence: 0.9,
        examples: [
          'Borrow 500 USDT',
          'Take 1000 USDC from Silo',
          'Borrow 500 USDT against SEI collateral',
          'Borrow 1000 USDC at 5% interest',
          'Leverage 500 USDT by 2x',
          'Take out a loan of 1000 USDC',
          'Borrow 500 USDT for trading'
        ]
      },

      // Repayment patterns
      {
        intent: DefiIntent.REPAY,
        patterns: [
          /(?:repay|pay back|return|close)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:loan|debt|borrowed)/i,
          /(?:repay|pay back|return|close)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:to|on|at)\s+(\w+)/i,
          /(?:repay|pay back|return|close)\s+(?:my\s+)?(?:loan|debt|borrowed)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:repay|pay back|return|close)\s+(?:all|entire|full)\s+(?:loan|debt|borrowed)/i,
          /(?:pay|settle)\s+(?:my\s+)?(?:debt|loan|borrowed)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:close|exit)\s+(?:my\s+)?(?:borrowing|lending)\s+(?:position|loan)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Repay 500 USDT loan',
          'Pay back 1000 USDC to Silo',
          'Return my loan of 500 USDT',
          'Repay all debt',
          'Pay my debt of 1000 USDC',
          'Close my borrowing position'
        ]
      },

      // Withdrawal patterns
      {
        intent: DefiIntent.WITHDRAW,
        patterns: [
          /(?:withdraw|remove|take out|redeem)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:withdraw|remove|take out|redeem)\s+(\d+(?:\.\d+)?)\s*(\w+)?\s+(?:from|at|on)\s+(\w+)/i,
          /(?:withdraw|remove|take out|redeem)\s+(?:my\s+)?(?:deposit|supply|stake)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:withdraw|remove|take out|redeem)\s+(?:all|entire|full)\s+(?:deposit|supply|stake)/i,
          /(?:unstake|unsupply)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:cash out|liquidate)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:exit|close)\s+(?:my\s+)?(?:lending|supply)\s+(?:position|deposit)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Withdraw 1000 USDC',
          'Remove 500 USDT from DragonSwap',
          'Take out my deposit of 1000 USDC',
          'Withdraw all supply',
          'Unstake 100 SEI',
          'Cash out 500 USDT',
          'Exit my lending position'
        ]
      }
    ];
  }

  /**
   * Create liquidity patterns
   */
  private createLiquidityPatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Add liquidity patterns
      {
        intent: DefiIntent.ADD_LIQUIDITY,
        patterns: [
          /(?:add|provide)\s+(?:liquidity|LP)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(\w+)\s+(?:and|&|\+)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:add|provide)\s+(?:liquidity|LP)\s+(?:to|for)\s+(\w+)\/(\w+)\s+(?:pool|pair)/i,
          /(?:add|provide)\s+(?:liquidity|LP)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to|for)\s+(\w+)/i,
          /(?:create|enter)\s+(?:liquidity|LP)\s+(?:position|pool)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:deposit|stake)\s+(?:in|to)\s+(\w+)\/(\w+)\s+(?:pool|pair|LP)/i,
          /(?:farm|yield farm)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:provide|add)\s+(?:concentrated|range)\s+(?:liquidity|LP)\s+(?:from\s+)?(\d+(?:\.\d+)?)\s+(?:to\s+)?(\d+(?:\.\d+)?)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.PRICE],
        confidence: 0.9,
        examples: [
          'Add liquidity with 1000 USDC and 0.5 ETH',
          'Provide liquidity to USDC/SEI pool',
          'Add liquidity of 1000 USDC to DragonSwap',
          'Create liquidity position with 500 USDT',
          'Deposit in USDC/ETH pool',
          'Farm with 1000 USDC',
          'Provide concentrated liquidity from 1800 to 2000'
        ]
      },

      // Remove liquidity patterns
      {
        intent: DefiIntent.REMOVE_LIQUIDITY,
        patterns: [
          /(?:remove|withdraw)\s+(?:liquidity|LP)\s+(?:from\s+)?(\w+)\/(\w+)\s+(?:pool|pair)/i,
          /(?:remove|withdraw)\s+(?:liquidity|LP)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:remove|withdraw)\s+(?:all|entire|full)\s+(?:liquidity|LP)/i,
          /(?:exit|close)\s+(?:liquidity|LP)\s+(?:position|pool)/i,
          /(?:unstake|remove)\s+(?:from\s+)?(\w+)\/(\w+)\s+(?:pool|pair|LP)/i,
          /(?:liquidate|cash out)\s+(?:liquidity|LP)\s+(?:position|pool)/i,
          /(?:stop|end)\s+(?:yield farming|farming)\s+(?:in\s+)?(\w+)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.AMOUNT],
        confidence: 0.9,
        examples: [
          'Remove liquidity from USDC/SEI pool',
          'Withdraw liquidity of 1000 USDC',
          'Remove all liquidity',
          'Exit liquidity position',
          'Unstake from USDC/ETH pool',
          'Liquidate liquidity position',
          'Stop yield farming in DragonSwap'
        ]
      }
    ];
  }

  /**
   * Create trading patterns
   */
  private createTradingPatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Swap patterns
      {
        intent: DefiIntent.SWAP,
        patterns: [
          /(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to|for|into)\s+(\w+)/i,
          /(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to|for|into)\s+(\w+)\s+(?:on|at|using)\s+(\w+)/i,
          /(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:to|for|into)\s+(\w+)\s+(?:with|at)\s+(?:minimal|low|minimum)\s+(?:slippage|fees)/i,
          /(?:sell|buy)\s+(\d+(?:\.\d+)?)\s*(\w+)\s+(?:for|with)\s+(\w+)/i,
          /(?:market|limit)\s+(?:order|trade)\s+(?:to\s+)?(?:swap|trade|exchange|convert)\s+(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:get|obtain)\s+(\w+)\s+(?:with|using)\s+(\d+(?:\.\d+)?)\s*(\w+)/i
        ],
        requiredEntities: [EntityType.AMOUNT, EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.SLIPPAGE],
        confidence: 0.9,
        examples: [
          'Swap 1000 USDC to SEI',
          'Trade 500 USDT for ETH on DragonSwap',
          'Exchange 1000 USDC to SEI with minimal slippage',
          'Sell 500 USDT for SEI',
          'Market order to swap 1000 USDC',
          'Get SEI with 1000 USDC'
        ]
      },

      // Open position patterns
      {
        intent: DefiIntent.OPEN_POSITION,
        patterns: [
          /(?:open|enter)\s+(?:a\s+)?(?:long|short)\s+(?:position|trade)\s+(?:on|for|in)\s+(\w+)/i,
          /(?:open|enter)\s+(?:a\s+)?(\d+x)\s+(?:long|short)\s+(?:position|trade)\s+(?:on|for|in)\s+(\w+)/i,
          /(?:long|short)\s+(\w+)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:long|short)\s+(\w+)\s+(?:at\s+)?(\d+x)\s+(?:leverage|margin)/i,
          /(?:buy|sell)\s+(\w+)\s+(?:perpetual|perp|futures)/i,
          /(?:margin|leverage)\s+(?:trade|buy|sell)\s+(\w+)\s+(?:with\s+)?(\d+(?:\.\d+)?)\s*(\w+)/i,
          /(?:take|enter)\s+(?:a\s+)?(?:leveraged|margin)\s+(?:position|trade)\s+(?:in|on)\s+(\w+)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.LEVERAGE, EntityType.AMOUNT, EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Open a long position on SEI',
          'Enter a 5x long position on ETH',
          'Long SEI with 1000 USDC',
          'Short ETH at 10x leverage',
          'Buy SEI perpetual',
          'Margin trade SEI with 1000 USDC',
          'Take a leveraged position in SEI'
        ]
      },

      // Close position patterns
      {
        intent: DefiIntent.CLOSE_POSITION,
        patterns: [
          /(?:close|exit)\s+(?:my\s+)?(?:position|trade)\s+(?:on|in)\s+(\w+)/i,
          /(?:close|exit)\s+(?:my\s+)?(?:long|short)\s+(?:position|trade)\s+(?:on|in)\s+(\w+)/i,
          /(?:close|exit)\s+(?:all|entire|full)\s+(?:positions|trades)/i,
          /(?:sell|liquidate)\s+(?:my\s+)?(?:position|trade)\s+(?:in|on)\s+(\w+)/i,
          /(?:take profit|stop loss)\s+(?:on|for)\s+(\w+)/i,
          /(?:cut|reduce)\s+(?:my\s+)?(?:position|exposure)\s+(?:in|on)\s+(\w+)/i,
          /(?:flatten|square)\s+(?:my\s+)?(?:position|trade)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.PERCENTAGE],
        confidence: 0.9,
        examples: [
          'Close my position on SEI',
          'Exit my long position in ETH',
          'Close all positions',
          'Sell my position in SEI',
          'Take profit on ETH',
          'Cut my position in SEI',
          'Flatten my position'
        ]
      }
    ];
  }

  /**
   * Create arbitrage patterns
   */
  private createArbitragePatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Arbitrage patterns
      {
        intent: DefiIntent.ARBITRAGE,
        patterns: [
          /(?:arbitrage|arb)\s+(\w+)\s+(?:between|across)\s+(\w+)\s+(?:and|&|\+)\s+(\w+)/i,
          /(?:find|show|check)\s+(?:arbitrage|arb)\s+(?:opportunities|opps)\s+(?:for|in)\s+(\w+)/i,
          /(?:profit|make money)\s+(?:from|with)\s+(?:arbitrage|arb)\s+(?:on|in)\s+(\w+)/i,
          /(?:cross|multi)\s+(?:protocol|platform)\s+(?:arbitrage|arb)\s+(?:for|with)\s+(\w+)/i,
          /(?:exploit|take advantage of)\s+(?:price|rate)\s+(?:differences|differentials)\s+(?:in|for)\s+(\w+)/i,
          /(?:buy|purchase)\s+(\w+)\s+(?:on|at)\s+(\w+)\s+(?:and|&|\+)\s+(?:sell|dump)\s+(?:on|at)\s+(\w+)/i,
          /(?:triangular|triangle)\s+(?:arbitrage|arb)\s+(?:with|using)\s+(\w+)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.AMOUNT],
        confidence: 0.9,
        examples: [
          'Arbitrage SEI between DragonSwap and Symphony',
          'Find arbitrage opportunities for USDC',
          'Profit from arbitrage on ETH',
          'Cross protocol arbitrage for SEI',
          'Exploit price differences in USDC',
          'Buy SEI on DragonSwap and sell on Symphony',
          'Triangular arbitrage with USDC'
        ]
      },

      // Cross-protocol arbitrage patterns
      {
        intent: DefiIntent.CROSS_PROTOCOL_ARBITRAGE,
        patterns: [
          /(?:cross|multi)\s+(?:protocol|platform|chain)\s+(?:arbitrage|arb)\s+(?:for|with)\s+(\w+)/i,
          /(?:arbitrage|arb)\s+(\w+)\s+(?:across|between)\s+(?:multiple|different)\s+(?:protocols|platforms|chains)/i,
          /(?:find|identify)\s+(?:cross|multi)\s+(?:protocol|platform)\s+(?:opportunities|opps)\s+(?:for|in)\s+(\w+)/i,
          /(?:maximize|optimize)\s+(?:profits|returns)\s+(?:from|with)\s+(?:cross|multi)\s+(?:protocol|platform)\s+(?:arbitrage|arb)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL, EntityType.AMOUNT],
        confidence: 0.9,
        examples: [
          'Cross protocol arbitrage for SEI',
          'Arbitrage USDC across multiple protocols',
          'Find cross protocol opportunities for ETH',
          'Maximize profits from cross protocol arbitrage'
        ]
      }
    ];
  }

  /**
   * Create portfolio patterns
   */
  private createPortfolioPatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Portfolio status patterns
      {
        intent: DefiIntent.PORTFOLIO_STATUS,
        patterns: [
          /(?:show|display|check)\s+(?:my\s+)?(?:portfolio|balance|holdings|positions)/i,
          /(?:what|how)\s+(?:is|are)\s+(?:my\s+)?(?:portfolio|balance|holdings|positions)/i,
          /(?:portfolio|balance|holdings|positions)\s+(?:status|summary|overview)/i,
          /(?:total|current)\s+(?:portfolio|balance)\s+(?:value|worth)/i,
          /(?:how much|what)\s+(?:do I have|is my balance|are my holdings)/i,
          /(?:net worth|total value|portfolio value)/i,
          /(?:account|wallet)\s+(?:balance|summary|overview)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.PROTOCOL, EntityType.TOKEN],
        confidence: 0.9,
        examples: [
          'Show my portfolio',
          'What is my balance',
          'Portfolio status',
          'Total portfolio value',
          'How much do I have',
          'Net worth',
          'Account balance'
        ]
      },

      // Risk assessment patterns
      {
        intent: DefiIntent.RISK_ASSESSMENT,
        patterns: [
          /(?:check|analyze|assess)\s+(?:my\s+)?(?:risk|risks|risk exposure)/i,
          /(?:how|what)\s+(?:risky|dangerous|safe)\s+(?:is|are)\s+(?:my\s+)?(?:portfolio|positions)/i,
          /(?:risk|health|safety)\s+(?:assessment|analysis|check)/i,
          /(?:am I|is my portfolio)\s+(?:safe|at risk|in danger)/i,
          /(?:liquidation|liquidate)\s+(?:risk|danger|threat)/i,
          /(?:health|safety)\s+(?:factor|ratio|score)/i,
          /(?:portfolio|position)\s+(?:risk|safety)\s+(?:analysis|assessment)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.PROTOCOL, EntityType.TOKEN],
        confidence: 0.9,
        examples: [
          'Check my risk',
          'How risky is my portfolio',
          'Risk assessment',
          'Am I safe',
          'Liquidation risk',
          'Health factor',
          'Portfolio risk analysis'
        ]
      },

      // Yield optimization patterns
      {
        intent: DefiIntent.YIELD_OPTIMIZATION,
        patterns: [
          /(?:optimize|maximize|improve)\s+(?:my\s+)?(?:yield|yields|returns|apy|apr)/i,
          /(?:find|get|show)\s+(?:best|highest|maximum|optimal)\s+(?:yield|yields|returns|apy|apr)/i,
          /(?:yield|return)\s+(?:optimization|maximization|improvement)/i,
          /(?:how to|ways to)\s+(?:optimize|maximize|improve)\s+(?:my\s+)?(?:yield|yields|returns)/i,
          /(?:better|higher|improved)\s+(?:yield|yields|returns|apy|apr)/i,
          /(?:compound|compounding)\s+(?:yield|yields|returns|interest)/i,
          /(?:auto|automatic)\s+(?:compound|compounding|reinvest)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.TOKEN, EntityType.PROTOCOL, EntityType.AMOUNT],
        confidence: 0.9,
        examples: [
          'Optimize my yield',
          'Find best yield',
          'Yield optimization',
          'How to maximize my returns',
          'Better yield',
          'Compound yield',
          'Auto compound'
        ]
      },

      // Rebalancing patterns
      {
        intent: DefiIntent.REBALANCE,
        patterns: [
          /(?:rebalance|rebalancing)\s+(?:my\s+)?(?:portfolio|positions|holdings)/i,
          /(?:adjust|modify|change)\s+(?:my\s+)?(?:portfolio|positions|allocation)/i,
          /(?:diversify|spread)\s+(?:my\s+)?(?:portfolio|positions|holdings)/i,
          /(?:portfolio|position)\s+(?:rebalancing|adjustment|modification)/i,
          /(?:asset|token)\s+(?:allocation|distribution|rebalancing)/i,
          /(?:redistribute|reallocate)\s+(?:my\s+)?(?:assets|tokens|holdings)/i,
          /(?:balance|even out)\s+(?:my\s+)?(?:portfolio|positions)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.PERCENTAGE, EntityType.TOKEN],
        confidence: 0.9,
        examples: [
          'Rebalance my portfolio',
          'Adjust my positions',
          'Diversify my portfolio',
          'Portfolio rebalancing',
          'Asset allocation',
          'Redistribute my assets',
          'Balance my portfolio'
        ]
      }
    ];
  }

  /**
   * Create information patterns
   */
  private createInformationPatterns(): ReadonlyArray<IntentPattern> {
    return [
      // Show rates patterns
      {
        intent: DefiIntent.SHOW_RATES,
        patterns: [
          /(?:show|display|check|what)\s+(?:are\s+(?:the\s+)?)?(?:rates|rate|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:what|how much)\s+(?:is|are)\s+(?:the\s+)?(?:rate|rates|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:current|latest)\s+(?:rates|rate|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:interest|lending|borrowing)\s+(?:rates|rate)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:best|highest|lowest)\s+(?:rates|rate|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:compare|comparison)\s+(?:rates|rate|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i,
          /(?:market|protocol)\s+(?:rates|rate|apy|apr|yield)\s+(?:for|on|in)\s+(\w+)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Show rates for USDC',
          'What is the APY for SEI',
          'Current rates for ETH',
          'Interest rates for USDC',
          'Best rates for SEI',
          'Compare rates for USDC',
          'Market rates for ETH'
        ]
      },

      // Show positions patterns
      {
        intent: DefiIntent.SHOW_POSITIONS,
        patterns: [
          /(?:show|display|list)\s+(?:my\s+)?(?:positions|holdings|deposits|loans|stakes)/i,
          /(?:what|where)\s+(?:are|is)\s+(?:my\s+)?(?:positions|holdings|deposits|loans|stakes)/i,
          /(?:current|active)\s+(?:positions|holdings|deposits|loans|stakes)/i,
          /(?:my\s+)?(?:positions|holdings|deposits|loans|stakes)\s+(?:list|overview|summary)/i,
          /(?:lending|borrowing|liquidity|trading)\s+(?:positions|holdings)/i,
          /(?:open|active)\s+(?:positions|trades|orders)/i,
          /(?:portfolio|account)\s+(?:positions|holdings|breakdown)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.PROTOCOL, EntityType.TOKEN],
        confidence: 0.9,
        examples: [
          'Show my positions',
          'What are my holdings',
          'Current positions',
          'My positions list',
          'Lending positions',
          'Open positions',
          'Portfolio positions'
        ]
      },

      // Compare protocols patterns
      {
        intent: DefiIntent.COMPARE_PROTOCOLS,
        patterns: [
          /(?:compare|comparison)\s+(?:protocols|platforms)\s+(?:for|in)\s+(\w+)/i,
          /(?:which|what)\s+(?:protocol|platform)\s+(?:is|has)\s+(?:best|better|highest|lowest)\s+(?:for|in)\s+(\w+)/i,
          /(?:protocol|platform)\s+(?:comparison|analysis)\s+(?:for|in)\s+(\w+)/i,
          /(?:best|optimal|recommended)\s+(?:protocol|platform)\s+(?:for|to)\s+(\w+)/i,
          /(?:differences|pros and cons)\s+(?:between|of)\s+(?:protocols|platforms)/i,
          /(?:evaluate|assess)\s+(?:protocols|platforms)\s+(?:for|in)\s+(\w+)/i,
          /(?:protocol|platform)\s+(?:rates|fees|features)\s+(?:comparison|analysis)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.TOKEN, EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Compare protocols for USDC',
          'Which protocol is best for SEI',
          'Protocol comparison for lending',
          'Best protocol for yield',
          'Differences between protocols',
          'Evaluate protocols for trading',
          'Protocol rates comparison'
        ]
      },

      // Market analysis patterns
      {
        intent: DefiIntent.MARKET_ANALYSIS,
        patterns: [
          /(?:market|price|trend)\s+(?:analysis|data|info|information)\s+(?:for|on)\s+(\w+)/i,
          /(?:analyze|check)\s+(?:market|price|trend)\s+(?:for|on)\s+(\w+)/i,
          /(?:market|price|trend)\s+(?:conditions|situation|outlook)\s+(?:for|on)\s+(\w+)/i,
          /(?:technical|fundamental)\s+(?:analysis|data)\s+(?:for|on)\s+(\w+)/i,
          /(?:price|market)\s+(?:movement|action|volatility)\s+(?:for|on)\s+(\w+)/i,
          /(?:bullish|bearish|sentiment)\s+(?:analysis|outlook)\s+(?:for|on)\s+(\w+)/i,
          /(?:support|resistance)\s+(?:levels|zones)\s+(?:for|on)\s+(\w+)/i
        ],
        requiredEntities: [EntityType.TOKEN],
        optionalEntities: [EntityType.TIMEFRAME],
        confidence: 0.9,
        examples: [
          'Market analysis for SEI',
          'Analyze market for ETH',
          'Price conditions for USDC',
          'Technical analysis for SEI',
          'Price movement for ETH',
          'Bullish analysis for SEI',
          'Support levels for ETH'
        ]
      },

      // Help patterns
      {
        intent: DefiIntent.HELP,
        patterns: [
          /(?:help|assist|guide|support)/i,
          /(?:how|what)\s+(?:can|do)\s+(?:I|you)\s+(?:do|use|help)/i,
          /(?:what|which)\s+(?:commands|actions|operations)\s+(?:can|are)\s+(?:I|available)/i,
          /(?:tutorial|guide|instructions)\s+(?:for|on|about)\s+(\w+)/i,
          /(?:explain|tell me about|describe)\s+(\w+)/i,
          /(?:how to|ways to)\s+(\w+)/i,
          /(?:getting started|beginner|new user)/i
        ],
        requiredEntities: [],
        optionalEntities: [EntityType.TOKEN, EntityType.PROTOCOL],
        confidence: 0.9,
        examples: [
          'Help',
          'How can I help',
          'What commands can I use',
          'Tutorial for lending',
          'Explain yield farming',
          'How to swap tokens',
          'Getting started'
        ]
      }
    ];
  }

  /**
   * Get pattern examples for intent
   */
  getExamples(intent: DefiIntent): ReadonlyArray<string> {
    const patterns = this.getPatternsByIntent(intent);
    return patterns.flatMap(pattern => pattern.examples);
  }

  /**
   * Get required entities for intent
   */
  getRequiredEntities(intent: DefiIntent): ReadonlyArray<EntityType> {
    const patterns = this.getPatternsByIntent(intent);
    if (patterns.length === 0) return [];
    
    // Return the required entities from the first pattern
    return patterns[0].requiredEntities;
  }

  /**
   * Get optional entities for intent
   */
  getOptionalEntities(intent: DefiIntent): ReadonlyArray<EntityType> {
    const patterns = this.getPatternsByIntent(intent);
    if (patterns.length === 0) return [];
    
    // Return the optional entities from the first pattern
    return patterns[0].optionalEntities;
  }

  /**
   * Check if intent requires specific entities
   */
  intentRequiresEntities(intent: DefiIntent, entities: ReadonlyArray<EntityType>): boolean {
    const requiredEntities = this.getRequiredEntities(intent);
    return requiredEntities.every(required => entities.includes(required));
  }

  /**
   * Get intent confidence
   */
  getIntentConfidence(intent: DefiIntent): number {
    const patterns = this.getPatternsByIntent(intent);
    if (patterns.length === 0) return 0;
    
    // Return the confidence from the first pattern
    return patterns[0].confidence;
  }
}