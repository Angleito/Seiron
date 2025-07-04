// Dragon Ball Physics Utilities
// Advanced orbital mechanics and physics calculations

export interface Vector2D {
  x: number
  y: number
}

export interface DragonBallState {
  id: number
  position: Vector2D
  velocity: Vector2D
  angle: number
  angularVelocity: number
  orbitRadius: number
  orbitEccentricity: number
  orbitSpeed: number
  mass: number
  isHovered: boolean
  isClicked: boolean
  trail: Vector2D[]
}

export interface OrbitalParams {
  semiMajorAxis: number
  eccentricity: number
  inclination: number
  phase: number
}

// Physics constants
const G = 100 // Gravitational constant (adjusted for screen space)
const DAMPING = 0.98 // Velocity damping
const SPRING_STRENGTH = 0.1
const REPULSION_FORCE = 50
const MAX_VELOCITY = 10
const TRAIL_LENGTH = 20

// Calculate elliptical orbit position
export function calculateEllipticalOrbit(
  params: OrbitalParams,
  time: number,
  centerMass: number = 1000
): Vector2D {
  const { semiMajorAxis, eccentricity, phase } = params
  
  // Mean anomaly
  const n = Math.sqrt(G * centerMass / Math.pow(semiMajorAxis, 3))
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
  return {
    x: r * Math.cos(v),
    y: r * Math.sin(v)
  }
}

// Calculate gravitational force between two bodies
export function calculateGravitationalForce(
  pos1: Vector2D,
  pos2: Vector2D,
  mass1: number,
  mass2: number
): Vector2D {
  const dx = pos2.x - pos1.x
  const dy = pos2.y - pos1.y
  const distSq = dx * dx + dy * dy
  const dist = Math.sqrt(distSq)
  
  if (dist < 10) return { x: 0, y: 0 } // Avoid singularity
  
  const force = G * mass1 * mass2 / distSq
  const fx = force * dx / dist
  const fy = force * dy / dist
  
  return { x: fx, y: fy }
}

// Spring force for interactions
export function calculateSpringForce(
  current: Vector2D,
  target: Vector2D,
  strength: number = SPRING_STRENGTH
): Vector2D {
  const dx = target.x - current.x
  const dy = target.y - current.y
  
  return {
    x: dx * strength,
    y: dy * strength
  }
}

// Repulsion force for click interactions
export function calculateRepulsionForce(
  ballPos: Vector2D,
  clickPos: Vector2D,
  strength: number = REPULSION_FORCE
): Vector2D {
  const dx = ballPos.x - clickPos.x
  const dy = ballPos.y - clickPos.y
  const distSq = dx * dx + dy * dy
  const dist = Math.sqrt(distSq)
  
  if (dist < 1) return { x: 0, y: 0 }
  
  const force = strength / distSq
  return {
    x: force * dx / dist,
    y: force * dy / dist
  }
}

// Collision detection between balls
export function detectCollision(
  ball1: DragonBallState,
  ball2: DragonBallState,
  radius: number = 16
): boolean {
  const dx = ball1.position.x - ball2.position.x
  const dy = ball1.position.y - ball2.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  return distance < radius * 2
}

// Elastic collision response
export function resolveCollision(
  ball1: DragonBallState,
  ball2: DragonBallState
): { v1: Vector2D; v2: Vector2D } {
  const dx = ball2.position.x - ball1.position.x
  const dy = ball2.position.y - ball1.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Normalize collision vector
  const nx = dx / distance
  const ny = dy / distance
  
  // Relative velocity
  const dvx = ball2.velocity.x - ball1.velocity.x
  const dvy = ball2.velocity.y - ball1.velocity.y
  
  // Relative velocity in collision normal direction
  const dvn = dvx * nx + dvy * ny
  
  // Do not resolve if velocities are separating
  if (dvn > 0) {
    return { v1: ball1.velocity, v2: ball2.velocity }
  }
  
  // Collision impulse
  const impulse = 2 * dvn / (ball1.mass + ball2.mass)
  
  return {
    v1: {
      x: ball1.velocity.x + impulse * ball2.mass * nx,
      y: ball1.velocity.y + impulse * ball2.mass * ny
    },
    v2: {
      x: ball2.velocity.x - impulse * ball1.mass * nx,
      y: ball2.velocity.y - impulse * ball1.mass * ny
    }
  }
}

// Update ball physics
export function updateBallPhysics(
  ball: DragonBallState,
  forces: Vector2D[],
  deltaTime: number
): DragonBallState {
  // Sum all forces
  const totalForce = forces.reduce(
    (acc, force) => ({ x: acc.x + force.x, y: acc.y + force.y }),
    { x: 0, y: 0 }
  )
  
  // Update velocity (F = ma)
  const acceleration = {
    x: totalForce.x / ball.mass,
    y: totalForce.y / ball.mass
  }
  
  let newVelocity = {
    x: (ball.velocity.x + acceleration.x * deltaTime) * DAMPING,
    y: (ball.velocity.y + acceleration.y * deltaTime) * DAMPING
  }
  
  // Limit maximum velocity
  const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2)
  if (speed > MAX_VELOCITY) {
    newVelocity.x = (newVelocity.x / speed) * MAX_VELOCITY
    newVelocity.y = (newVelocity.y / speed) * MAX_VELOCITY
  }
  
  // Update position
  const newPosition = {
    x: ball.position.x + newVelocity.x * deltaTime,
    y: ball.position.y + newVelocity.y * deltaTime
  }
  
  // Update trail
  const newTrail = [newPosition, ...ball.trail.slice(0, TRAIL_LENGTH - 1)]
  
  return {
    ...ball,
    position: newPosition,
    velocity: newVelocity,
    trail: newTrail
  }
}

// Calculate orbital speed based on power level
export function calculateOrbitalSpeed(
  basePeriod: number,
  powerLevel: number,
  intensity: 'low' | 'medium' | 'high' | 'max'
): number {
  const intensityMultiplier = {
    low: 1,
    medium: 1.5,
    high: 2,
    max: 3
  }
  
  return (2 * Math.PI) / (basePeriod / (intensityMultiplier[intensity] * (1 + powerLevel * 0.1)))
}

// Generate unique orbital parameters for each ball
export function generateOrbitalParams(index: number, totalBalls: number): OrbitalParams {
  const baseRadius = 150
  const radiusVariation = 30
  
  return {
    semiMajorAxis: baseRadius + (Math.sin(index * 2.7) * radiusVariation),
    eccentricity: 0.1 + (index % 3) * 0.15, // Varying eccentricity
    inclination: (index * Math.PI * 0.1), // Slight 3D effect
    phase: (index * 2 * Math.PI) / totalBalls // Even distribution
  }
}

// Wish-granting animation path
export function calculateWishPath(
  startPos: Vector2D,
  centerPos: Vector2D,
  progress: number
): Vector2D {
  // Spiral inward with acceleration
  const angle = progress * Math.PI * 4 // 2 full rotations
  const radius = (1 - progress) * Math.sqrt(
    (startPos.x - centerPos.x) ** 2 + (startPos.y - centerPos.y) ** 2
  )
  
  // Ease-in-out
  const easedProgress = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2
  
  return {
    x: centerPos.x + Math.cos(angle) * radius * (1 - easedProgress),
    y: centerPos.y + Math.sin(angle) * radius * (1 - easedProgress)
  }
}

// Performance optimization: Spatial grid for collision detection
export class SpatialGrid {
  private grid: Map<string, DragonBallState[]>
  private cellSize: number
  
  constructor(cellSize: number = 50) {
    this.grid = new Map()
    this.cellSize = cellSize
  }
  
  clear() {
    this.grid.clear()
  }
  
  add(ball: DragonBallState) {
    const key = this.getKey(ball.position)
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push(ball)
  }
  
  getNearby(position: Vector2D): DragonBallState[] {
    const nearby: DragonBallState[] = []
    const x = Math.floor(position.x / this.cellSize)
    const y = Math.floor(position.y / this.cellSize)
    
    // Check surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${x + dx},${y + dy}`
        if (this.grid.has(key)) {
          nearby.push(...this.grid.get(key)!)
        }
      }
    }
    
    return nearby
  }
  
  private getKey(position: Vector2D): string {
    const x = Math.floor(position.x / this.cellSize)
    const y = Math.floor(position.y / this.cellSize)
    return `${x},${y}`
  }
}