import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import * as E from 'fp-ts/Either'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiting configuration
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute for memory operations
  analytics: true,
})

// Memory node schema
const memoryNodeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['entity', 'concept', 'action', 'preference', 'context']),
  name: z.string().min(1).max(200),
  content: z.string().max(2000),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(0).max(1).optional().default(0.5),
})

// Memory relation schema
const memoryRelationSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['relates_to', 'causes', 'prevents', 'requires', 'prefers', 'dislikes']),
  strength: z.number().min(0).max(1).optional().default(0.5),
  metadata: z.record(z.any()).optional(),
})

// Update memory request schema
const updateMemorySchema = z.object({
  nodes: z.array(memoryNodeSchema).optional(),
  relations: z.array(memoryRelationSchema).optional(),
  operation: z.enum(['add', 'update', 'merge']).optional().default('merge'),
})

// Delete memory request schema
const deleteMemorySchema = z.object({
  nodeIds: z.array(z.string()).optional(),
  relationIds: z.array(z.string()).optional(),
  scope: z.enum(['specific', 'related', 'all']).optional().default('specific'),
  preserveImportant: z.boolean().optional().default(true),
})

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self';",
}

// Helper to get user memory graph
async function getUserMemoryGraph(userId: string): Promise<E.Either<Error, any>> {
  try {
    // Get all memory nodes for user
    const { data: nodes, error: nodesError } = await supabase
      .from('memory_nodes')
      .select('*')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
    
    if (nodesError) {
      return E.left(new Error(`Failed to fetch memory nodes: ${nodesError.message}`))
    }
    
    // Get all relations between user's nodes
    const nodeIds = nodes?.map(n => n.id) || []
    
    if (nodeIds.length === 0) {
      return E.right({ nodes: [], relations: [], stats: { nodeCount: 0, relationCount: 0 } })
    }
    
    const { data: relations, error: relationsError } = await supabase
      .from('memory_relations')
      .select('*')
      .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)
    
    if (relationsError) {
      return E.left(new Error(`Failed to fetch memory relations: ${relationsError.message}`))
    }
    
    // Build memory graph structure
    const graph = {
      nodes: nodes || [],
      relations: relations || [],
      stats: {
        nodeCount: nodes?.length || 0,
        relationCount: relations?.length || 0,
        avgImportance: nodes?.reduce((sum, n) => sum + n.importance, 0) / (nodes?.length || 1),
        typeDistribution: nodes?.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      },
      lastUpdated: new Date().toISOString(),
    }
    
    return E.right(graph)
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper to add memory nodes
async function addMemoryNodes(userId: string, nodes: any[]): Promise<E.Either<Error, any[]>> {
  try {
    const nodesWithUser = nodes.map(node => ({
      ...node,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    
    const { data, error } = await supabase
      .from('memory_nodes')
      .insert(nodesWithUser)
      .select()
    
    if (error) {
      return E.left(new Error(`Failed to add memory nodes: ${error.message}`))
    }
    
    return E.right(data || [])
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper to add memory relations
async function addMemoryRelations(userId: string, relations: any[]): Promise<E.Either<Error, any[]>> {
  try {
    const relationsWithMeta = relations.map(rel => ({
      ...rel,
      from_node_id: rel.from,
      to_node_id: rel.to,
      created_at: new Date().toISOString(),
    }))
    
    const { data, error } = await supabase
      .from('memory_relations')
      .insert(relationsWithMeta)
      .select()
    
    if (error) {
      return E.left(new Error(`Failed to add memory relations: ${error.message}`))
    }
    
    return E.right(data || [])
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// Helper to delete memory nodes and relations
async function deleteMemoryData(
  userId: string,
  nodeIds?: string[],
  relationIds?: string[],
  scope: string = 'specific',
  preserveImportant: boolean = true
): Promise<E.Either<Error, { deletedNodes: number; deletedRelations: number }>> {
  try {
    let deletedNodes = 0
    let deletedRelations = 0
    
    // Delete specific nodes
    if (nodeIds && nodeIds.length > 0) {
      let query = supabase
        .from('memory_nodes')
        .delete()
        .eq('user_id', userId)
        .in('id', nodeIds)
      
      if (preserveImportant) {
        query = query.lt('importance', 0.8) // Preserve highly important memories
      }
      
      const { error, count } = await query
      
      if (error) {
        return E.left(new Error(`Failed to delete memory nodes: ${error.message}`))
      }
      
      deletedNodes = count || 0
      
      // Delete related relations if scope is 'related'
      if (scope === 'related') {
        const { error: relError, count: relCount } = await supabase
          .from('memory_relations')
          .delete()
          .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)
        
        if (relError) {
          return E.left(new Error(`Failed to delete related relations: ${relError.message}`))
        }
        
        deletedRelations = relCount || 0
      }
    }
    
    // Delete specific relations
    if (relationIds && relationIds.length > 0) {
      const { error, count } = await supabase
        .from('memory_relations')
        .delete()
        .in('id', relationIds)
      
      if (error) {
        return E.left(new Error(`Failed to delete memory relations: ${error.message}`))
      }
      
      deletedRelations += count || 0
    }
    
    // Delete all memories if scope is 'all'
    if (scope === 'all' && !nodeIds && !relationIds) {
      // Delete all relations first
      // First get all node IDs for the user
      const { data: userNodes, error: nodesFetchError } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('user_id', userId)
      
      if (nodesFetchError) {
        console.error('Failed to fetch user nodes:', nodesFetchError)
      }
      
      const nodeIds = userNodes?.map(n => n.id) || []
      
      let relCount = 0
      if (nodeIds.length > 0) {
        const { error: relError, count } = await supabase
          .from('memory_relations')
          .delete()
          .or(`from_node_id.in.(${nodeIds.join(',')}),to_node_id.in.(${nodeIds.join(',')})`)
        
        if (relError) {
          console.error('Failed to delete all relations:', relError)
        }
        relCount = count || 0
      }
      
      deletedRelations = relCount
      
      // Delete all nodes
      let nodeQuery = supabase
        .from('memory_nodes')
        .delete()
        .eq('user_id', userId)
      
      if (preserveImportant) {
        nodeQuery = nodeQuery.lt('importance', 0.8)
      }
      
      const { error: nodeError, count: nodeCount } = await nodeQuery
      
      if (nodeError) {
        return E.left(new Error(`Failed to delete all memory nodes: ${nodeError.message}`))
      }
      
      deletedNodes = nodeCount || 0
    }
    
    return E.right({ deletedNodes, deletedRelations })
  } catch (error) {
    return E.left(error instanceof Error ? error : new Error('Unknown error'))
  }
}

// GET handler - retrieve user memory graph
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    const userId = token.sub
    
    // Rate limiting
    const { success, limit, reset, remaining } = await ratelimit.limit(userId)
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit,
          reset,
          remaining 
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          }
        }
      )
    }
    
    // Get memory graph
    const result = await getUserMemoryGraph(userId)
    
    if (E.isLeft(result)) {
      return NextResponse.json(
        { error: 'Failed to retrieve memory graph', details: result.left.message },
        { status: 500, headers: securityHeaders }
      )
    }
    
    return NextResponse.json(
      { success: true, data: result.right },
      { headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// POST handler - update memory graph
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    const userId = token.sub
    
    // Rate limiting
    const { success, limit, reset, remaining } = await ratelimit.limit(userId)
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit,
          reset,
          remaining 
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          }
        }
      )
    }
    
    // Parse and validate request body
    const body = await req.json()
    const validationResult = updateMemorySchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400, headers: securityHeaders }
      )
    }
    
    const { nodes, relations, operation } = validationResult.data
    
    const results = {
      addedNodes: [] as any[],
      addedRelations: [] as any[],
      errors: [] as string[],
    }
    
    // Add memory nodes
    if (nodes && nodes.length > 0) {
      const nodeResult = await addMemoryNodes(userId, nodes)
      if (E.isLeft(nodeResult)) {
        results.errors.push(nodeResult.left.message)
      } else {
        results.addedNodes = nodeResult.right
      }
    }
    
    // Add memory relations
    if (relations && relations.length > 0) {
      const relationResult = await addMemoryRelations(userId, relations)
      if (E.isLeft(relationResult)) {
        results.errors.push(relationResult.left.message)
      } else {
        results.addedRelations = relationResult.right
      }
    }
    
    // Return results
    const isSuccess = results.errors.length === 0
    
    return NextResponse.json(
      {
        success: isSuccess,
        data: results,
        ...(results.errors.length > 0 && { errors: results.errors })
      },
      { status: isSuccess ? 200 : 207, headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Memory POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// DELETE handler - forget memories
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token || !token.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    const userId = token.sub
    
    // Rate limiting
    const { success, limit, reset, remaining } = await ratelimit.limit(userId)
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          limit,
          reset,
          remaining 
        },
        { 
          status: 429,
          headers: {
            ...securityHeaders,
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          }
        }
      )
    }
    
    // Parse and validate request body
    const body = await req.json()
    const validationResult = deleteMemorySchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400, headers: securityHeaders }
      )
    }
    
    const { nodeIds, relationIds, scope, preserveImportant } = validationResult.data
    
    // Delete memory data
    const result = await deleteMemoryData(userId, nodeIds, relationIds, scope, preserveImportant)
    
    if (E.isLeft(result)) {
      return NextResponse.json(
        { error: 'Failed to delete memories', details: result.left.message },
        { status: 500, headers: securityHeaders }
      )
    }
    
    return NextResponse.json(
      {
        success: true,
        data: {
          ...result.right,
          message: 'Memories forgotten successfully',
          scope,
          preservedImportant: preserveImportant,
        }
      },
      { headers: securityHeaders }
    )
    
  } catch (error) {
    console.error('Memory DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...securityHeaders,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}