'use client'

import React from 'react'

// Temporarily commented out due to DragonModelManager build errors
/*
import React, { useState, useEffect } from 'react'
// import { ModelPreloader, DEFAULT_MODELS } from '../dragon/DragonModelManager'
import { 
  exportModelManifest, 
  getModelManifest, 
  getModelPreloadStats,
  loadModelProgressively 
} from '../../utils/modelManifestExporter'

export const ModelPreloaderTest: React.FC = () => {
  // ... component implementation
}
*/

export const ModelPreloaderTest: React.FC = () => {
  return (
    <div className="p-4 bg-red-100 border border-red-300 rounded">
      <h2 className="text-lg font-bold text-red-800 mb-2">ModelPreloaderTest</h2>
      <p className="text-red-700">
        This component is temporarily disabled due to build errors.
      </p>
    </div>
  )
}