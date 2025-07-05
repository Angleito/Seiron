import React, { useState } from 'react';
import { SafeHtml, SafeText, SafeChatMessage, SafeVoiceTranscript, SafeTransactionDescription } from '@components/SafeHtml';
import { SANITIZE_CONFIGS } from '@lib/sanitize';
import { AlertTriangle, Shield, Code, MessageSquare, Mic, CreditCard } from 'lucide-react';

function SecurityTestPage() {
  const [testInput, setTestInput] = useState('<script>alert("XSS")</script><b>Bold text</b><i>Italic</i>');

  const xssTestCases = [
    '<script>alert("XSS Attack!")</script>Hello',
    '<img src=x onerror=alert("XSS")>',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<svg onload=alert("XSS")>',
    '<div onclick="alert(\'XSS\')">Click me</div>',
    'javascript:alert("XSS")',
    '<object data="javascript:alert(\'XSS\')"></object>',
    '<embed src="javascript:alert(\'XSS\')"></embed>',
    '<form><button formaction="javascript:alert(\'XSS\')">Submit</button></form>',
    '<style>@import"javascript:alert(\'XSS\')"</style>',
    '<b>Safe content</b> with <script>alert("dangerous")</script> mixed in',
    'Buy <script>steal(wallet)</script>100 tokens now!',
    '<p>Transaction for 100 ETH</p><script>stealFunds()</script>',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <Shield className="text-green-400" />
            Security Sanitization Test
          </h1>
          <p className="text-gray-300">
            This page demonstrates XSS protection through DOMPurify sanitization.
            All content below has been processed through our security filters.
          </p>
        </div>

        {/* Interactive Test */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="text-blue-400" />
            Interactive Sanitization Test
          </h2>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">
              Enter content to test (try adding script tags, onclick handlers, etc.):
            </label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
              rows={3}
              placeholder="Try: <script>alert('XSS')</script><b>Bold</b>"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Text Only
              </h3>
              <div className="bg-gray-900 p-2 rounded border">
                <SafeText className="text-white">{testInput}</SafeText>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat Message
              </h3>
              <div className="bg-gray-900 p-2 rounded border">
                <SafeChatMessage className="text-white">{testInput}</SafeChatMessage>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Transcript
              </h3>
              <div className="bg-gray-900 p-2 rounded border">
                <SafeVoiceTranscript className="text-white">{testInput}</SafeVoiceTranscript>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Transaction
              </h3>
              <div className="bg-gray-900 p-2 rounded border">
                <SafeTransactionDescription className="text-white">{testInput}</SafeTransactionDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Predefined XSS Test Cases */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-400" />
            XSS Attack Vector Tests
          </h2>
          <p className="text-gray-300 mb-4">
            Below are common XSS attack patterns. All have been neutralized by our sanitization:
          </p>

          <div className="space-y-4">
            {xssTestCases.map((testCase, index) => (
              <div key={index} className="bg-gray-700 p-4 rounded">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">Original (Dangerous):</h4>
                    <code className="block bg-red-900/20 border border-red-500/30 p-2 rounded text-red-300 text-sm break-all">
                      {testCase}
                    </code>
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-2">Sanitized (Safe):</h4>
                    <div className="bg-green-900/20 border border-green-500/30 p-2 rounded">
                      <SafeText className="text-green-300">{testCase}</SafeText>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Demonstration */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-blue-400" />
            Sanitization Configuration Examples
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-blue-400 font-semibold mb-3">Chat Message Config</h3>
              <p className="text-gray-300 text-sm mb-2">
                Allows: b, i, em, strong, u, br, p, span
              </p>
              <div className="bg-gray-900 p-3 rounded border">
                <SafeHtml 
                  config={SANITIZE_CONFIGS.CHAT_MESSAGE}
                  className="text-white"
                >
                  {'<b>Bold</b> <i>italic</i> <script>alert("blocked")</script> <p>Paragraph</p>'}
                </SafeHtml>
              </div>
            </div>

            <div>
              <h3 className="text-purple-400 font-semibold mb-3">Transaction Config</h3>
              <p className="text-gray-300 text-sm mb-2">
                Allows: br, p (very restrictive)
              </p>
              <div className="bg-gray-900 p-3 rounded border">
                <SafeHtml 
                  config={SANITIZE_CONFIGS.TRANSACTION_DESCRIPTION}
                  className="text-white"
                >
                  {'<p>Safe description</p><b>Not allowed</b><script>alert("blocked")</script>'}
                </SafeHtml>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-green-400" />
            <h3 className="text-green-400 font-semibold">Security Status: Protected</h3>
          </div>
          <p className="text-green-300 text-sm">
            All content on this page has been processed through DOMPurify sanitization.
            Script execution, dangerous attributes, and malicious protocols have been neutralized.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SecurityTestPage;