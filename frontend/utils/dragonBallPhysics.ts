// Dragon Ball Physics Utilities
// Pure functional physics calculations using fp-ts patterns

import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as TE from 'fp-ts/TaskEither'
import * as R from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'

// Pure types and interfaces
export interface Vector2D {
  readonly x: number
  readonly y: number
}

export interface DragonBallState {
  readonly id: number
  readonly position: Vector2D
  readonly velocity: Vector2D
  readonly angle: number
  readonly angularVelocity: number
  readonly orbitRadius: number
  readonly orbitEccentricity: number
  readonly orbitSpeed: number
  readonly mass: number
  readonly isHovered: boolean
  readonly isClicked: boolean
  readonly trail: readonly Vector2D[]
}

export interface OrbitalParams {
  readonly semiMajorAxis: number
  readonly eccentricity: number
  readonly inclination: number
  readonly phase: number
}

export interface PhysicsConfig {
  readonly gravitationalConstant: number
  readonly damping: number
  readonly springStrength: number
  readonly repulsionForce: number
  readonly maxVelocity: number
  readonly trailLength: number
}

export interface PhysicsError {
  type: 'CALCULATION_ERROR' | 'COLLISION_ERROR' | 'ORBIT_ERROR'
  message: string
  originalError?: unknown
}

// Pure constants
const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravitationalConstant: 100,
  damping: 0.98,
  springStrength: 0.1,
  repulsionForce: 50,
  maxVelocity: 10,
  trailLength: 20
}

// Pure function constructors
const createPhysicsError = (
  type: PhysicsError['type'],
  message: string,
  originalError?: unknown
): PhysicsError => ({
  type,
  message,
  originalError
})

const createVector2D = (x: number, y: number): Vector2D => ({ x, y })

const createDragonBallState = (
  id: number,
  position: Vector2D,
  velocity: Vector2D = createVector2D(0, 0),
  mass: number = 1
): DragonBallState => ({
  id,
  position,
  velocity,
  angle: 0,
  angularVelocity: 0,
  orbitRadius: 150,
  orbitEccentricity: 0.1,
  orbitSpeed: 0.02,
  mass,
  isHovered: false,
  isClicked: false,
  trail: []
})

// Pure vector operations
export const vectorUtils = {
  add: (v1: Vector2D, v2: Vector2D): Vector2D => createVector2D(v1.x + v2.x, v1.y + v2.y),
  
  subtract: (v1: Vector2D, v2: Vector2D): Vector2D => createVector2D(v1.x - v2.x, v1.y - v2.y),
  
  multiply: (v: Vector2D, scalar: number): Vector2D => createVector2D(v.x * scalar, v.y * scalar),
  
  divide: (v: Vector2D, scalar: number): Vector2D => 
    scalar === 0 ? createVector2D(0, 0) : createVector2D(v.x / scalar, v.y / scalar),
  
  magnitude: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),
  
  magnitudeSquared: (v: Vector2D): number => v.x * v.x + v.y * v.y,
  
  normalize: (v: Vector2D): Vector2D => {
    const mag = vectorUtils.magnitude(v)
    return mag === 0 ? createVector2D(0, 0) : vectorUtils.divide(v, mag)
  },
  
  distance: (v1: Vector2D, v2: Vector2D): number => 
    vectorUtils.magnitude(vectorUtils.subtract(v2, v1)),
  
  distanceSquared: (v1: Vector2D, v2: Vector2D): number => 
    vectorUtils.magnitudeSquared(vectorUtils.subtract(v2, v1)),
  
  dot: (v1: Vector2D, v2: Vector2D): number => v1.x * v2.x + v1.y * v2.y,
  
  rotate: (v: Vector2D, angle: number): Vector2D => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return createVector2D(
      v.x * cos - v.y * sin,
      v.x * sin + v.y * cos
    )
  },
  
  lerp: (v1: Vector2D, v2: Vector2D, t: number): Vector2D => 
    createVector2D(
      v1.x + (v2.x - v1.x) * t,
      v1.y + (v2.y - v1.y) * t
    ),
  
  clamp: (v: Vector2D, min: Vector2D, max: Vector2D): Vector2D => 
    createVector2D(
      Math.max(min.x, Math.min(max.x, v.x)),
      Math.max(min.y, Math.min(max.y, v.y))
    )
}

// Pure elliptical orbit calculation
export const calculateEllipticalOrbit = (
  params: OrbitalParams,
  time: number,
  centerMass: number = 1000
): E.Either<PhysicsError, Vector2D> =>
  E.tryCatch(
    () => {
      const { semiMajorAxis, eccentricity, phase } = params
      
      if (semiMajorAxis <= 0) {
        throw new Error('Semi-major axis must be positive')
      }
      
      if (eccentricity < 0 || eccentricity >= 1) {
        throw new Error('Eccentricity must be between 0 and 1')
      }
      
      // Mean anomaly
      const n = Math.sqrt(DEFAULT_PHYSICS_CONFIG.gravitationalConstant * centerMass / Math.pow(semiMajorAxis, 3))
      const M = n * time + phase
      
      // Solve Kepler's equation for eccentric anomaly (E)
      let E = M
      for (let i = 0; i < 5; i++) {
        E = M + eccentricity * Math.sin(E)
      }
      
      // True anomaly
      const v = 2 * Math.atan2(
        Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
        Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
      )
      
      // Distance from center
      const r = semiMajorAxis * (1 - eccentricity * Math.cos(E))
      
      // Position in orbital plane
      return createVector2D(r * Math.cos(v), r * Math.sin(v))
    },
    (error) => createPhysicsError('ORBIT_ERROR', 'Failed to calculate orbital position', error)
  )

// Pure gravitational force calculation
export const calculateGravitationalForce = (config: PhysicsConfig) => (
  pos1: Vector2D,
  pos2: Vector2D,
  mass1: number,
  mass2: number
): E.Either<PhysicsError, Vector2D> =>
  E.tryCatch(
    () => {
      const displacement = vectorUtils.subtract(pos2, pos1)
      const distSq = vectorUtils.magnitudeSquared(displacement)
      const dist = Math.sqrt(distSq)
      
      if (dist < 10) return createVector2D(0, 0) // Avoid singularity
      
      const force = config.gravitationalConstant * mass1 * mass2 / distSq
      const direction = vectorUtils.normalize(displacement)
      
      return vectorUtils.multiply(direction, force)
    },
    (error) => createPhysicsError('CALCULATION_ERROR', 'Failed to calculate gravitational force', error)
  )

// Pure spring force calculation
export const calculateSpringForce = (config: PhysicsConfig) => (
  current: Vector2D,
  target: Vector2D
): Vector2D => {
  const displacement = vectorUtils.subtract(target, current)
  return vectorUtils.multiply(displacement, config.springStrength)
}

// Pure repulsion force calculation
export const calculateRepulsionForce = (config: PhysicsConfig) => (
  ballPos: Vector2D,
  clickPos: Vector2D
): Vector2D => {
  const displacement = vectorUtils.subtract(ballPos, clickPos)
  const distSq = vectorUtils.magnitudeSquared(displacement)
  const dist = Math.sqrt(distSq)
  
  if (dist < 1) return createVector2D(0, 0)
  
  const force = config.repulsionForce / distSq
  const direction = vectorUtils.normalize(displacement)
  
  return vectorUtils.multiply(direction, force)
}

// Pure collision detection
export const detectCollision = (
  ball1: DragonBallState,
  ball2: DragonBallState,
  radius: number = 16
): boolean => {
  const distance = vectorUtils.distance(ball1.position, ball2.position)
  return distance < radius * 2
}

// Pure elastic collision response
export const resolveCollision = (
  ball1: DragonBallState,
  ball2: DragonBallState
): E.Either<PhysicsError, { v1: Vector2D; v2: Vector2D }> =>
  E.tryCatch(
    () => {
      const displacement = vectorUtils.subtract(ball2.position, ball1.position)
      const distance = vectorUtils.magnitude(displacement)
      
      if (distance === 0) {
        return { v1: ball1.velocity, v2: ball2.velocity }
      }
      
      // Normalize collision vector
      const normal = vectorUtils.normalize(displacement)
      
      // Relative velocity
      const relativeVelocity = vectorUtils.subtract(ball2.velocity, ball1.velocity)
      
      // Relative velocity in collision normal direction
      const velocityAlongNormal = vectorUtils.dot(relativeVelocity, normal)
      
      // Do not resolve if velocities are separating
      if (velocityAlongNormal > 0) {
        return { v1: ball1.velocity, v2: ball2.velocity }
      }
      
      // Collision impulse
      const impulse = 2 * velocityAlongNormal / (ball1.mass + ball2.mass)
      const impulseVector = vectorUtils.multiply(normal, impulse)
      
      return {
        v1: vectorUtils.add(ball1.velocity, vectorUtils.multiply(impulseVector, ball2.mass)),
        v2: vectorUtils.subtract(ball2.velocity, vectorUtils.multiply(impulseVector, ball1.mass))
      }
    },
    (error) => createPhysicsError('COLLISION_ERROR', 'Failed to resolve collision', error)
  )

// Pure velocity limiting
const limitVelocity = (velocity: Vector2D, maxVelocity: number): Vector2D => {
  const speed = vectorUtils.magnitude(velocity)
  if (speed > maxVelocity) {
    return vectorUtils.multiply(vectorUtils.normalize(velocity), maxVelocity)
  }
  return velocity
}

// Pure trail update
const updateTrail = (currentPosition: Vector2D, trail: readonly Vector2D[], maxLength: number): readonly Vector2D[] =>
  [currentPosition, ...trail.slice(0, maxLength - 1)]

// Pure ball physics update
export const updateBallPhysics = (config: PhysicsConfig) => (
  ball: DragonBallState,
  forces: readonly Vector2D[],
  deltaTime: number
): E.Either<PhysicsError, DragonBallState> =>
  E.tryCatch(
    () => {
      // Sum all forces
      const totalForce = forces.reduce(
        (acc, force) => vectorUtils.add(acc, force),
        createVector2D(0, 0)
      )
      
      // Update velocity (F = ma)
      const acceleration = vectorUtils.divide(totalForce, ball.mass)
      const deltaVelocity = vectorUtils.multiply(acceleration, deltaTime)
      const newVelocityUnlimited = vectorUtils.add(ball.velocity, deltaVelocity)
      const dampedVelocity = vectorUtils.multiply(newVelocityUnlimited, config.damping)
      
      // Limit maximum velocity
      const newVelocity = limitVelocity(dampedVelocity, config.maxVelocity)
      
      // Update position
      const deltaPosition = vectorUtils.multiply(newVelocity, deltaTime)
      const newPosition = vectorUtils.add(ball.position, deltaPosition)
      
      // Update trail
      const newTrail = updateTrail(newPosition, ball.trail, config.trailLength)
      
      return {
        ...ball,
        position: newPosition,
        velocity: newVelocity,
        trail: newTrail
      }
    },
    (error) => createPhysicsError('CALCULATION_ERROR', 'Failed to update ball physics', error)
  )

// Pure orbital speed calculation
export const calculateOrbitalSpeed = (
  basePeriod: number,
  powerLevel: number,
  intensity: 'low' | 'medium' | 'high' | 'max'
): number => {
  const intensityMultiplier = {
    low: 1,
    medium: 1.5,
    high: 2,
    max: 3
  }
  
  return (2 * Math.PI) / (basePeriod / (intensityMultiplier[intensity] * (1 + powerLevel * 0.1)))
}

// Pure orbital parameters generation
export const generateOrbitalParams = (index: number, totalBalls: number): OrbitalParams => {
  const baseRadius = 150
  const radiusVariation = 30
  
  return {
    semiMajorAxis: baseRadius + (Math.sin(index * 2.7) * radiusVariation),
    eccentricity: 0.1 + (index % 3) * 0.15, // Varying eccentricity
    inclination: (index * Math.PI * 0.1), // Slight 3D effect
    phase: (index * 2 * Math.PI) / totalBalls // Even distribution
  }
}

// Pure wish-granting animation path
export const calculateWishPath = (
  startPos: Vector2D,
  centerPos: Vector2D,
  progress: number
): Vector2D => {
  // Spiral inward with acceleration
  const angle = progress * Math.PI * 4 // 2 full rotations
  const displacement = vectorUtils.subtract(startPos, centerPos)
  const radius = (1 - progress) * vectorUtils.magnitude(displacement)
  
  // Ease-in-out
  const easedProgress = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2
  
  const spiralOffset = createVector2D(
    Math.cos(angle) * radius * (1 - easedProgress),
    Math.sin(angle) * radius * (1 - easedProgress)
  )
  
  return vectorUtils.add(centerPos, spiralOffset)
}

// Pure spatial grid for collision detection optimization
export interface SpatialGridConfig {
  readonly cellSize: number
  readonly bounds: {
    readonly minX: number
    readonly minY: number
    readonly maxX: number
    readonly maxY: number
  }
}

export interface SpatialGridState {
  readonly grid: Map<string, readonly DragonBallState[]>
  readonly config: SpatialGridConfig
}

const createSpatialGridKey = (x: number, y: number): string => `${x},${y}`

const getGridCoordinates = (position: Vector2D, cellSize: number) => ({
  x: Math.floor(position.x / cellSize),
  y: Math.floor(position.y / cellSize)
})

export const createSpatialGrid = (config: SpatialGridConfig): SpatialGridState => ({
  grid: new Map(),
  config
})

export const addToSpatialGrid = (
  gridState: SpatialGridState,
  ball: DragonBallState
): SpatialGridState => {
  const coords = getGridCoordinates(ball.position, gridState.config.cellSize)
  const key = createSpatialGridKey(coords.x, coords.y)
  
  const currentBalls = gridState.grid.get(key) || []
  const newGrid = new Map(gridState.grid)
  newGrid.set(key, [...currentBalls, ball])
  
  return {
    ...gridState,
    grid: newGrid
  }
}

export const getNearbyBalls = (
  gridState: SpatialGridState,
  position: Vector2D
): readonly DragonBallState[] => {
  const coords = getGridCoordinates(position, gridState.config.cellSize)
  const nearby: DragonBallState[] = []
  
  // Check surrounding cells
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = createSpatialGridKey(coords.x + dx, coords.y + dy)
      const cellBalls = gridState.grid.get(key)
      if (cellBalls) {
        nearby.push(...cellBalls)
      }
    }
  }
  
  return nearby
}

export const clearSpatialGrid = (gridState: SpatialGridState): SpatialGridState => ({
  ...gridState,
  grid: new Map()
})

// Pure physics simulation utilities
export const physicsUtils = {
  // Create default physics configuration
  createDefaultConfig: (): PhysicsConfig => ({ ...DEFAULT_PHYSICS_CONFIG }),
  
  // Create physics configuration with overrides
  createConfig: (overrides: Partial<PhysicsConfig>): PhysicsConfig => ({
    ...DEFAULT_PHYSICS_CONFIG,
    ...overrides
  }),
  
  // Calculate multiple forces and combine them
  combineForces: (forces: readonly Vector2D[]): Vector2D =>
    forces.reduce((acc, force) => vectorUtils.add(acc, force), createVector2D(0, 0)),
  
  // Check if a position is within bounds
  isWithinBounds: (position: Vector2D, bounds: { width: number; height: number }): boolean =>
    position.x >= 0 && position.x <= bounds.width &&
    position.y >= 0 && position.y <= bounds.height,
  
  // Wrap position around bounds (toroidal topology)
  wrapPosition: (position: Vector2D, bounds: { width: number; height: number }): Vector2D =>
    createVector2D(
      ((position.x % bounds.width) + bounds.width) % bounds.width,
      ((position.y % bounds.height) + bounds.height) % bounds.height
    ),
  
  // Calculate kinetic energy
  calculateKineticEnergy: (ball: DragonBallState): number =>
    0.5 * ball.mass * vectorUtils.magnitudeSquared(ball.velocity),
  
  // Calculate total system energy
  calculateSystemEnergy: (balls: readonly DragonBallState[]): number =>
    balls.reduce((total, ball) => total + physicsUtils.calculateKineticEnergy(ball), 0)
}

// Legacy class-based API for compatibility (now uses pure functions internally)
export class SpatialGrid {
  private state: SpatialGridState
  
  constructor(cellSize: number = 50) {
    const config: SpatialGridConfig = {
      cellSize,
      bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
    }
    this.state = createSpatialGrid(config)
  }
  
  clear() {
    this.state = clearSpatialGrid(this.state)
  }
  
  add(ball: DragonBallState) {
    this.state = addToSpatialGrid(this.state, ball)
  }
  
  getNearby(position: Vector2D): readonly DragonBallState[] {
    return getNearbyBalls(this.state, position)
  }
  
  get size() {
    return this.state.grid.size
  }
}