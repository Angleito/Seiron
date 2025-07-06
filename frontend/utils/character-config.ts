export interface CharacterConfig {
  name: string
  image: string
  position: 'left' | 'right'
  powerLevel?: number
  title?: string
}

export const characterConfig: Record<'user' | 'assistant', CharacterConfig> = {
  user: {
    name: 'Warrior',
    image: '/images/warrior-avatar.svg', // Default avatar, can be customized
    position: 'right',
    powerLevel: 5000,
    title: 'Earth Defender'
  },
  assistant: {
    name: 'Seiron',
    image: '/seiron.png', // Existing dragon mascot image
    position: 'left',
    powerLevel: 9000,
    title: 'Eternal Dragon of Finance'
  }
}

// Alternative character names for variety
export const alternativeNames = {
  user: ['Fighter', 'Challenger', 'Hero', 'Saiyan Warrior'],
  assistant: ['Dragon Sage', 'Eternal Dragon', 'Master Seiron', 'Financial Oracle']
}

// Get a random alternative name
export function getAlternativeName(role: 'user' | 'assistant'): string {
  const names = alternativeNames[role]
  return names[Math.floor(Math.random() * names.length)] || characterConfig[role].name
}

// Dragon Ball style power level display
export function formatPowerLevel(level: number): string {
  if (level >= 9000) {
    return `${level.toLocaleString()} 🔥`
  }
  return level.toLocaleString()
}