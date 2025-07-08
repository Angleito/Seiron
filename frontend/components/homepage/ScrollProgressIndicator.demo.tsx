/**
 * ScrollProgressIndicator Demo - Example usage and integration
 * 
 * This demonstrates how to integrate the Dragon Ball power meter scroll progress
 * indicator into your homepage components.
 */

import React from 'react'
import { ScrollProgressIndicator, ScrollProgressIndicatorMobile } from './ScrollProgressIndicator'

// Example: Basic Usage
export const BasicScrollProgressExample = () => {
  return (
    <div className="min-h-screen">
      {/* Your homepage content */}
      <section id="hero" className="h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <h1 className="text-4xl text-white pt-20">Hero Section</h1>
      </section>
      
      <section id="features" className="h-screen bg-gradient-to-b from-gray-800 to-gray-700">
        <h2 className="text-3xl text-white pt-20">Features Section</h2>
      </section>
      
      <section id="capabilities" className="h-screen bg-gradient-to-b from-gray-700 to-gray-600">
        <h2 className="text-3xl text-white pt-20">Capabilities Section</h2>
      </section>
      
      <section id="cta" className="h-screen bg-gradient-to-b from-gray-600 to-gray-900">
        <h2 className="text-3xl text-white pt-20">Call to Action</h2>
      </section>

      {/* Desktop Progress Indicator */}
      <ScrollProgressIndicator />
      
      {/* Mobile Progress Indicator */}
      <ScrollProgressIndicatorMobile />
    </div>
  )
}

// Example: Custom Sections Configuration
export const CustomSectionsExample = () => {
  const customSections = [
    {
      id: 'intro',
      name: 'Earthling',
      powerLevel: 500,
      color: 'text-gray-400',
      aura: 'bg-gray-400/20',
      icon: () => <span>🌍</span>,
      description: 'Starting your journey'
    },
    {
      id: 'skills',
      name: 'Fighter',
      powerLevel: 15000,
      color: 'text-blue-400',
      aura: 'bg-blue-400/30',
      icon: () => <span>👊</span>,
      description: 'Building strength'
    },
    {
      id: 'portfolio',
      name: 'Super Saiyan',
      powerLevel: 80000,
      color: 'text-yellow-400',
      aura: 'bg-yellow-400/40',
      icon: () => <span>⚡</span>,
      description: 'Showcasing power'
    },
    {
      id: 'contact',
      name: 'God Mode',
      powerLevel: 200000,
      color: 'text-purple-400',
      aura: 'bg-purple-400/50',
      icon: () => <span>🔥</span>,
      description: 'Maximum potential'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Your custom sections */}
      <section id="intro" className="h-screen">Intro</section>
      <section id="skills" className="h-screen">Skills</section>
      <section id="portfolio" className="h-screen">Portfolio</section>
      <section id="contact" className="h-screen">Contact</section>

      <ScrollProgressIndicator
        sections={customSections}
        position="left"
        size="lg"
        showLabels={true}
        enableParticles={true}
      />
    </div>
  )
}

// Example: Performance Optimized Configuration
export const PerformanceOptimizedExample = () => {
  return (
    <div className="min-h-screen">
      {/* Content sections */}
      <section id="hero" className="h-screen">Hero</section>
      <section id="features" className="h-screen">Features</section>
      <section id="capabilities" className="h-screen">Capabilities</section>
      <section id="cta" className="h-screen">CTA</section>

      {/* Minimal performance impact */}
      <ScrollProgressIndicator
        size="sm"
        showLabels={false}
        enableParticles={false}
        className="opacity-80"
      />
      
      <ScrollProgressIndicatorMobile
        enableParticles={false}
        showLabels={true}
      />
    </div>
  )
}

export default BasicScrollProgressExample