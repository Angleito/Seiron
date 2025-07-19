console.log('🟡 REACT TEST: Starting React import test...')

async function testReactImports() {
  try {
    console.log('📦 Importing React...')
    const React = await import('react')
    console.log('✅ React import successful')
    
    console.log('📦 Importing ReactDOM...')
    const ReactDOM = await import('react-dom/client')
    console.log('✅ ReactDOM import successful')
    
    console.log('🏗️ Creating React root...')
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Root element not found')
    }
    
    const root = ReactDOM.default.createRoot(rootElement)
    console.log('✅ React root created')
    
    console.log('🎨 Rendering React component...')
    root.render(React.default.createElement('div', {
      style: {
        padding: '2rem',
        color: 'white',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }
    }, [
      React.default.createElement('h1', { key: 'title' }, '🐉 React Test Mode'),
      React.default.createElement('p', { key: 'msg1' }, 'React is working!'),
      React.default.createElement('p', { key: 'msg2' }, 'Next step: Test Router imports...')
    ]))
    
    console.log('✅ React component rendered successfully')
    
  } catch (error) {
    console.error('❌ React test error:', error)
    
    // Fallback rendering
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          padding: 2rem; 
          color: white; 
          background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
          min-height: 100vh;
          font-family: Arial, sans-serif;
        ">
          <h1>❌ React Test Failed</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <pre style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 4px; overflow-x: auto;">
            ${error instanceof Error ? error.stack : JSON.stringify(error)}
          </pre>
        </div>
      `
    }
  }
}

// Start the test
testReactImports()