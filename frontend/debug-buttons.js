// Simple Button Debug Script
// Copy and paste this into browser console on HomePage

console.log('🔍 Starting button debug...')

// Find buttons
const buttons = document.querySelectorAll('button')
console.log('🔍 Found buttons:', buttons.length)

// Test each button
buttons.forEach((btn, index) => {
  const text = btn.textContent?.trim() || 'No text'
  console.log(`🔍 Button ${index}: "${text}"`)
  
  if (text.includes('SUMMON')) {
    console.log('🔍 Found SUMMON button:', btn)
    console.log('🔍 SUMMON button classes:', btn.className)
    console.log('🔍 SUMMON button disabled:', btn.disabled)
    
    // Test click
    console.log('🔍 Testing SUMMON button click...')
    btn.click()
    console.log('🔍 SUMMON button click completed')
  }
})

// Listen for all clicks
document.addEventListener('click', (e) => {
  console.log('🔍 Click detected on:', e.target)
  if (e.target.closest('button')) {
    console.log('🔍 Button click detected!')
    console.log('🔍 Button element:', e.target.closest('button'))
    console.log('🔍 Button text:', e.target.closest('button').textContent)
  }
})

console.log('🔍 Button debug setup complete!')
console.log('🔍 Now try clicking the SUMMON button manually...')