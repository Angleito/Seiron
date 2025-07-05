import { describe, test, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as fc from 'fast-check'
import {
  vectorUtils,
  calculateEllipticalOrbit,
  calculateGravitationalForce,
  calculateSpringForce,
  calculateRepulsionForce,
  detectCollision,
  resolveCollision,
  updateBallPhysics,
  physicsUtils,
  createSpatialGrid,
  addToSpatialGrid,
  getNearbyBalls,
  clearSpatialGrid,
  DragonBallState,
  PhysicsConfig,
  OrbitalParams,
  Vector2D
} from '../../utils/dragonBallPhysics'

// Simplified arbitrary generators for property-based testing
const vectorArb = fc.record({
  x: fc.integer({ min: -100, max: 100 }),
  y: fc.integer({ min: -100, max: 100 })
}).map(v => ({ x: v.x / 10, y: v.y / 10 }))

const physicsConfigArb = fc.record({
  gravitationalConstant: fc.integer({ min: 50, max: 200 }),
  damping: fc.integer({ min: 80, max: 100 }).map(x => x / 100),
  springStrength: fc.integer({ min: 5, max: 20 }).map(x => x / 100),
  repulsionForce: fc.integer({ min: 10, max: 100 }),
  maxVelocity: fc.integer({ min: 5, max: 50 }),
  trailLength: fc.integer({ min: 5, max: 30 })
})

const dragonBallStateArb = fc.record({
  id: fc.integer({ min: 0, max: 10 }),
  position: vectorArb,
  velocity: vectorArb,
  angle: fc.integer({ min: 0, max: 628 }).map(x => x / 100),
  angularVelocity: fc.integer({ min: -100, max: 100 }).map(x => x / 100),
  orbitRadius: fc.integer({ min: 50, max: 200 }),
  orbitEccentricity: fc.integer({ min: 0, max: 80 }).map(x => x / 100),
  orbitSpeed: fc.integer({ min: 1, max: 10 }).map(x => x / 1000),
  mass: fc.integer({ min: 5, max: 50 }).map(x => x / 10),
  isHovered: fc.boolean(),
  isClicked: fc.boolean(),
  trail: fc.array(vectorArb, { maxLength: 10 })
})

const orbitalParamsArb = fc.record({
  semiMajorAxis: fc.integer({ min: 50, max: 300 }),
  eccentricity: fc.integer({ min: 0, max: 80 }).map(x => x / 100),
  inclination: fc.integer({ min: 0, max: 314 }).map(x => x / 100),
  phase: fc.integer({ min: 0, max: 628 }).map(x => x / 100)
})

describe('Vector Utils - Pure Functions', () => {
  test('vector addition is commutative', () => {
    fc.assert(fc.property(vectorArb, vectorArb, (v1, v2) => {
      const result1 = vectorUtils.add(v1, v2)
      const result2 = vectorUtils.add(v2, v1)
      expect(result1.x).toBeCloseTo(result2.x, 10)
      expect(result1.y).toBeCloseTo(result2.y, 10)
    }))
  })

  test('vector addition is associative', () => {
    fc.assert(fc.property(vectorArb, vectorArb, vectorArb, (v1, v2, v3) => {
      const result1 = vectorUtils.add(vectorUtils.add(v1, v2), v3)
      const result2 = vectorUtils.add(v1, vectorUtils.add(v2, v3))
      expect(result1.x).toBeCloseTo(result2.x, 10)
      expect(result1.y).toBeCloseTo(result2.y, 10)
    }))
  })

  test('vector subtraction identity', () => {
    fc.assert(fc.property(vectorArb, (v) => {
      const zero = vectorUtils.subtract(v, v)
      expect(zero.x).toBeCloseTo(0, 10)
      expect(zero.y).toBeCloseTo(0, 10)
    }))
  })

  test('vector magnitude is always non-negative', () => {
    fc.assert(fc.property(vectorArb, (v) => {
      const magnitude = vectorUtils.magnitude(v)
      expect(magnitude).toBeGreaterThanOrEqual(0)
    }))
  })

  test('normalizing a vector gives unit magnitude (except for zero vector)', () => {
    fc.assert(fc.property(vectorArb, (v) => {
      const magnitude = vectorUtils.magnitude(v)
      if (magnitude > 0.01) {
        const normalized = vectorUtils.normalize(v)
        const normalizedMagnitude = vectorUtils.magnitude(normalized)
        expect(normalizedMagnitude).toBeCloseTo(1, 5)
      }
    }))
  })

  test('distance is symmetric', () => {
    fc.assert(fc.property(vectorArb, vectorArb, (v1, v2) => {
      const dist1 = vectorUtils.distance(v1, v2)
      const dist2 = vectorUtils.distance(v2, v1)
      expect(dist1).toBeCloseTo(dist2, 10)
    }))
  })

  test('scalar multiplication distributes over addition', () => {
    fc.assert(fc.property(vectorArb, vectorArb, fc.integer({ min: -10, max: 10 }), (v1, v2, scalar) => {
      const result1 = vectorUtils.multiply(vectorUtils.add(v1, v2), scalar)
      const result2 = vectorUtils.add(vectorUtils.multiply(v1, scalar), vectorUtils.multiply(v2, scalar))
      expect(result1.x).toBeCloseTo(result2.x, 10)
      expect(result1.y).toBeCloseTo(result2.y, 10)
    }))
  })
})

describe('Elliptical Orbit Calculation - Pure Functions', () => {
  test('returns valid positions for valid orbital parameters', () => {
    fc.assert(fc.property(
      orbitalParamsArb,
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 100, max: 5000 }),
      (params, time, centerMass) => {
        const result = calculateEllipticalOrbit(params, time, centerMass)
        expect(E.isRight(result)).toBe(true)
        if (E.isRight(result)) {
          const position = result.right
          expect(typeof position.x).toBe('number')
          expect(typeof position.y).toBe('number')
          expect(isFinite(position.x)).toBe(true)
          expect(isFinite(position.y)).toBe(true)
        }
      }
    ))
  })

  test('rejects invalid semi-major axis', () => {
    const invalidParams: OrbitalParams = {
      semiMajorAxis: 0,
      eccentricity: 0.5,
      inclination: 0,
      phase: 0
    }
    
    const result = calculateEllipticalOrbit(invalidParams, 0, 1000)
    expect(E.isLeft(result)).toBe(true)
  })

  test('rejects invalid eccentricity', () => {
    const invalidParams: OrbitalParams = {
      semiMajorAxis: 100,
      eccentricity: 1.5,
      inclination: 0,
      phase: 0
    }
    
    const result = calculateEllipticalOrbit(invalidParams, 0, 1000)
    expect(E.isLeft(result)).toBe(true)
  })
})

describe('Gravitational Force Calculation - Pure Functions', () => {
  test('gravitational force follows inverse square law', () => {
    const config = physicsUtils.createDefaultConfig()
    
    fc.assert(fc.property(
      vectorArb,
      vectorArb,
      fc.integer({ min: 1, max: 10 }),
      fc.integer({ min: 1, max: 10 }),
      (pos1, pos2, mass1, mass2) => {
        const distance = vectorUtils.distance(pos1, pos2)
        if (distance > 10) { // Avoid singularity protection
          const result = calculateGravitationalForce(config)(pos1, pos2, mass1, mass2)
          expect(E.isRight(result)).toBe(true)
          
          if (E.isRight(result)) {
            const force = result.right
            const forceMagnitude = vectorUtils.magnitude(force)
            const expectedMagnitude = config.gravitationalConstant * mass1 * mass2 / (distance * distance)
            expect(forceMagnitude).toBeCloseTo(expectedMagnitude, 3)
          }
        }
      }
    ))
  })

  test('gravitational force is attractive', () => {
    const config = physicsUtils.createDefaultConfig()
    const pos1: Vector2D = { x: 0, y: 0 }
    const pos2: Vector2D = { x: 100, y: 0 }
    
    const result = calculateGravitationalForce(config)(pos1, pos2, 1, 1)
    expect(E.isRight(result)).toBe(true)
    
    if (E.isRight(result)) {
      const force = result.right
      // Force should point from pos1 towards pos2 (positive x direction)
      expect(force.x).toBeGreaterThan(0)
      expect(force.y).toBeCloseTo(0, 10)
    }
  })
})

describe('Spring Force Calculation - Pure Functions', () => {
  test('spring force is proportional to displacement', () => {
    fc.assert(fc.property(physicsConfigArb, vectorArb, vectorArb, (config, current, target) => {
      const force = calculateSpringForce(config)(current, target)
      const displacement = vectorUtils.subtract(target, current)
      const expectedForce = vectorUtils.multiply(displacement, config.springStrength)
      
      expect(force.x).toBeCloseTo(expectedForce.x, 10)
      expect(force.y).toBeCloseTo(expectedForce.y, 10)
    }))
  })

  test('spring force is zero when at target', () => {
    const config = physicsUtils.createDefaultConfig()
    fc.assert(fc.property(vectorArb, (position) => {
      const force = calculateSpringForce(config)(position, position)
      expect(force.x).toBeCloseTo(0, 10)
      expect(force.y).toBeCloseTo(0, 10)
    }))
  })
})

describe('Collision Detection - Pure Functions', () => {
  test('collision detection is symmetric', () => {
    fc.assert(fc.property(dragonBallStateArb, dragonBallStateArb, fc.integer({ min: 5, max: 50 }), (ball1, ball2, radius) => {
      const collision1 = detectCollision(ball1, ball2, radius)
      const collision2 = detectCollision(ball2, ball1, radius)
      expect(collision1).toBe(collision2)
    }))
  })

  test('identical positions always collide', () => {
    const position: Vector2D = { x: 100, y: 100 }
    const ball1: DragonBallState = {
      id: 1,
      position,
      velocity: { x: 0, y: 0 },
      angle: 0,
      angularVelocity: 0,
      orbitRadius: 150,
      orbitEccentricity: 0.1,
      orbitSpeed: 0.02,
      mass: 1,
      isHovered: false,
      isClicked: false,
      trail: []
    }
    const ball2: DragonBallState = { ...ball1, id: 2 }
    
    expect(detectCollision(ball1, ball2, 16)).toBe(true)
  })
})

describe('Collision Resolution - Pure Functions', () => {
  test('momentum is conserved in elastic collisions', () => {
    fc.assert(fc.property(
      dragonBallStateArb,
      dragonBallStateArb,
      (ball1, ball2) => {
        // Skip test if balls are at same position (undefined collision)
        const distance = vectorUtils.distance(ball1.position, ball2.position)
        if (distance > 0.1) {
          const initialMomentum = vectorUtils.add(
            vectorUtils.multiply(ball1.velocity, ball1.mass),
            vectorUtils.multiply(ball2.velocity, ball2.mass)
          )
          
          const result = resolveCollision(ball1, ball2)
          expect(E.isRight(result)).toBe(true)
          
          if (E.isRight(result)) {
            const { v1, v2 } = result.right
            const finalMomentum = vectorUtils.add(
              vectorUtils.multiply(v1, ball1.mass),
              vectorUtils.multiply(v2, ball2.mass)
            )
            
            expect(finalMomentum.x).toBeCloseTo(initialMomentum.x, 3)
            expect(finalMomentum.y).toBeCloseTo(initialMomentum.y, 3)
          }
        }
      }
    ))
  })
})

describe('Ball Physics Update - Pure Functions', () => {
  test('physics update preserves mass and id', () => {
    const config = physicsUtils.createDefaultConfig()
    
    fc.assert(fc.property(
      dragonBallStateArb,
      fc.array(vectorArb, { maxLength: 3 }),
      fc.integer({ min: 1, max: 10 }).map(x => x / 100),
      (ball, forces, deltaTime) => {
        const result = updateBallPhysics(config)(ball, forces, deltaTime)
        expect(E.isRight(result)).toBe(true)
        
        if (E.isRight(result)) {
          const updatedBall = result.right
          expect(updatedBall.id).toBe(ball.id)
          expect(updatedBall.mass).toBe(ball.mass)
        }
      }
    ))
  })

  test('zero forces and zero time produces no change in position', () => {
    const config = physicsUtils.createDefaultConfig()
    
    fc.assert(fc.property(dragonBallStateArb, (ball) => {
      const result = updateBallPhysics(config)(ball, [], 0)
      expect(E.isRight(result)).toBe(true)
      
      if (E.isRight(result)) {
        const updatedBall = result.right
        expect(updatedBall.position.x).toBeCloseTo(ball.position.x, 10)
        expect(updatedBall.position.y).toBeCloseTo(ball.position.y, 10)
      }
    }))
  })
})

describe('Spatial Grid - Pure Functions', () => {
  test('spatial grid operations are pure', () => {
    const config = {
      cellSize: 50,
      bounds: { minX: -500, minY: -500, maxX: 500, maxY: 500 }
    }
    
    const initialGrid = createSpatialGrid(config)
    const ball: DragonBallState = {
      id: 1,
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      angle: 0,
      angularVelocity: 0,
      orbitRadius: 150,
      orbitEccentricity: 0.1,
      orbitSpeed: 0.02,
      mass: 1,
      isHovered: false,
      isClicked: false,
      trail: []
    }
    
    // Adding ball doesn't mutate original grid
    const gridWithBall = addToSpatialGrid(initialGrid, ball)
    expect(initialGrid.grid.size).toBe(0)
    expect(gridWithBall.grid.size).toBe(1)
    
    // Getting nearby balls doesn't mutate grid
    const nearby = getNearbyBalls(gridWithBall, ball.position)
    expect(gridWithBall.grid.size).toBe(1)
    expect(nearby.length).toBeGreaterThan(0)
    
    // Clearing doesn't mutate original
    const clearedGrid = clearSpatialGrid(gridWithBall)
    expect(gridWithBall.grid.size).toBe(1)
    expect(clearedGrid.grid.size).toBe(0)
  })

  test('nearby balls include the queried position cell', () => {
    const config = {
      cellSize: 100,
      bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
    }
    
    const grid = createSpatialGrid(config)
    const ball: DragonBallState = {
      id: 1,
      position: { x: 150, y: 150 },
      velocity: { x: 0, y: 0 },
      angle: 0,
      angularVelocity: 0,
      orbitRadius: 150,
      orbitEccentricity: 0.1,
      orbitSpeed: 0.02,
      mass: 1,
      isHovered: false,
      isClicked: false,
      trail: []
    }
    
    const gridWithBall = addToSpatialGrid(grid, ball)
    const nearby = getNearbyBalls(gridWithBall, { x: 125, y: 125 })
    
    expect(nearby).toContain(ball)
  })
})

describe('Physics Utils - Pure Functions', () => {
  test('kinetic energy is always non-negative', () => {
    fc.assert(fc.property(dragonBallStateArb, (ball) => {
      const energy = physicsUtils.calculateKineticEnergy(ball)
      expect(energy).toBeGreaterThanOrEqual(0)
    }))
  })

  test('system energy is sum of individual energies', () => {
    fc.assert(fc.property(fc.array(dragonBallStateArb, { maxLength: 5 }), (balls) => {
      const systemEnergy = physicsUtils.calculateSystemEnergy(balls)
      const sumIndividual = balls.reduce((sum, ball) => 
        sum + physicsUtils.calculateKineticEnergy(ball), 0
      )
      expect(systemEnergy).toBeCloseTo(sumIndividual, 10)
    }))
  })

  test('position wrapping maintains bounds', () => {
    const bounds = { width: 800, height: 600 }
    
    fc.assert(fc.property(vectorArb, (position) => {
      const wrapped = physicsUtils.wrapPosition(position, bounds)
      expect(wrapped.x).toBeGreaterThanOrEqual(0)
      expect(wrapped.x).toBeLessThanOrEqual(bounds.width)
      expect(wrapped.y).toBeGreaterThanOrEqual(0)
      expect(wrapped.y).toBeLessThanOrEqual(bounds.height)
    }))
  })

  test('force combination is commutative', () => {
    fc.assert(fc.property(fc.array(vectorArb, { maxLength: 5 }), (forces) => {
      const combined1 = physicsUtils.combineForces(forces)
      const combined2 = physicsUtils.combineForces([...forces].reverse())
      expect(combined1.x).toBeCloseTo(combined2.x, 10)
      expect(combined2.y).toBeCloseTo(combined2.y, 10)
    }))
  })
})