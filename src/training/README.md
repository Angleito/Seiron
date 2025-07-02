# AI Model Training System

This module handles the training and improvement of AI models used by the Sei Portfolio Manager. It collects data from DeFi protocols, user interactions, and market conditions to continuously improve the AI's decision-making capabilities.

## 🚀 Features

- **Protocol Data Collection**: Gathers data from Yei Finance and DragonSwap
- **User Interaction Learning**: Learns from chat conversations and user preferences
- **Strategy Optimization**: Improves lending and liquidity strategies based on outcomes
- **Risk Model Training**: Enhances risk assessment from historical data
- **Performance Tracking**: Monitors and learns from portfolio performance
- **Continuous Learning**: Updates models based on new market conditions

## 📋 Requirements

- Node.js 16+ with TypeScript support
- OpenAI API key with fine-tuning access
- Sei blockchain data access
- Minimum 8GB RAM for training operations

## 🛠 Installation

```bash
# Install dependencies
npm install openai

# Environment setup
export OPENAI_API_KEY="your-openai-api-key"
export OPENAI_ORGANIZATION="your-org-id" # Optional
```

## 🔧 Quick Start

### 1. Initialize Training System

```typescript
import { TrainingSystem } from './src/training';

const training = new TrainingSystem({
  dataSource: 'sei-mainnet',
  protocols: ['yei-finance', 'dragonswap'],
  modelType: 'portfolio-optimizer',
  updateFrequency: '24h'
});

// Start data collection
await training.startDataCollection();
```

### 2. Collect Training Data

```typescript
// Collect DeFi protocol data
const defiData = await training.collectProtocolData({
  protocols: ['yei-finance', 'dragonswap'],
  period: '30d',
  metrics: ['apy', 'tvl', 'volume', 'fees']
});

// Collect user interaction data
const interactionData = await training.collectUserInteractions({
  includeChat: true,
  includeTransactions: true,
  anonymize: true
});

// Collect performance data
const performanceData = await training.collectPerformanceMetrics({
  strategies: ['lending', 'liquidity'],
  period: '90d'
});
```

### 3. Train AI Models

```typescript
// Train lending optimization model
const lendingModel = await training.trainModel({
  type: 'lending-optimizer',
  data: defiData.lending,
  objectives: ['maximize-apy', 'minimize-risk'],
  validationSplit: 0.2
});

// Train liquidity management model
const liquidityModel = await training.trainModel({
  type: 'liquidity-optimizer',
  data: defiData.liquidity,
  objectives: ['maximize-fees', 'minimize-il'],
  validationSplit: 0.2
});

// Train chat response model
const chatModel = await training.trainModel({
  type: 'chat-assistant',
  data: interactionData,
  style: 'helpful-concise',
  language: 'multi'
});
```

### 4. Monitor Training Progress

```typescript
// Get pipeline status
const pipeline = training.fineTuningManager.getPipeline(pipelineId);
console.log(`Status: ${pipeline?.status}, Progress: ${pipeline?.progress}%`);

// List all pipelines
const allPipelines = training.fineTuningManager.listPipelines();
```

### 5. Evaluate Trained Model

```typescript
// After training completes
const modelId = pipeline?.modelId;
if (modelId) {
  const evaluation = await training.evaluator.evaluateModel(
    modelId,
    testData,
    historicalMarketData
  );
  
  console.log('Evaluation Results:');
  console.log(`Accuracy: ${(evaluation.metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Sharpe Ratio: ${evaluation.metrics.portfolioMetrics.informationRatio}`);
}
```

### 6. Deploy Model to Production

```typescript
const deploymentId = await training.deploymentManager.deployModel(
  modelId!,
  'Portfolio-AI-Production',
  'v1.0.0',
  {
    modelId: modelId!,
    environment: 'production',
    scalingConfig: {
      minInstances: 2,
      maxInstances: 10,
      targetUtilization: 70
    },
    monitoring: {
      enableLogging: true,
      logLevel: 'info'
    }
  }
);

console.log(`Model deployed: ${deploymentId}`);
```

### 7. Use Trained Models in Production

```typescript
// The trained models are automatically integrated into the portfolio manager
const portfolioManager = new AIPortfolioManager({
  network: 'sei-mainnet',
  wallet: wallet,
  aiModel: 'balanced-defi', // Uses your trained models
  language: 'en'
});

// Models improve recommendations based on training
const chat = await portfolioManager.startChat();
const response = await chat.send("What's the best lending strategy right now?");
// AI uses trained models to provide optimized recommendations
```

## 📊 Model Performance Monitoring

### Health Checks

```typescript
// Get model health status
const health = training.deploymentManager.getModelHealth(deploymentId);
console.log(`Status: ${health.status}`);
console.log(`Success Rate: ${(health.metrics.successRate * 100).toFixed(2)}%`);
console.log(`Average Latency: ${health.metrics.averageLatency}ms`);

// Submit feedback for continuous improvement
await training.deploymentManager.submitFeedback(deploymentId, {
  inferenceId: 'inference_123',
  rating: 4, // 1-5 scale
  feedback: 'Good recommendations, slightly conservative',
  actualOutcome: {
    executedAction: portfolioAction,
    performanceResult: 0.08, // 8% return
    timeHorizon: 30
  }
});
```

### Automatic Monitoring

```typescript
// Start continuous monitoring
training.deploymentManager.startGlobalMonitoring(5); // Check every 5 minutes

// Stop monitoring
training.deploymentManager.stopGlobalMonitoring();
```

## 🧠 Advanced Usage

### Custom Prompt Engineering

```typescript
// Create custom prompts for specific scenarios
const customPrompt = training.promptEngineer.createPortfolioPrompt(marketData);
const rebalancePrompt = training.promptEngineer.generateRebalancePrompt(
  currentPortfolio,
  marketConditions
);

// Risk assessment prompts
const riskPrompt = training.promptEngineer.createRiskAssessmentPrompt(assetData);
```

### Batch Model Evaluation

```typescript
// Evaluate multiple models
const models = ['model-1', 'model-2', 'model-3'];
const evaluations = await Promise.all(
  models.map(modelId => 
    training.evaluator.evaluateModel(modelId, testData, historicalData)
  )
);

// Compare performance
evaluations.forEach((eval, i) => {
  console.log(`Model ${models[i]}: ${(eval.metrics.accuracy * 100).toFixed(2)}% accuracy`);
});
```

### A/B Testing

```typescript
// Deploy multiple model versions
const deploymentA = await training.deploymentManager.deployModel(
  modelIdA, 'Portfolio-AI-A', 'v1.0', configA
);
const deploymentB = await training.deploymentManager.deployModel(
  modelIdB, 'Portfolio-AI-B', 'v1.1', configB
);

// Split traffic between models
const useModelA = Math.random() < 0.5;
const deployment = useModelA ? deploymentA : deploymentB;

const recommendations = await training.deploymentManager.generateRecommendations(
  deployment, marketData, portfolio
);
```

## 🔒 Security & Best Practices

### API Key Management

```typescript
// Use environment variables
const config = {
  apiKey: process.env.OPENAI_API_KEY!,
  organization: process.env.OPENAI_ORGANIZATION,
  // Never hardcode API keys in source code
};

// Validate configuration
if (!config.apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}
```

### Data Privacy

```typescript
// Sanitize sensitive data before training
const sanitizedData = seiData.map(data => ({
  ...data,
  // Remove or hash sensitive information
  validators: data.validators.map(v => ({
    ...v,
    address: hashAddress(v.address) // Hash sensitive addresses
  }))
}));
```

### Error Handling

```typescript
try {
  const recommendations = await training.deploymentManager.generateRecommendations(
    deploymentId, marketData, portfolio
  );
  
  if (!recommendations.success) {
    // Fallback to conservative strategy
    const fallbackAction = getConservativePortfolioAction();
    return fallbackAction;
  }
  
  return recommendations.data;
} catch (error) {
  console.error('Portfolio recommendation failed:', error);
  // Implement fallback logic
  return getEmergencyPortfolioAction();
}
```

## 📈 Performance Optimization

### Training Optimization

```typescript
// Optimize training configuration based on data size
const optimizedConfig = FineTuningManager.createOptimizedConfig(
  'gpt-3.5-turbo',
  trainingData.length,
  'medium' // complexity level
);

// Estimate costs before training
const { estimatedCost, estimatedTime } = FineTuningManager.estimateTrainingCost(
  'gpt-3.5-turbo',
  trainingData.length,
  4 // epochs
);

console.log(`Estimated cost: $${estimatedCost.toFixed(2)}`);
console.log(`Estimated time: ${estimatedTime} minutes`);
```

### Data Optimization

```typescript
// Optimize dataset size while maintaining quality
const optimizedDataset = training.dataFormatter.optimizeDatasetSize(
  trainingExamples,
  1000 // target size
);

// Validate data quality
const validation = training.dataFormatter.validateTrainingFormat(optimizedDataset);
if (!validation.isValid) {
  console.error('Data validation failed:', validation.errors);
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Training Fails**: Check data format and OpenAI API limits
2. **Low Model Performance**: Increase training data diversity
3. **High Latency**: Optimize prompt length and model configuration
4. **Model Drift**: Implement regular retraining schedule

### Debug Mode

```typescript
// Enable detailed logging
process.env.DEBUG = 'training:*';

// Check pipeline status
const pipeline = training.fineTuningManager.getPipeline(pipelineId);
console.log('Pipeline details:', pipeline);

// Export results for analysis
const results = training.fineTuningManager.exportPipelineResults(pipelineId);
console.log('Detailed results:', results);
```

## 📚 API Reference

### Core Classes

- **OpenAITrainingClient**: Handles OpenAI API interactions
- **DataFormatter**: Converts data for training
- **PromptEngineer**: Creates optimized prompts
- **FineTuningManager**: Manages training pipelines
- **ModelEvaluator**: Evaluates model performance
- **ModelDeploymentManager**: Handles model deployment

### Configuration Types

```typescript
interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  defaultModel: string;
  fineTuningModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

interface TrainingConfig {
  baseModel: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  modelName: string;
  description: string;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes with tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [OpenAI Fine-tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [Sei Network Documentation](https://docs.sei.io/)
- [Portfolio Management Best Practices](https://example.com)

---

**Note**: This integration requires careful handling of financial data and should be thoroughly tested before production use. Always validate model recommendations with human expertise for critical investment decisions.