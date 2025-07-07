// Manual Button Test Script
// Copy and paste this into the browser console when on the HomePage
// This will help diagnose button click issues

console.log('🔍 Starting manual button test...')

// Test 1: Check if buttons exist
const summonButton = document.querySelector('button:has(span:contains("SUMMON"))')
const aboutButton = document.querySelector('button:has(span:contains("ABOUT"))')

// Alternative selector if the above doesn't work
const allButtons = document.querySelectorAll('button')
console.log('🔍 Total buttons found:', allButtons.length)

allButtons.forEach((button, index) => {
  console.log(`🔍 Button ${index}:`, button.textContent.trim())
})

// Find buttons by text content
const summonBtn = Array.from(allButtons).find(btn => btn.textContent.includes('SUMMON'))
const aboutBtn = Array.from(allButtons).find(btn => btn.textContent.includes('ABOUT'))

console.log('🔍 SUMMON button found:', !!summonBtn)
console.log('🔍 ABOUT button found:', !!aboutBtn)

if (summonBtn) {
  console.log('🔍 SUMMON button classes:', summonBtn.className)
  console.log('🔍 SUMMON button disabled:', summonBtn.disabled)
  console.log('🔍 SUMMON button style.pointerEvents:', summonBtn.style.pointerEvents)
  console.log('🔍 SUMMON button computed style display:', window.getComputedStyle(summonBtn).display)
  console.log('🔍 SUMMON button computed style visibility:', window.getComputedStyle(summonBtn).visibility)
  console.log('🔍 SUMMON button computed style pointerEvents:', window.getComputedStyle(summonBtn).pointerEvents)
}

// Test 2: Check button event listeners
const testButtonClick = (button, name) => {
  if (!button) {
    console.log(`🚨 ${name} button not found`)
    return
  }
  
  console.log(`🔍 Testing ${name} button click...`)
  
  // Create a custom event
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  })
  
  // Attach event listener to capture the click
  const clickHandler = (e) => {
    console.log(`✅ ${name} button click event captured!`)
    console.log('🔍 Event details:', e)
    button.removeEventListener('click', clickHandler)
  }
  
  button.addEventListener('click', clickHandler)
  
  // Simulate click
  button.dispatchEvent(event)
  
  // Also try direct click
  setTimeout(() => {
    console.log(`🔍 Trying direct click on ${name} button...`)
    button.click()
  }, 100)
}

// Test 3: Visual inspection
const checkVisualState = (button, name) => {
  if (!button) return
  
  const rect = button.getBoundingClientRect()
  const isVisible = rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0
  
  console.log(`🔍 ${name} button visibility:`, {
    isVisible,
    rect,
    opacity: window.getComputedStyle(button).opacity,
    zIndex: window.getComputedStyle(button).zIndex
  })
}

// Test 4: Check parent containers
const checkParentContainers = (button, name) => {
  if (!button) return
  
  let parent = button.parentElement
  let level = 0
  
  console.log(`🔍 ${name} button parent chain:`)
  while (parent && level < 5) {
    console.log(`  Level ${level}:`, {
      tagName: parent.tagName,
      classes: parent.className,
      pointerEvents: window.getComputedStyle(parent).pointerEvents,
      zIndex: window.getComputedStyle(parent).zIndex
    })
    parent = parent.parentElement
    level++
  }
}

// Run all tests
console.log('🔍 Running visual state checks...')
checkVisualState(summonBtn, 'SUMMON')
checkVisualState(aboutBtn, 'ABOUT')

console.log('🔍 Running parent container checks...')
checkParentContainers(summonBtn, 'SUMMON')
checkParentContainers(aboutBtn, 'ABOUT')

console.log('🔍 Running button click tests...')
testButtonClick(summonBtn, 'SUMMON')
testButtonClick(aboutBtn, 'ABOUT')

// Test 5: Check for overlay elements
const checkOverlays = () => {
  const allElements = document.querySelectorAll('*')
  const highZIndexElements = Array.from(allElements).filter(el => {
    const zIndex = window.getComputedStyle(el).zIndex
    return zIndex !== 'auto' && parseInt(zIndex) > 50
  })
  
  console.log('🔍 Elements with high z-index that might block clicks:')
  highZIndexElements.forEach(el => {
    const rect = el.getBoundingClientRect()
    console.log('  Element:', {
      tagName: el.tagName,
      classes: el.className,
      zIndex: window.getComputedStyle(el).zIndex,
      rect,
      pointerEvents: window.getComputedStyle(el).pointerEvents
    })
  })
}

console.log('🔍 Checking for overlay elements...')
checkOverlays()

console.log('🔍 Manual button test completed!')
console.log('📝 Instructions:')
console.log('  1. Look for any errors in the console')
console.log('  2. Check if the buttons are found and visible')
console.log('  3. Watch for click event captures')
console.log('  4. Check for any overlay elements blocking clicks')