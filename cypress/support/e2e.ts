// ***********************************************************
// This file is processed and loaded automatically before test files.
// You can change the location of this file or turn off processing
// using the 'supportFile' config option.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Import custom types
import './types';

// Disable Chrome's ResizeObserver loop limit exceeded error
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
});

// Add code coverage support
import '@cypress/code-coverage/support';

// Before each test
beforeEach(() => {
  // Clear local storage
  cy.clearLocalStorage();
  
  // Clear cookies
  cy.clearCookies();
  
  // Reset interceptors
  cy.task('clearTestData');
});

// After each test
afterEach(() => {
  // Log test completion
  cy.task('log', `Test completed: ${Cypress.currentTest.title}`);
});