'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@lib/utils'
import { Zap, Sparkles } from 'lucide-react'
import DOMPurify from 'dompurify'

export interface AnimeMessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp?: Date
    powerLevel?: number
    emotion?: 'neutral' | 'excited' | 'serious' | 'powerful'
  }
  className?: string
  showTimestamp?: boolean
  showPowerLevel?: boolean
  enableAnimations?: boolean
}

// Simple markdown-like rendering (basic support without external lib)
function renderMarkdown(content: string): { __html: string } {
  // Sanitize first
  let html = DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  })

  // Basic markdown transformations
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="anime-code-block" data-language="${lang || 'plaintext'}"><code>${DOMPurify.sanitize(code.trim())}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="anime-inline-code">$1</code>')

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="anime-link">$1</a>')

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  return { __html: html }
}

// Copy button component for code blocks
/*
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="anime-copy-button"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  )
}
*/

export function AnimeMessageBubble({
  message,
  className,
  showTimestamp = true,
  showPowerLevel = true,
  enableAnimations = true
}: AnimeMessageBubbleProps) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [codeBlocks, setCodeBlocks] = useState<{ id: string; code: string }[]>([])

  // Extract code blocks for copy functionality
  useEffect(() => {
    if (messageRef.current) {
      const codeElements = messageRef.current.querySelectorAll('pre code')
      const blocks = Array.from(codeElements).map((el, index) => ({
        id: `code-${message.id}-${index}`,
        code: el.textContent || ''
      }))
      setCodeBlocks(blocks)

      // Add copy buttons to code blocks
      codeElements.forEach((el, index) => {
        const pre = el.parentElement
        if (pre && !pre.querySelector('.anime-copy-button')) {
          const wrapper = document.createElement('div')
          wrapper.className = 'anime-code-wrapper'
          pre.parentNode?.insertBefore(wrapper, pre)
          wrapper.appendChild(pre)
          
          const buttonContainer = document.createElement('div')
          buttonContainer.className = 'anime-copy-container'
          buttonContainer.id = `copy-${blocks[index]?.id || index}`
          wrapper.appendChild(buttonContainer)
        }
      })
    }
  }, [message.content, message.id])

  // Render copy buttons into their containers
  useEffect(() => {
    codeBlocks.forEach((block) => {
      const container = document.getElementById(`copy-${block.id}`)
      if (container && !container.hasChildNodes()) {
        const root = document.createElement('div')
        container.appendChild(root)
        
        // Manually render the copy button
        const button = document.createElement('button')
        button.className = 'anime-copy-button'
        button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'
        button.onclick = async () => {
          await navigator.clipboard.writeText(block.code)
          button.innerHTML = '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
          setTimeout(() => {
            button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>'
          }, 2000)
        }
        root.appendChild(button)
      }
    })
  }, [codeBlocks])

  const isUser = message.role === 'user'
  const powerLevel = message.powerLevel || (isUser ? 5000 : 9000)

  // Get emotion-based styling
  const getEmotionStyles = () => {
    switch (message.emotion) {
      case 'excited':
        return 'anime-emotion-excited'
      case 'serious':
        return 'anime-emotion-serious'
      case 'powerful':
        return 'anime-emotion-powerful'
      default:
        return 'anime-emotion-neutral'
    }
  }

  return (
    <div
      className={cn(
        'anime-message-wrapper',
        isUser ? 'anime-message-user' : 'anime-message-ai',
        enableAnimations && 'anime-message-animated',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ki/Energy Aura Effect */}
      {enableAnimations && (
        <div 
          className={cn(
            'anime-ki-aura',
            isHovered && 'anime-ki-aura-active',
            getEmotionStyles()
          )}
        />
      )}

      {/* Message Bubble */}
      <div 
        ref={messageRef}
        className={cn(
          'anime-message-bubble',
          isUser ? 'anime-bubble-user' : 'anime-bubble-ai',
          isHovered && 'anime-bubble-hover'
        )}
      >
        {/* Power Level Indicator */}
        {showPowerLevel && (
          <div className="anime-power-indicator">
            <Zap className="w-3 h-3" />
            <span className="anime-power-value">{powerLevel.toLocaleString()}</span>
          </div>
        )}

        {/* Message Content */}
        <div 
          className="anime-message-content"
          dangerouslySetInnerHTML={renderMarkdown(message.content)}
        />

        {/* Timestamp */}
        {showTimestamp && message.timestamp && (
          <div className="anime-message-timestamp">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        )}

        {/* Sparkle Effect for AI messages */}
        {!isUser && enableAnimations && (
          <Sparkles className="anime-sparkle-icon" />
        )}
      </div>

      {/* Energy Lines Effect */}
      {enableAnimations && isHovered && (
        <>
          <div className="anime-energy-line anime-energy-line-1" />
          <div className="anime-energy-line anime-energy-line-2" />
          <div className="anime-energy-line anime-energy-line-3" />
        </>
      )}
    </div>
  )
}

// CSS styles for the component
export const animeMessageStyles = `
  /* Message Wrapper */
  .anime-message-wrapper {
    position: relative;
    margin: 1rem 0;
    padding: 0 1rem;
  }

  .anime-message-user {
    display: flex;
    justify-content: flex-end;
  }

  .anime-message-ai {
    display: flex;
    justify-content: flex-start;
  }

  /* Ki/Energy Aura */
  .anime-ki-aura {
    position: absolute;
    inset: -8px;
    border-radius: 16px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 0;
  }

  .anime-ki-aura-active {
    opacity: 1;
  }

  .anime-emotion-neutral .anime-ki-aura {
    background: radial-gradient(circle at center, rgba(59, 130, 246, 0.2), transparent 70%);
  }

  .anime-emotion-excited .anime-ki-aura {
    background: radial-gradient(circle at center, rgba(251, 191, 36, 0.3), transparent 70%);
    animation: ki-pulse 2s ease-in-out infinite;
  }

  .anime-emotion-serious .anime-ki-aura {
    background: radial-gradient(circle at center, rgba(239, 68, 68, 0.25), transparent 70%);
  }

  .anime-emotion-powerful .anime-ki-aura {
    background: radial-gradient(circle at center, rgba(168, 85, 247, 0.3), transparent 70%);
    animation: ki-surge 1.5s ease-in-out infinite;
  }

  /* Message Bubble */
  .anime-message-bubble {
    position: relative;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    max-width: 600px;
    backdrop-filter: blur(4px);
    transition: all 0.3s ease;
    z-index: 1;
  }

  .anime-bubble-user {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.8));
    border: 2px solid rgba(96, 165, 250, 0.5);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    color: white;
  }

  .anime-bubble-ai {
    background: linear-gradient(135deg, rgba(251, 146, 60, 0.9), rgba(245, 101, 101, 0.8));
    border: 2px solid rgba(251, 191, 36, 0.5);
    box-shadow: 0 4px 12px rgba(251, 146, 60, 0.2);
    color: white;
  }

  .anime-bubble-hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .anime-bubble-user.anime-bubble-hover {
    border-color: rgba(147, 197, 253, 0.8);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  }

  .anime-bubble-ai.anime-bubble-hover {
    border-color: rgba(252, 211, 77, 0.8);
    box-shadow: 0 8px 20px rgba(251, 146, 60, 0.4);
  }

  /* Power Level Indicator */
  .anime-power-indicator {
    position: absolute;
    top: -10px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(251, 191, 36, 0.8);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #fbbf24;
    text-shadow: 0 0 4px rgba(251, 191, 36, 0.6);
  }

  .anime-power-value {
    font-family: monospace;
  }

  /* Message Content */
  .anime-message-content {
    position: relative;
    line-height: 1.6;
  }

  .anime-message-content strong {
    font-weight: 700;
    text-shadow: 0 0 2px currentColor;
  }

  .anime-message-content em {
    font-style: italic;
  }

  /* Links */
  .anime-link {
    color: #60a5fa;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .anime-link:hover {
    color: #93c5fd;
    text-shadow: 0 0 4px rgba(96, 165, 250, 0.5);
  }

  /* Inline Code */
  .anime-inline-code {
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.9em;
  }

  /* Code Blocks */
  .anime-code-wrapper {
    position: relative;
    margin: 1rem 0;
  }

  .anime-code-block {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    font-family: monospace;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .anime-code-block code {
    color: #e5e5e5;
  }

  /* Copy Button */
  .anime-copy-container {
    position: absolute;
    top: 8px;
    right: 8px;
  }

  .anime-copy-button {
    padding: 6px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #a0a0a0;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .anime-copy-button:hover {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-color: rgba(255, 255, 255, 0.4);
  }

  /* Timestamp */
  .anime-message-timestamp {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* Sparkle Icon */
  .anime-sparkle-icon {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 16px;
    height: 16px;
    opacity: 0.6;
    animation: sparkle-rotate 3s linear infinite;
  }

  /* Energy Lines */
  .anime-energy-line {
    position: absolute;
    height: 2px;
    background: linear-gradient(to right, transparent, currentColor, transparent);
    opacity: 0;
    animation: energy-flow 1s ease-out forwards;
    pointer-events: none;
  }

  .anime-energy-line-1 {
    top: 20%;
    left: -20px;
    right: -20px;
    color: #fbbf24;
    animation-delay: 0s;
  }

  .anime-energy-line-2 {
    top: 50%;
    left: -30px;
    right: -30px;
    color: #60a5fa;
    animation-delay: 0.1s;
  }

  .anime-energy-line-3 {
    top: 80%;
    left: -25px;
    right: -25px;
    color: #a78bfa;
    animation-delay: 0.2s;
  }

  /* Animations */
  @keyframes ki-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.5;
    }
  }

  @keyframes ki-surge {
    0% {
      transform: scale(1) rotate(0deg);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.15) rotate(180deg);
      opacity: 0.6;
    }
    100% {
      transform: scale(1) rotate(360deg);
      opacity: 0.3;
    }
  }

  @keyframes sparkle-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes energy-flow {
    0% {
      opacity: 0;
      transform: scaleX(0);
    }
    50% {
      opacity: 1;
      transform: scaleX(1);
    }
    100% {
      opacity: 0;
      transform: scaleX(1);
    }
  }

  /* Message Animation on Mount */
  .anime-message-animated {
    animation: message-appear 0.4s ease-out;
  }

  @keyframes message-appear {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .anime-message-bubble {
      padding: 0.75rem 1rem;
      max-width: 90%;
    }

    .anime-power-indicator {
      font-size: 11px;
      padding: 1px 6px;
    }

    .anime-code-block {
      font-size: 0.8rem;
      padding: 0.75rem;
    }
  }
`