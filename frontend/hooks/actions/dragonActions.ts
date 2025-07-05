// Dragon animation action creators using functional patterns
import { DragonState, DragonMood, DragonAnimationAction } from '../useDragonAnimation'

// Action creators with proper typing
export const dragonActions = {
  setDragonState: (state: DragonState): DragonAnimationAction => ({
    type: 'SET_DRAGON_STATE',
    payload: state
  }),
  
  setDragonMood: (mood: DragonMood): DragonAnimationAction => ({
    type: 'SET_DRAGON_MOOD',
    payload: mood
  }),
  
  setPowerLevel: (level: number): DragonAnimationAction => ({
    type: 'SET_POWER_LEVEL',
    payload: level
  }),
  
  setIsCharging: (isCharging: boolean): DragonAnimationAction => ({
    type: 'SET_IS_CHARGING',
    payload: isCharging
  }),
  
  incrementPower: (amount: number = 10): DragonAnimationAction => ({
    type: 'INCREMENT_POWER',
    payload: amount
  }),
  
  decrementPower: (amount: number = 5): DragonAnimationAction => ({
    type: 'DECREMENT_POWER',
    payload: amount
  }),
  
  addTimeout: (timeoutId: number): DragonAnimationAction => ({
    type: 'ADD_TIMEOUT',
    payload: timeoutId
  }),
  
  addInterval: (intervalId: number): DragonAnimationAction => ({
    type: 'ADD_INTERVAL',
    payload: intervalId
  }),
  
  clearTimeouts: (): DragonAnimationAction => ({
    type: 'CLEAR_TIMEOUTS'
  }),
  
  clearIntervals: (): DragonAnimationAction => ({
    type: 'CLEAR_INTERVALS'
  }),
  
  updateTransitionTime: (): DragonAnimationAction => ({
    type: 'UPDATE_TRANSITION_TIME'
  }),
  
  resetState: (): DragonAnimationAction => ({
    type: 'RESET_STATE'
  })
}

// State transition helpers
export const dragonStateTransitions = {
  // Idle state transitions
  fromIdle: {
    toAttention: () => dragonActions.setDragonState('attention'),
    toSleeping: () => dragonActions.setDragonState('sleeping'),
    toAwakening: () => dragonActions.setDragonState('awakening')
  },
  
  // Attention state transitions
  fromAttention: {
    toReady: () => dragonActions.setDragonState('ready'),
    toIdle: () => dragonActions.setDragonState('idle')
  },
  
  // Ready state transitions
  fromReady: {
    toActive: () => dragonActions.setDragonState('active'),
    toIdle: () => dragonActions.setDragonState('idle')
  },
  
  // Active state transitions
  fromActive: {
    toIdle: () => dragonActions.setDragonState('idle'),
    toReady: () => dragonActions.setDragonState('ready')
  },
  
  // Sleeping state transitions
  fromSleeping: {
    toAwakening: () => dragonActions.setDragonState('awakening')
  },
  
  // Awakening state transitions
  fromAwakening: {
    toIdle: () => dragonActions.setDragonState('idle'),
    toReady: () => dragonActions.setDragonState('ready')
  }
}

// Mood transition helpers
export const dragonMoodTransitions = {
  toNeutral: () => dragonActions.setDragonMood('neutral'),
  toHappy: () => dragonActions.setDragonMood('happy'),
  toExcited: () => dragonActions.setDragonMood('excited'),
  toPowerful: () => dragonActions.setDragonMood('powerful'),
  toMystical: () => dragonActions.setDragonMood('mystical')
}

// Complex action sequences
export const dragonSequences = {
  // Power up sequence
  powerUpSequence: () => [
    dragonActions.setIsCharging(true),
    dragonActions.setDragonState('active'),
    dragonActions.setDragonMood('powerful')
  ],
  
  // Rest sequence
  restSequence: () => [
    dragonActions.setIsCharging(false),
    dragonActions.setDragonState('idle'),
    dragonActions.setDragonMood('neutral'),
    dragonActions.setPowerLevel(0)
  ],
  
  // Awakening sequence
  awakeningSequence: () => [
    dragonActions.setDragonState('awakening'),
    dragonActions.setDragonMood('happy'),
    dragonActions.incrementPower(20)
  ],
  
  // Sleep sequence
  sleepSequence: () => [
    dragonActions.setDragonState('sleeping'),
    dragonActions.setDragonMood('neutral'),
    dragonActions.setIsCharging(false),
    dragonActions.decrementPower(50)
  ]
}

// Time-based action creators
export const timeBasedActions = {
  // Get action based on current time
  getTimeBasedAction: (): DragonAnimationAction[] => {
    const hour = new Date().getHours()
    
    // Night time (11 PM - 5 AM)
    if (hour >= 23 || hour < 5) {
      return dragonSequences.sleepSequence()
    }
    
    // Morning (5 AM - 7 AM)
    if (hour >= 5 && hour < 7) {
      return dragonSequences.awakeningSequence()
    }
    
    // Day time (9 AM - 5 PM)
    if (hour >= 9 && hour < 17) {
      return [dragonActions.setDragonMood('excited')]
    }
    
    // Evening (6 PM - 8 PM)
    if (hour >= 18 && hour < 20) {
      return [dragonActions.setDragonMood('mystical')]
    }
    
    // Default
    return [dragonActions.setDragonMood('neutral')]
  }
}

// Validation helpers
export const dragonValidators = {
  isValidState: (state: string): state is DragonState => {
    return ['idle', 'attention', 'ready', 'active', 'sleeping', 'awakening'].includes(state)
  },
  
  isValidMood: (mood: string): mood is DragonMood => {
    return ['neutral', 'happy', 'excited', 'powerful', 'mystical'].includes(mood)
  },
  
  isValidPowerLevel: (level: number): boolean => {
    return level >= 0 && level <= 100
  }
}

// Thunk-style action creators for async operations
export type DragonThunkAction = (
  dispatch: (action: DragonAnimationAction) => void,
  getState: () => any
) => Promise<void>

export const dragonThunks = {
  // Animate power up over time
  animatePowerUp: (targetLevel: number, duration: number = 3000): DragonThunkAction =>
    async (dispatch, getState) => {
      const steps = 30 // 30 animation steps
      const increment = targetLevel / steps
      const stepDuration = duration / steps
      
      dispatch(dragonActions.setIsCharging(true))
      dispatch(dragonActions.setDragonState('active'))
      
      for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDuration))
        dispatch(dragonActions.incrementPower(increment))
      }
      
      dispatch(dragonActions.setIsCharging(false))
    },
    
  // Gradual state transition
  transitionToState: (targetState: DragonState, delay: number = 1000): DragonThunkAction =>
    async (dispatch, getState) => {
      dispatch(dragonActions.updateTransitionTime())
      
      await new Promise(resolve => setTimeout(resolve, delay))
      
      dispatch(dragonActions.setDragonState(targetState))
    },
    
  // Auto mode sequence
  autoModeSequence: (): DragonThunkAction =>
    async (dispatch, getState) => {
      const sequence = [
        { state: 'attention' as DragonState, duration: 2000 },
        { state: 'ready' as DragonState, duration: 3000 },
        { state: 'active' as DragonState, duration: 5000 },
        { state: 'idle' as DragonState, duration: 1000 }
      ]
      
      for (const step of sequence) {
        dispatch(dragonActions.setDragonState(step.state))
        await new Promise(resolve => setTimeout(resolve, step.duration))
      }
    }
}