# AI Decision Engine

This module contains the core AI models and decision-making logic for portfolio management.

## Components

- **Portfolio Optimizer**: Determines optimal asset allocation
- **Yield Predictor**: Forecasts lending rates and LP returns
- **Risk Analyzer**: Evaluates protocol and market risks
- **Strategy Generator**: Creates custom DeFi strategies

## Models

### 1. Yield Optimization Model
- Predicts best lending/LP opportunities
- Factors in risk, gas costs, and time horizons
- Updates predictions based on market conditions

### 2. Risk Assessment Model
- Evaluates protocol security scores
- Monitors market volatility
- Calculates position-specific risks

### 3. Portfolio Allocation Model
- Optimizes asset distribution
- Balances yield vs. risk
- Considers user preferences and constraints

## Usage

```typescript
import { AIDecisionEngine } from './AIDecisionEngine';

const ai = new AIDecisionEngine({
  model: 'balanced-defi',
  riskTolerance: 0.5,
  updateFrequency: '1h'
});

const strategy = await ai.generateStrategy({
  capital: 10000,
  goals: ['yield', 'safety'],
  timeHorizon: '30d'
});
```