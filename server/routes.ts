/**
 * API Routes - RESTful endpoints for AI GM Assistant
 * 
 * This module defines all HTTP endpoints for the application:
 * - Session management (CRUD operations)
 * - Node management (story elements)
 * - Connection management (relationships)
 * - Timeline event management (session structure)
 * - AI generation endpoints (events and NPCs)
 * 
 * Features:
 * - Comprehensive error handling with appropriate HTTP status codes
 * - Request validation using Zod schemas
 * - Detailed logging for debugging and monitoring
 * - Consistent response formats
 * - Performance monitoring
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, StorageError, NotFoundError, ValidationError, ReferentialIntegrityError } from "./storage";
import { insertSessionSchema, insertNodeSchema, insertConnectionSchema, insertTimelineEventSchema } from "@shared/schema";
import { generateEvent, generateNPC, type EventGenerationContext, type NPCGenerationContext, AIServiceError } from "./services/openai";
import { ZodError } from "zod";

/**
 * Enhanced logging utility for requests
 */
function logRequest(method: string, path: string, startTime: number, statusCode: number, additionalInfo?: string) {
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${path} ${statusCode} - ${duration}ms${additionalInfo ? ` :: ${additionalInfo}` : ''}`);
}

/**
 * Standard error response formatter
 */
function formatErrorResponse(error: Error): { error: string; code?: string; details?: any } {
  if (error instanceof StorageError) {
    return {
      error: error.message,
      code: error.code
    };
  }
  
  if (error instanceof ZodError) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors
    };
  }
  
  if (error instanceof AIServiceError) {
    return {
      error: error.message,
      code: error.code
    };
  }
  
  return {
    error: error.message || 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Get appropriate HTTP status code for error
 */
function getErrorStatusCode(error: Error): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ValidationError) return 400;
  if (error instanceof ReferentialIntegrityError) return 409;
  if (error instanceof ZodError) return 400;
  if (error instanceof AIServiceError) {
    if (error.code === 'AI_VALIDATION_ERROR') return 400;
    return 500;
  }
  return 500;
}

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[Routes] Registering API endpoints...');
  
  /**
   * SESSION MANAGEMENT ENDPOINTS
   * Handle core RPG session operations
   */
  // Create new session
  app.post("/api/sessions", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating session: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(data);
      
      logRequest('POST', '/api/sessions', startTime, 201, `Created session: ${session.name}`);
      res.status(201).json(session);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/sessions', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.id;
    
    try {
      const session = await storage.getSession(sessionId);
      if (!session) {
        logRequest('GET', `/api/sessions/${sessionId}`, startTime, 404, 'Session not found');
        return res.status(404).json({ error: "Session not found", code: 'NOT_FOUND' });
      }
      
      logRequest('GET', `/api/sessions/${sessionId}`, startTime, 200, `Retrieved: ${session.name}`);
      res.json(session);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/sessions/${sessionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Update session
  app.patch("/api/sessions/:id", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.id;
    
    try {
      console.log(`[API] Updating session ${sessionId}: ${JSON.stringify(req.body, null, 2)}`);
      
      const session = await storage.updateSession(sessionId, req.body);
      
      logRequest('PATCH', `/api/sessions/${sessionId}`, startTime, 200, `Updated: ${session.name}`);
      res.json(session);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('PATCH', `/api/sessions/${sessionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete session (with cascade)
  app.delete("/api/sessions/:id", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.id;
    
    try {
      await storage.deleteSession(sessionId);
      
      logRequest('DELETE', `/api/sessions/${sessionId}`, startTime, 200, 'Session deleted with cascade');
      res.json({ success: true, message: 'Session and related data deleted successfully' });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/sessions/${sessionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * NODE MANAGEMENT ENDPOINTS
   * Handle story element operations
   */

  // Get all nodes for a session
  app.get("/api/sessions/:sessionId/nodes", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    
    try {
      const nodes = await storage.getSessionNodes(sessionId);
      
      logRequest('GET', `/api/sessions/${sessionId}/nodes`, startTime, 200, `Retrieved ${nodes.length} nodes`);
      res.json(nodes);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/sessions/${sessionId}/nodes`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Create new node
  app.post("/api/nodes", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating node: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertNodeSchema.parse(req.body);
      const node = await storage.createNode(data);
      
      logRequest('POST', '/api/nodes', startTime, 201, `Created node: ${node.name} (${node.type})`);
      res.status(201).json(node);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/nodes', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Update node
  app.patch("/api/nodes/:id", async (req, res) => {
    const startTime = Date.now();
    const nodeId = req.params.id;
    
    try {
      console.log(`[API] Updating node ${nodeId}: ${JSON.stringify(req.body, null, 2)}`);
      
      const node = await storage.updateNode(nodeId, req.body);
      
      logRequest('PATCH', `/api/nodes/${nodeId}`, startTime, 200, `Updated node: ${node.name}`);
      res.json(node);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('PATCH', `/api/nodes/${nodeId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete node (with cascade to connections)
  app.delete("/api/nodes/:id", async (req, res) => {
    const startTime = Date.now();
    const nodeId = req.params.id;
    
    try {
      await storage.deleteNode(nodeId);
      
      logRequest('DELETE', `/api/nodes/${nodeId}`, startTime, 200, 'Node deleted with cascade');
      res.json({ success: true, message: 'Node and related connections deleted successfully' });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/nodes/${nodeId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * CONNECTION MANAGEMENT ENDPOINTS
   * Handle relationship operations between nodes
   */

  // Get all connections for a session
  app.get("/api/sessions/:sessionId/connections", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    
    try {
      const connections = await storage.getSessionConnections(sessionId);
      
      logRequest('GET', `/api/sessions/${sessionId}/connections`, startTime, 200, `Retrieved ${connections.length} connections`);
      res.json(connections);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/sessions/${sessionId}/connections`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Create new connection
  app.post("/api/connections", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating connection: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(data);
      
      logRequest('POST', '/api/connections', startTime, 201, `Created connection: ${connection.type} (strength ${connection.strength})`);
      res.status(201).json(connection);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/connections', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete connection
  app.delete("/api/connections/:id", async (req, res) => {
    const startTime = Date.now();
    const connectionId = req.params.id;
    
    try {
      await storage.deleteConnection(connectionId);
      
      logRequest('DELETE', `/api/connections/${connectionId}`, startTime, 200, 'Connection deleted');
      res.json({ success: true, message: 'Connection deleted successfully' });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/connections/${connectionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * TIMELINE EVENT MANAGEMENT ENDPOINTS
   * Handle sequential event operations for session structure
   */

  // Get timeline events for a session
  app.get("/api/sessions/:sessionId/timeline", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    
    try {
      const events = await storage.getSessionTimeline(sessionId);
      
      logRequest('GET', `/api/sessions/${sessionId}/timeline`, startTime, 200, `Retrieved ${events.length} timeline events`);
      res.json(events);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/sessions/${sessionId}/timeline`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Create new timeline event
  app.post("/api/timeline-events", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating timeline event: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertTimelineEventSchema.parse(req.body);
      const event = await storage.createTimelineEvent(data);
      
      logRequest('POST', '/api/timeline-events', startTime, 201, `Created event: ${event.name} (${event.phase})`);
      res.status(201).json(event);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/timeline-events', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Update timeline event
  app.patch("/api/timeline-events/:id", async (req, res) => {
    const startTime = Date.now();
    const eventId = req.params.id;
    
    try {
      console.log(`[API] Updating timeline event ${eventId}: ${JSON.stringify(req.body, null, 2)}`);
      
      const event = await storage.updateTimelineEvent(eventId, req.body);
      
      logRequest('PATCH', `/api/timeline-events/${eventId}`, startTime, 200, `Updated event: ${event.name}`);
      res.json(event);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('PATCH', `/api/timeline-events/${eventId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete timeline event
  app.delete("/api/timeline-events/:id", async (req, res) => {
    const startTime = Date.now();
    const eventId = req.params.id;
    
    try {
      await storage.deleteTimelineEvent(eventId);
      
      logRequest('DELETE', `/api/timeline-events/${eventId}`, startTime, 200, 'Timeline event deleted');
      res.json({ success: true, message: 'Timeline event deleted successfully' });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/timeline-events/${eventId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Reorder timeline events
  app.post("/api/sessions/:sessionId/timeline/reorder", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    
    try {
      const { orderedIds } = req.body;
      console.log(`[API] Reordering timeline for session ${sessionId}: ${orderedIds?.length || 0} events`);
      
      if (!Array.isArray(orderedIds)) {
        throw new ValidationError('orderedIds must be an array');
      }
      
      await storage.reorderTimelineEvents(sessionId, orderedIds);
      
      logRequest('POST', `/api/sessions/${sessionId}/timeline/reorder`, startTime, 200, `Reordered ${orderedIds.length} events`);
      res.json({ success: true, message: 'Timeline events reordered successfully' });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', `/api/sessions/${sessionId}/timeline/reorder`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * AI GENERATION ENDPOINTS
   * Handle AI-powered content creation
   */

  // Generate AI-powered event
  app.post("/api/generate-event", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Generating AI event with context: ${JSON.stringify(req.body, null, 2)}`);
      
      const context: EventGenerationContext = req.body;
      const event = await generateEvent(context);
      
      logRequest('POST', '/api/generate-event', startTime, 200, `Generated event: ${event.name} (${event.pacingImpact})`);
      res.json(event);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/generate-event', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Generate AI-powered NPC
  app.post("/api/generate-npc", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Generating AI NPC with context: ${JSON.stringify(req.body, null, 2)}`);
      
      const context: NPCGenerationContext = req.body;
      const npc = await generateNPC(context);
      
      logRequest('POST', '/api/generate-npc', startTime, 200, `Generated NPC: ${npc.name} (${npc.type})`);
      res.json(npc);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/generate-npc', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * UTILITY AND MONITORING ENDPOINTS
   * Health checks and system information
   */

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const stats = await storage.getStorageStats();
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        storage: {
          type: 'memory',
          stats
        },
        services: {
          ai: {
            available: !!process.env.OPENAI_API_KEY,
            model: 'gpt-5'
          }
        }
      };
      
      logRequest('GET', '/api/health', startTime, 200, `Storage: ${Object.values(stats).reduce((a, b) => a + b, 0)} total entities`);
      res.json(healthData);
      
    } catch (error) {
      const errorResponse = formatErrorResponse(error as Error);
      logRequest('GET', '/api/health', startTime, 500, `Health check failed: ${errorResponse.error}`);
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorResponse
      });
    }
  });

  const httpServer = createServer(app);
  
  console.log('[Routes] All API endpoints registered successfully');
  console.log('[Routes] Available endpoints:');
  console.log('  - POST   /api/sessions');
  console.log('  - GET    /api/sessions/:id');
  console.log('  - PATCH  /api/sessions/:id');
  console.log('  - DELETE /api/sessions/:id');
  console.log('  - GET    /api/sessions/:sessionId/nodes');
  console.log('  - POST   /api/nodes');
  console.log('  - PATCH  /api/nodes/:id');
  console.log('  - DELETE /api/nodes/:id');
  console.log('  - GET    /api/sessions/:sessionId/connections');
  console.log('  - POST   /api/connections');
  console.log('  - DELETE /api/connections/:id');
  console.log('  - GET    /api/sessions/:sessionId/timeline');
  console.log('  - POST   /api/timeline-events');
  console.log('  - PATCH  /api/timeline-events/:id');
  console.log('  - DELETE /api/timeline-events/:id');
  console.log('  - POST   /api/sessions/:sessionId/timeline/reorder');
  console.log('  - POST   /api/generate-event');
  console.log('  - POST   /api/generate-npc');
  console.log('  - GET    /api/health');
  
  return httpServer;
}
