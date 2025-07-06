'use client'

import { AnimeMessageBubble } from '../AnimeMessageBubble'

const exampleMessages = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Show me how to create a **React component** with TypeScript!',
    timestamp: new Date(Date.now() - 5000),
    powerLevel: 3000
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: `I'll help you create a React component with TypeScript! Here's a complete example:

\`\`\`typescript
import React, { useState } from 'react'

interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </button>
  )
}
\`\`\`

Key features:
- **TypeScript interface** for type safety
- **Default props** using ES6 syntax
- *useState* hook for local state
- Semantic HTML with proper attributes`,
    timestamp: new Date(Date.now() - 3000),
    powerLevel: 9500,
    emotion: 'excited' as const
  },
  {
    id: '3',
    role: 'user' as const,
    content: 'That looks great! Can you explain the interface?',
    timestamp: new Date(Date.now() - 2000),
    powerLevel: 3500
  },
  {
    id: '4',
    role: 'assistant' as const,
    content: `Absolutely! The **ButtonProps** interface defines the component's contract:

\`\`\`typescript
interface ButtonProps {
  label: string          // Required: Button text
  onClick?: () => void   // Optional: Click handler
  variant?: 'primary'    // Optional: Style variant
  disabled?: boolean     // Optional: Disabled state
}
\`\`\`

The \`?\` makes properties optional, providing flexibility while maintaining type safety. This is one of TypeScript's most *powerful* features!

Check out the [TypeScript Handbook](https://www.typescriptlang.org/docs/) for more details.`,
    timestamp: new Date(),
    powerLevel: 8000,
    emotion: 'neutral' as const
  }
]

export function AnimeMessageBubbleExample() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Anime Message Bubble Example
        </h1>
        
        <div className="space-y-4">
          {exampleMessages.map((message) => (
            <AnimeMessageBubble
              key={message.id}
              message={message}
              showTimestamp={true}
              showPowerLevel={true}
              enableAnimations={true}
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Features</h2>
          <ul className="space-y-2 text-gray-300">
            <li>• Different styles for user vs AI messages</li>
            <li>• Anime-inspired gradients and Ki/energy aura effects</li>
            <li>• Power level indicators with dynamic values</li>
            <li>• Markdown support with bold, italic, and links</li>
            <li>• Code blocks with syntax highlighting theme</li>
            <li>• Copy button for code blocks</li>
            <li>• Timestamp display</li>
            <li>• Hover animations with energy lines</li>
            <li>• Emotion-based styling (neutral, excited, serious, powerful)</li>
            <li>• Responsive design for mobile</li>
          </ul>
        </div>
      </div>
    </div>
  )
}