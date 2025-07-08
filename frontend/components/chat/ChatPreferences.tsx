'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Save, X, Brain, MessageSquare, Shield, Clock } from 'lucide-react'
import { cn } from '@lib/utils'
import { Button } from '@components/ui/forms/Button'
import { Card } from '@components/ui/display/Card'
import { useAIMemory } from '@hooks/chat/useAIMemory'
import { logger } from '@lib/logger'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'

export interface ChatPreferencesData {
  // Response style
  responseStyle: 'concise' | 'detailed' | 'educational'
  includeReasoning: boolean
  showConfidence: boolean
  
  // Risk and behavior
  riskTolerance: 'conservative' | 'balanced' | 'aggressive'
  creativityLevel: number // 0-1
  
  // Memory settings
  enableMemory: boolean
  memoryRetention: 'session' | 'persistent' | 'custom'
  memoryDuration?: number // days for custom retention
  autoLearn: boolean
  
  // Interaction preferences
  preferredLanguage: string
  technicalLevel: 'beginner' | 'intermediate' | 'expert'
  enableCodeExecution: boolean
  enableWebSearch: boolean
}

interface ChatPreferencesProps {
  userId: string
  sessionId?: string
  initialPreferences?: Partial<ChatPreferencesData>
  onSave?: (preferences: ChatPreferencesData) => void
  onClose?: () => void
  className?: string
}

const defaultPreferences: ChatPreferencesData = {
  responseStyle: 'detailed',
  includeReasoning: false,
  showConfidence: false,
  riskTolerance: 'balanced',
  creativityLevel: 0.5,
  enableMemory: true,
  memoryRetention: 'persistent',
  autoLearn: true,
  preferredLanguage: 'en',
  technicalLevel: 'intermediate',
  enableCodeExecution: false,
  enableWebSearch: true
}

export const ChatPreferences = React.memo(function ChatPreferences({
  userId,
  sessionId,
  initialPreferences = {},
  onSave,
  onClose,
  className
}: ChatPreferencesProps) {
  const [preferences, setPreferences] = useState<ChatPreferencesData>({
    ...defaultPreferences,
    ...initialPreferences
  })
  const [isSaving, setIsSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'response' | 'behavior' | 'memory' | 'interaction'>('response')

  const { saveMemory, updateMemory, getMemory } = useAIMemory({
    userId,
    sessionId,
    autoSync: true
  })

  // Update individual preference
  const updatePreference = useCallback(<K extends keyof ChatPreferencesData>(
    key: K,
    value: ChatPreferencesData[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }, [])

  // Save preferences to memory
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    
    try {
      // Save to AI memory
      const memoryKey = 'chat_preferences'
      const existingMemory = getMemory(memoryKey)
      
      const saveResult = await (
        O.isSome(existingMemory)
          ? updateMemory(memoryKey, { value: preferences, confidence: 1.0 })
          : saveMemory(memoryKey, preferences, 'preference', 1.0)
      )

      if (E.isRight(saveResult)) {
        logger.info('Preferences saved successfully')
        onSave?.(preferences)
      } else {
        logger.error('Failed to save preferences:', saveResult.left)
      }
    } catch (error) {
      logger.error('Error saving preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }, [preferences, saveMemory, updateMemory, getMemory, onSave])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'w-full max-w-2xl mx-auto p-4',
        'bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800',
        'rounded-xl shadow-xl border-2 border-orange-300 dark:border-orange-600',
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Chat Preferences
          </h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-orange-200 dark:hover:bg-orange-800"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {(['response', 'behavior', 'memory', 'interaction'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              'flex-1 px-4 py-2 rounded-md font-medium capitalize transition-colors',
              activeSection === section
                ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Response Style Section */}
      <AnimatePresence mode="wait">
        {activeSection === 'response' && (
          <motion.div
            key="response"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Response Style</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Configure how the AI responds to your messages
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Response Format
                  </label>
                  <div className="space-y-2">
                    {(['concise', 'detailed', 'educational'] as const).map((style) => (
                      <label
                        key={style}
                        className={cn(
                          'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                          preferences.responseStyle === style
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="responseStyle"
                          value={style}
                          checked={preferences.responseStyle === style}
                          onChange={(e) => updatePreference('responseStyle', e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium capitalize">{style}</div>
                          <div className="text-sm text-gray-500">
                            {style === 'concise' && 'Brief and to the point responses'}
                            {style === 'detailed' && 'Comprehensive explanations with examples'}
                            {style === 'educational' && 'Teaching-focused with step-by-step guidance'}
                          </div>
                        </div>
                        {preferences.responseStyle === style && (
                          <div className="ml-2 w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.includeReasoning}
                      onChange={(e) => updatePreference('includeReasoning', e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <Brain className="h-4 w-4" />
                    <span>Show AI Reasoning Process</span>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.showConfidence}
                      onChange={(e) => updatePreference('showConfidence', e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <Shield className="h-4 w-4" />
                    <span>Display Confidence Levels</span>
                  </label>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Behavior Section */}
        {activeSection === 'behavior' && (
          <motion.div
            key="behavior"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">AI Behavior Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Fine-tune how the AI approaches problems and generates responses
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Risk Tolerance
                  </label>
                  <div className="space-y-2">
                    {(['conservative', 'balanced', 'aggressive'] as const).map((risk) => (
                      <label
                        key={risk}
                        className={cn(
                          'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                          preferences.riskTolerance === risk
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="riskTolerance"
                          value={risk}
                          checked={preferences.riskTolerance === risk}
                          onChange={(e) => updatePreference('riskTolerance', e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium capitalize">{risk}</div>
                          <div className="text-sm text-gray-500">
                            {risk === 'conservative' && 'Prioritize safety and proven solutions'}
                            {risk === 'balanced' && 'Mix of safety and innovation'}
                            {risk === 'aggressive' && 'Explore cutting-edge solutions'}
                          </div>
                        </div>
                        {preferences.riskTolerance === risk && (
                          <div className="ml-2 w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex justify-between">
                    <span>Creativity Level</span>
                    <span className="text-orange-600">{Math.round(preferences.creativityLevel * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={preferences.creativityLevel * 100}
                    onChange={(e) => updatePreference('creativityLevel', parseInt(e.target.value) / 100)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Predictable</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Memory Section */}
        {activeSection === 'memory' && (
          <motion.div
            key="memory"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Memory Settings</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Control how the AI remembers and learns from conversations
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.enableMemory}
                      onChange={(e) => updatePreference('enableMemory', e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <span>Enable AI Memory</span>
                  </label>
                </div>

                {preferences.enableMemory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Memory Retention
                      </label>
                      <div className="space-y-2">
                        {(['session', 'persistent', 'custom'] as const).map((retention) => (
                          <label
                            key={retention}
                            className={cn(
                              'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                              preferences.memoryRetention === retention
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                            )}
                          >
                            <input
                              type="radio"
                              name="memoryRetention"
                              value={retention}
                              checked={preferences.memoryRetention === retention}
                              onChange={(e) => updatePreference('memoryRetention', e.target.value as any)}
                              className="sr-only"
                            />
                            <div className="flex-1">
                              <div className="font-medium capitalize">{retention}</div>
                              <div className="text-sm text-gray-500">
                                {retention === 'session' && 'Forget after conversation ends'}
                                {retention === 'persistent' && 'Remember across all conversations'}
                                {retention === 'custom' && 'Set specific retention period'}
                              </div>
                            </div>
                            {preferences.memoryRetention === retention && (
                              <div className="ml-2 w-2 h-2 bg-orange-500 rounded-full" />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    {preferences.memoryRetention === 'custom' && (
                      <div className="pl-6 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          Retention Period (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={preferences.memoryDuration || 30}
                          onChange={(e) => updatePreference('memoryDuration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.autoLearn}
                          onChange={(e) => updatePreference('autoLearn', e.target.checked)}
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span>Auto-learn from conversations</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Interaction Section */}
        {activeSection === 'interaction' && (
          <motion.div
            key="interaction"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Interaction Preferences</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Customize how you interact with the AI
              </p>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Technical Level
                  </label>
                  <div className="space-y-2">
                    {(['beginner', 'intermediate', 'expert'] as const).map((level) => (
                      <label
                        key={level}
                        className={cn(
                          'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                          preferences.technicalLevel === level
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="technicalLevel"
                          value={level}
                          checked={preferences.technicalLevel === level}
                          onChange={(e) => updatePreference('technicalLevel', e.target.value as any)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="font-medium capitalize">{level}</div>
                          <div className="text-sm text-gray-500">
                            {level === 'beginner' && 'Simple explanations, avoid jargon'}
                            {level === 'intermediate' && 'Balance between simplicity and detail'}
                            {level === 'expert' && 'Technical details and advanced concepts'}
                          </div>
                        </div>
                        {preferences.technicalLevel === level && (
                          <div className="ml-2 w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.enableCodeExecution}
                        onChange={(e) => updatePreference('enableCodeExecution', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span>Enable Code Execution</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.enableWebSearch}
                        onChange={(e) => updatePreference('enableWebSearch', e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span>Enable Web Search</span>
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-3 mt-6">
        {onClose && (
          <Button
            variant="secondary"
            onClick={onClose}
            className="border-orange-300 hover:bg-orange-100 dark:border-orange-600 dark:hover:bg-orange-900/20"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
})