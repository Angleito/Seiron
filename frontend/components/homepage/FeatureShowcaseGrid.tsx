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
  detailedFeatures?: string[]
  cta: string
  demoAvailable?: boolean
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
      'Sub-second finality',
      'Parallel execution',
      'MEV protection',
      'Gas optimization'
    ],
    detailedFeatures: [
      'Twin-turbo consensus mechanism',
      'Optimistic parallelization engine',
      'Smart contract pre-compilation',
      'Built-in front-running protection'
    ],
    demoAvailable: true,
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
      'Real-time analysis',
      'AI rebalancing',
      'Risk assessment',
      'Profit optimization'
    ],
    detailedFeatures: [
      'Machine learning position sizing',
      'Sentiment analysis integration',
      'Dynamic risk management',
      'Cross-chain portfolio tracking'
    ],
    demoAvailable: true,
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
      'Automated execution',
      'Liquidity optimization',
      'Compound interest'
    ],
    detailedFeatures: [
      'Multi-protocol yield aggregation',
      'Impermanent loss protection',
      'Auto-compounding strategies',
      'Flash loan arbitrage'
    ],
    demoAvailable: true,
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
    subtitle: 'Power Level Rankings',
    description: 'Climb the leaderboards and unlock exclusive rewards. Prove your trading prowess and earn legendary status among DeFi warriors.',
    icon: Trophy,
    powerLevel: 50000,
    tier: 'Legendary Saiyan',
    benefits: [
      'Competitive leaderboards',
      'Achievement unlocks',
      'Exclusive rewards',
      'Community recognition'
    ],
    detailedFeatures: [
      'Global performance tracking',
      'Skill-based matchmaking',
      'Seasonal tournaments',
      'Elite tier exclusive features'
    ],
    demoAvailable: false,
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
    if (level >= 1000) {
      const kValue = level / 1000
      return kValue % 1 === 0 ? `${kValue}.0K` : `${kValue.toFixed(1)}K`
    }
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
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
      role="article"
      tabIndex={0}
      aria-label={`${feature.title}: ${feature.subtitle}`}
      aria-describedby={`feature-${feature.id}-description`}
      variants={animated ? cardVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated && isInView ? "visible" : undefined}
      transition={animated ? cardTransition : undefined}
      whileHover={animated ? { scale: 1.02, y: -8 } : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 2000)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsExpanded(!isExpanded)
        }
      }}
      className={cn(
        "relative group p-4 sm:p-6 rounded-xl border-2 border-slate-700/50",
        "bg-gradient-to-br from-slate-900/80 to-slate-800/80",
        "backdrop-blur-sm transition-all duration-300",
        "storm-hover-glow cursor-pointer",
        "touch-manipulation select-none",
        "min-h-[320px] sm:min-h-[380px]",
        "focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900",
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

      {/* Icon with Enhanced Animation */}
      <motion.div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-lg mb-4",
          "bg-gradient-to-br from-slate-800 to-slate-900",
          "relative overflow-hidden",
          feature.color.accent
        )}
        animate={{
          rotate: isHovered ? [0, 8, -8, 0] : 0,
          scale: isHovered ? 1.15 : 1,
          boxShadow: isHovered 
            ? `0 0 20px ${feature.color.glow.replace('bg-', '').replace('/20', '')}40` 
            : "0 0 0px transparent"
        }}
        transition={{ 
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        {/* Icon Glow Background */}
        {isHovered && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-lg",
              feature.color.glow
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        <motion.div
          animate={{
            rotate: isHovered ? 360 : 0
          }}
          transition={{
            duration: isHovered ? 2 : 0,
            ease: "linear",
            repeat: isHovered ? Infinity : 0
          }}
        >
          <IconComponent className={cn("w-6 h-6 relative z-10", feature.color.primary)} />
        </motion.div>
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

        <p 
          id={`feature-${feature.id}-description`}
          className="text-gray-300 text-sm leading-relaxed"
        >
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

        {/* Progressive Disclosure */}
        {feature.detailedFeatures && !isExpanded && (
          <motion.button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-gray-400 hover:text-gray-300 mt-2 flex items-center space-x-1"
            whileHover={{ scale: 1.02 }}
          >
            <span>Show advanced features</span>
            <ArrowRight className="w-3 h-3" />
          </motion.button>
        )}

        {/* Detailed Features */}
        {isExpanded && feature.detailedFeatures && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2"
          >
            <div className="border-t border-gray-600 pt-3">
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Advanced Features:</h4>
              <ul className="space-y-1">
                {feature.detailedFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center space-x-2 text-xs text-gray-400">
                    <Target className="w-2 h-2 text-blue-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-gray-400 hover:text-gray-300 flex items-center space-x-1"
            >
              <span>Show less</span>
            </button>
          </motion.div>
        )}

        {/* Demo Button */}
        {feature.demoAvailable && (
          <motion.button
            onClick={() => setShowDemo(true)}
            className={cn(
              "w-full mt-3 px-3 py-2 rounded-lg font-medium text-xs",
              "bg-gradient-to-r from-slate-700 to-slate-800",
              "border border-gray-600 hover:border-gray-500",
              "text-gray-300 hover:text-white",
              "transition-all duration-300"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Try Interactive Demo
          </motion.button>
        )}

        {/* CTA Button */}
        <motion.button
          aria-label={`${feature.cta} for ${feature.title}`}
          className={cn(
            "w-full mt-4 px-4 py-3 rounded-lg font-semibold text-sm",
            "bg-gradient-to-r from-slate-800 to-slate-900",
            "border-2 transition-all duration-300",
            "flex items-center justify-center space-x-2 group/btn",
            "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
            feature.color.accent,
            feature.color.primary
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{feature.cta}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
        </motion.button>
      </div>

      {/* Power-up Effect */}
      {isHovered && showPowerLevels && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Energy Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className={cn("absolute w-1 h-1 rounded-full", feature.color.primary.replace('text-', 'bg-'))}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-10, -40, -10],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                rotate: [0, 360, 720]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          ))}
          
          {/* Power Aura Ring */}
          <motion.div
            className={cn(
              "absolute inset-2 rounded-xl border-2 opacity-30",
              feature.color.accent
            )}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
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
      aria-labelledby="feature-showcase-title"
      role="region"
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
        
        <h2 
          id="feature-showcase-title"
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4"
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
            Power Up
          </span>{' '}
          <span className="block sm:inline">Your DeFi Arsenal</span>
        </h2>
        
        <p className="text-gray-300 text-base sm:text-lg max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
          Master the ultimate DeFi techniques and unlock legendary status in the Sei ecosystem. 
          Each feature grants unique abilities to dominate the battlefield.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-4 sm:px-0">
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
          <div className="inline-flex items-center space-x-2 sm:space-x-4 px-4 sm:px-6 py-3 rounded-full bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-yellow-400/30">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">
              Total Power Available: 99.0K+
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