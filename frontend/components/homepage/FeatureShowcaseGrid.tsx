'use client'

import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { 
  Network, 
  Wallet, 
  TrendingUp, 
  Shield, 
  Zap, 
  Star, 
  Target,
  Trophy,
  ArrowRight,
  Activity,
  BarChart3,
  Coins
} from 'lucide-react'
import { cn } from '@lib/utils'

interface FeatureCard {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  powerLevel: number
  tier: string
  benefits: string[]
  cta: string
  color: {
    primary: string
    secondary: string
    accent: string
    glow: string
  }
}

interface FeatureShowcaseGridProps {
  className?: string
  animated?: boolean
  showPowerLevels?: boolean
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'battlefield',
    title: 'Master the Sei Battlefield',
    subtitle: 'Lightning-Fast Network Domination',
    description: 'Experience the ultimate speed advantage with Sei\'s parallel execution. Trade at light speed while your opponents are still loading.',
    icon: Network,
    powerLevel: 9000,
    tier: 'Elite Warrior',
    benefits: [
      'Sub-second transaction finality',
      'Parallel execution advantage',
      'MEV protection shield',
      'Gas optimization mastery'
    ],
    cta: 'Enter the Battlefield',
    color: {
      primary: 'text-blue-400',
      secondary: 'text-blue-300',
      accent: 'border-blue-400',
      glow: 'bg-blue-400/20'
    }
  },
  {
    id: 'saiyan-potential',
    title: 'Unlock Your Saiyan Potential',
    subtitle: 'Portfolio Power Beyond Limits',
    description: 'Transform your portfolio management with AI-powered insights. Track, analyze, and optimize your positions like a true Saiyan warrior.',
    icon: Wallet,
    powerLevel: 15000,
    tier: 'Super Saiyan',
    benefits: [
      'Real-time portfolio analysis',
      'AI-powered rebalancing',
      'Risk assessment radar',
      'Profit optimization engine'
    ],
    cta: 'Unlock Power',
    color: {
      primary: 'text-yellow-400',
      secondary: 'text-yellow-300',
      accent: 'border-yellow-400',
      glow: 'bg-yellow-400/20'
    }
  },
  {
    id: 'fusion-techniques',
    title: 'Energy Fusion Techniques',
    subtitle: 'Advanced DeFi Strategies',
    description: 'Master advanced yield strategies and liquidity techniques. Combine protocols like fusion techniques to maximize your earning potential.',
    icon: TrendingUp,
    powerLevel: 25000,
    tier: 'Fusion Master',
    benefits: [
      'Cross-protocol yield farming',
      'Automated strategy execution',
      'Liquidity pool optimization',
      'Compound interest mastery'
    ],
    cta: 'Learn Fusion',
    color: {
      primary: 'text-green-400',
      secondary: 'text-green-300',
      accent: 'border-green-400',
      glow: 'bg-green-400/20'
    }
  },
  {
    id: 'power-rankings',
    title: 'Power Level Rankings',
    subtitle: 'Ascend the Warrior Hierarchy',
    description: 'Climb the leaderboards and unlock exclusive rewards. Prove your trading prowess and earn legendary status among DeFi warriors.',
    icon: Trophy,
    powerLevel: 50000,
    tier: 'Legendary Saiyan',
    benefits: [
      'Competitive leaderboards',
      'Achievement unlocks',
      'Exclusive tier rewards',
      'Community recognition'
    ],
    cta: 'Check Rankings',
    color: {
      primary: 'text-purple-400',
      secondary: 'text-purple-300',
      accent: 'border-purple-400',
      glow: 'bg-purple-400/20'
    }
  }
]

const PowerLevelIndicator: React.FC<{ powerLevel: number; tier: string; color: FeatureCard['color'] }> = ({ 
  powerLevel, 
  tier, 
  color 
}) => {
  const formatPowerLevel = (level: number) => {
    if (level >= 1000) return `${(level / 1000).toFixed(1)}K`
    return level.toString()
  }

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <Activity className={cn("w-4 h-4", color.primary)} />
        <span className={cn("text-xs font-medium", color.secondary)}>
          {tier}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <Zap className={cn("w-3 h-3", color.primary)} />
        <span className={cn("text-sm font-bold", color.primary)}>
          {formatPowerLevel(powerLevel)}
        </span>
      </div>
    </div>
  )
}

const FeatureCardComponent: React.FC<{ 
  feature: FeatureCard; 
  index: number; 
  showPowerLevels: boolean;
  animated: boolean;
}> = ({ feature, index, showPowerLevels, animated }) => {
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  
  const IconComponent = feature.icon

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 60,
      scale: 0.9,
      rotate: -5
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      rotate: 0
    }
  }

  const cardTransition = {
    duration: 0.6,
    delay: index * 0.2,
    ease: [0.25, 0.46, 0.45, 0.94] as const
  }

  const hoverTransition = {
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94] as const
  }

  return (
    <motion.div
      ref={ref}
      variants={animated ? cardVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated && isInView ? "visible" : undefined}
      transition={animated ? cardTransition : undefined}
      whileHover={animated ? { scale: 1.02, y: -8 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative group p-6 rounded-xl border-2 border-slate-700/50",
        "bg-gradient-to-br from-slate-900/80 to-slate-800/80",
        "backdrop-blur-sm transition-all duration-300",
        "storm-hover-glow cursor-pointer",
        feature.color.accent,
        isHovered && feature.color.glow
      )}
    >
      {/* Aura Effect */}
      {showPowerLevels && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-30",
            feature.color.glow
          )}
          animate={{
            scale: [1, 1.05, 1],
            opacity: isHovered ? [0.1, 0.3, 0.1] : 0
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Power Level Indicator */}
      {showPowerLevels && (
        <PowerLevelIndicator 
          powerLevel={feature.powerLevel}
          tier={feature.tier}
          color={feature.color}
        />
      )}

      {/* Icon with Animation */}
      <motion.div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg mb-4",
          "bg-gradient-to-br from-slate-800 to-slate-900",
          feature.color.accent
        )}
        animate={{
          rotate: isHovered ? [0, 5, -5, 0] : 0,
          scale: isHovered ? 1.1 : 1
        }}
        transition={{ duration: 0.5 }}
      >
        <IconComponent className={cn("w-6 h-6", feature.color.primary)} />
      </motion.div>

      {/* Content */}
      <div className="space-y-3">
        <div>
          <h3 className={cn("font-bold text-lg mb-1", feature.color.primary)}>
            {feature.title}
          </h3>
          <p className={cn("text-sm font-medium", feature.color.secondary)}>
            {feature.subtitle}
          </p>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed">
          {feature.description}
        </p>

        {/* Benefits List */}
        <ul className="space-y-2">
          {feature.benefits.map((benefit, benefitIndex) => (
            <motion.li
              key={benefitIndex}
              className="flex items-center space-x-2 text-xs text-gray-400"
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ 
                delay: index * 0.2 + benefitIndex * 0.1,
                duration: 0.3 
              }}
            >
              <Star className={cn("w-3 h-3", feature.color.primary)} />
              <span>{benefit}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.button
          className={cn(
            "w-full mt-4 px-4 py-3 rounded-lg font-semibold text-sm",
            "bg-gradient-to-r from-slate-800 to-slate-900",
            "border-2 transition-all duration-300",
            "flex items-center justify-center space-x-2 group/btn",
            feature.color.accent,
            feature.color.primary
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{feature.cta}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
        </motion.button>
      </div>

      {/* Power-up Effect */}
      {isHovered && showPowerLevels && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className={cn("absolute w-1 h-1 rounded-full", feature.color.primary.replace('text-', 'bg-'))}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-10, -30, -10],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export const FeatureShowcaseGrid: React.FC<FeatureShowcaseGridProps> = ({
  className = '',
  animated = true,
  showPowerLevels = true
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  return (
    <motion.section
      ref={ref}
      variants={animated ? containerVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated && isInView ? "visible" : undefined}
      className={cn(
        "relative py-16 px-4 sm:px-6 lg:px-8",
        "storm-layer-background",
        className
      )}
    >
      {/* Section Header */}
      <motion.div
        className="text-center mb-12"
        initial={animated ? { opacity: 0, y: -20 } : undefined}
        animate={animated && isInView ? { opacity: 1, y: 0 } : undefined}
        transition={animated ? { duration: 0.6, delay: 0.2 } : undefined}
      >
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Shield className="w-6 h-6 text-yellow-400" />
          <span className="text-yellow-400/90 font-semibold tracking-wide text-sm">
            SEIRON CAPABILITIES
          </span>
          <Shield className="w-6 h-6 text-yellow-400" />
        </div>
        
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
            Power Up
          </span>{' '}
          Your DeFi Arsenal
        </h2>
        
        <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
          Master the ultimate DeFi techniques and unlock legendary status in the Sei ecosystem. 
          Each feature grants unique abilities to dominate the battlefield.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 lg:gap-8 max-w-7xl mx-auto">
        {FEATURE_CARDS.map((feature, index) => (
          <FeatureCardComponent
            key={feature.id}
            feature={feature}
            index={index}
            showPowerLevels={showPowerLevels}
            animated={animated}
          />
        ))}
      </div>

      {/* Power Level Summary */}
      {showPowerLevels && (
        <motion.div
          className="mt-12 text-center"
          initial={animated ? { opacity: 0, y: 20 } : undefined}
          animate={animated && isInView ? { opacity: 1, y: 0 } : undefined}
          transition={animated ? { duration: 0.6, delay: 1 } : undefined}
        >
          <div className="inline-flex items-center space-x-4 px-6 py-3 rounded-full bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-yellow-400/30">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">
              Total Power Available: 99K+
            </span>
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
        </motion.div>
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Storm Clouds */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl storm-cloud-swirling" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl storm-cloud" />
        
        {/* Fog Particles */}
        <div className="absolute top-1/2 left-0 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl storm-fog" />
        <div className="absolute top-1/4 right-0 w-28 h-28 bg-gray-500/5 rounded-full blur-2xl storm-fog-particles" />
      </div>
    </motion.section>
  )
}

export default FeatureShowcaseGrid