const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'msw-mock-server' });
});

// ElevenLabs TTS Mock
app.post('/v1/text-to-speech/:voiceId', (req, res) => {
  console.log('Mock ElevenLabs TTS request:', {
    voiceId: req.params.voiceId,
    text: req.body.text?.substring(0, 100) + '...'
  });
  
  // Return mock audio data
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(Buffer.from('mock-audio-data-' + Date.now()));
});

app.post('/v1/text-to-speech/:voiceId/stream', (req, res) => {
  console.log('Mock ElevenLabs TTS stream request');
  
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Simulate streaming response
  const chunks = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5'];
  let index = 0;
  
  const interval = setInterval(() => {
    if (index < chunks.length) {
      res.write(Buffer.from(chunks[index]));
      index++;
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 100);
});

// OpenAI Chat Mock
app.post('/v1/chat/completions', (req, res) => {
  console.log('Mock OpenAI chat request:', {
    model: req.body.model,
    messages: req.body.messages?.length
  });
  
  const lastMessage = req.body.messages?.[req.body.messages.length - 1];
  let responseContent = 'Mock AI response';
  
  // Provide context-aware responses
  if (lastMessage?.content.toLowerCase().includes('portfolio')) {
    responseContent = 'Your portfolio is worth $1,000,000. You have 500 SEI ($500,000) and 500,000 USDC ($500,000).';
  } else if (lastMessage?.content.toLowerCase().includes('supply')) {
    const match = lastMessage.content.match(/(\d+)\s+(\w+)/);
    if (match) {
      responseContent = `I'll help you supply ${match[1]} ${match[2]} to the lending protocol. This transaction will earn you approximately 5% APY.`;
    }
  } else if (lastMessage?.content.toLowerCase().includes('swap')) {
    responseContent = 'I'll help you swap tokens at the best available rate.';
  }
  
  res.json({
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: req.body.model || 'gpt-4',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: responseContent
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150
    }
  });
});

// Blockchain RPC Mock
app.post('/rpc', (req, res) => {
  console.log('Mock RPC request:', req.body.method);
  
  const responses = {
    'eth_getBalance': {
      jsonrpc: '2.0',
      id: req.body.id,
      result: '0x' + '1'.repeat(20) // Large balance
    },
    'eth_sendTransaction': {
      jsonrpc: '2.0',
      id: req.body.id,
      result: '0x' + 'a'.repeat(64) // Mock tx hash
    },
    'eth_getTransactionReceipt': {
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        transactionHash: '0x' + 'a'.repeat(64),
        blockNumber: '0x' + Math.floor(Math.random() * 1000000).toString(16),
        status: '0x1', // Success
        gasUsed: '0x' + Math.floor(Math.random() * 100000).toString(16)
      }
    },
    'eth_gasPrice': {
      jsonrpc: '2.0',
      id: req.body.id,
      result: '0x' + (10 * 1e9).toString(16) // 10 gwei
    }
  };
  
  const response = responses[req.body.method] || {
    jsonrpc: '2.0',
    id: req.body.id,
    result: null
  };
  
  res.json(response);
});

// Generic proxy for unmocked endpoints
app.all('*', (req, res) => {
  console.log('Unhandled request:', req.method, req.path);
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`MSW mock server running on port ${PORT}`);
  console.log('Mock endpoints:');
  console.log('- POST /v1/text-to-speech/:voiceId');
  console.log('- POST /v1/text-to-speech/:voiceId/stream');
  console.log('- POST /v1/chat/completions');
  console.log('- POST /rpc');
});