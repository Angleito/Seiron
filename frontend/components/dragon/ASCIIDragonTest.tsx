// Quick test to demonstrate ASCIIDragon usage
import React from 'react'
import ASCIIDragon from './ASCIIDragon'

export const ASCIIDragonTest = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      <h2>ASCII Dragon Test</h2>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <ASCIIDragon pose="coiled" size="sm" />
        <ASCIIDragon pose="flying" size="sm" />
        <ASCIIDragon pose="attacking" size="sm" />
        <ASCIIDragon pose="sleeping" size="sm" />
      </div>
      
      <div>
        <ASCIIDragon 
          pose="coiled" 
          size="lg" 
          enableTypewriter={true}
          enableBreathing={true}
          enableFloating={true}
        />
      </div>
    </div>
  )
}