console.log('🟢 MINIMAL TEST: Script loading...')

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('❌ Root element not found')
  } else {
    console.log('✅ Root element found')
    rootElement.innerHTML = `
      <div style="
        padding: 2rem; 
        color: white; 
        background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
        min-height: 100vh;
        font-family: Arial, sans-serif;
      ">
        <h1>🐉 Minimal Test Mode</h1>
        <p>Basic JavaScript is working!</p>
        <p>Next step: Test React imports...</p>
      </div>
    `
    console.log('✅ Basic content rendered')
  }
} catch (error) {
  console.error('❌ Error in minimal test:', error)
}