import React from 'react'
import './LightningEffect.css'

const StormLightningEffect: React.FC = () => {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }}>
      <div className="bg"></div>
      <div className="rain"></div>
      <div className="lightning flashit">
        <div className="bolt-3"></div>
        <div className="bolt-4"></div>
        <div className="bolt-5"></div>
        <div className="bolt-6"></div>
        <div className="bolt-7"></div>
        <div className="bolt-8"></div>
        <div className="bolt-9"></div>
        <div className="bolt-10"></div>
        <div className="bolt-11"></div>
        <div className="bolt-12"></div>
        <div className="bolt-13"></div>
        <div className="bolt-14"></div>
      </div>
    </div>
  )
}

export default StormLightningEffect