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
import { insertSessionSchema, insertNodeSchema, insertConnectionSchema, insertTimelineEventSchema, insertScenarioSchema, insertRegionSchema, insertScenarioSessionSchema } from "@shared/schema";
import { generateEvent, generateNPC, type EventGenerationContext, type NPCGenerationContext, AIServiceError } from "./services/openai";
import { exportScenariosToExcel, importScenariosFromExcel, validateImportedData } from "./services/excel";
import { ZodError } from "zod";
import multer from "multer";

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
   * SCENARIO MANAGEMENT ENDPOINTS
   * High-level scenario and world-building operations
   */

  // Get all scenarios for a user
  app.get("/api/scenarios", async (req, res) => {
    const startTime = Date.now();
    const userId = req.query.userId as string;
    
    try {
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter is required", code: 'MISSING_PARAMETER' });
      }

      const scenarios = await storage.getUserScenarios(userId);
      
      logRequest('GET', '/api/scenarios', startTime, 200, `Retrieved ${scenarios.length} scenarios for user ${userId}`);
      res.json(scenarios);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', '/api/scenarios', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Export scenarios to Excel (must be before :id route)
  app.get("/api/scenarios/export", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { userId } = req.query;
      console.log(`[API] Exporting scenarios for user: ${userId || 'all'}`);
      
      // Fetch all scenarios for the user (or all if no userId)
      const scenarios = await storage.getUserScenarios(userId as string || 'demo-user');
      
      // Fetch all regions for these scenarios
      const allRegions = [];
      for (const scenario of scenarios) {
        const regions = await storage.getScenarioRegions(scenario.id);
        allRegions.push(...regions);
      }
      
      // Generate Excel file
      const excelBuffer = exportScenariosToExcel(scenarios, allRegions);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="scenarios_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      logRequest('GET', '/api/scenarios/export', startTime, 200, `Exported ${scenarios.length} scenarios, ${allRegions.length} regions`);
      res.send(excelBuffer);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', '/api/scenarios/export', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Get single scenario
  app.get("/api/scenarios/:id", async (req, res) => {
    const startTime = Date.now();
    const scenarioId = req.params.id;
    
    try {
      const scenario = await storage.getScenario(scenarioId);
      if (!scenario) {
        logRequest('GET', `/api/scenarios/${scenarioId}`, startTime, 404, 'Scenario not found');
        return res.status(404).json({ error: "Scenario not found", code: 'NOT_FOUND' });
      }
      
      logRequest('GET', `/api/scenarios/${scenarioId}`, startTime, 200, `Retrieved: ${scenario.title}`);
      res.json(scenario);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/scenarios/${scenarioId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Create new scenario
  app.post("/api/scenarios", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating scenario: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertScenarioSchema.parse(req.body);
      const scenario = await storage.createScenario(data);
      
      logRequest('POST', '/api/scenarios', startTime, 201, `Created scenario: ${scenario.title}`);
      res.status(201).json(scenario);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/scenarios', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Update scenario
  app.patch("/api/scenarios/:id", async (req, res) => {
    const startTime = Date.now();
    const scenarioId = req.params.id;
    
    try {
      console.log(`[API] Updating scenario ${scenarioId}: ${JSON.stringify(req.body, null, 2)}`);
      
      const scenario = await storage.updateScenario(scenarioId, req.body);
      
      logRequest('PATCH', `/api/scenarios/${scenarioId}`, startTime, 200, `Updated: ${scenario.title}`);
      res.json(scenario);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('PATCH', `/api/scenarios/${scenarioId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete scenario
  app.delete("/api/scenarios/:id", async (req, res) => {
    const startTime = Date.now();
    const scenarioId = req.params.id;
    
    try {
      await storage.deleteScenario(scenarioId);
      
      logRequest('DELETE', `/api/scenarios/${scenarioId}`, startTime, 204, 'Scenario deleted');
      res.status(204).send();
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/scenarios/${scenarioId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * REGION MANAGEMENT ENDPOINTS
   * Geographic and political area operations
   */

  // Get all regions for a scenario
  app.get("/api/scenarios/:scenarioId/regions", async (req, res) => {
    const startTime = Date.now();
    const scenarioId = req.params.scenarioId;
    
    try {
      const regions = await storage.getScenarioRegions(scenarioId);
      
      logRequest('GET', `/api/scenarios/${scenarioId}/regions`, startTime, 200, `Retrieved ${regions.length} regions`);
      res.json(regions);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/scenarios/${scenarioId}/regions`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Get single region
  app.get("/api/regions/:id", async (req, res) => {
    const startTime = Date.now();
    const regionId = req.params.id;
    
    try {
      const region = await storage.getRegion(regionId);
      if (!region) {
        logRequest('GET', `/api/regions/${regionId}`, startTime, 404, 'Region not found');
        return res.status(404).json({ error: "Region not found", code: 'NOT_FOUND' });
      }
      
      logRequest('GET', `/api/regions/${regionId}`, startTime, 200, `Retrieved: ${region.name}`);
      res.json(region);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/regions/${regionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Create new region
  app.post("/api/regions", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log(`[API] Creating region: ${JSON.stringify(req.body, null, 2)}`);
      
      const data = insertRegionSchema.parse(req.body);
      const region = await storage.createRegion(data);
      
      logRequest('POST', '/api/regions', startTime, 201, `Created region: ${region.name} (${region.type})`);
      res.status(201).json(region);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/regions', startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Update region
  app.patch("/api/regions/:id", async (req, res) => {
    const startTime = Date.now();
    const regionId = req.params.id;
    
    try {
      console.log(`[API] Updating region ${regionId}: ${JSON.stringify(req.body, null, 2)}`);
      
      const region = await storage.updateRegion(regionId, req.body);
      
      logRequest('PATCH', `/api/regions/${regionId}`, startTime, 200, `Updated: ${region.name}`);
      res.json(region);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('PATCH', `/api/regions/${regionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Delete region
  app.delete("/api/regions/:id", async (req, res) => {
    const startTime = Date.now();
    const regionId = req.params.id;
    
    try {
      await storage.deleteRegion(regionId);
      
      logRequest('DELETE', `/api/regions/${regionId}`, startTime, 204, 'Region deleted');
      res.status(204).send();
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/regions/${regionId}`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * SCENARIO-SESSION LINKING ENDPOINTS
   * Many-to-many relationship management
   */

  // Get scenarios linked to a session
  app.get("/api/sessions/:sessionId/scenarios", async (req, res) => {
    const startTime = Date.now();
    const sessionId = req.params.sessionId;
    
    try {
      const scenarios = await storage.getSessionScenarios(sessionId);
      
      logRequest('GET', `/api/sessions/${sessionId}/scenarios`, startTime, 200, `Retrieved ${scenarios.length} scenarios`);
      res.json(scenarios);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/sessions/${sessionId}/scenarios`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Get sessions linked to a scenario
  app.get("/api/scenarios/:scenarioId/sessions", async (req, res) => {
    const startTime = Date.now();
    const scenarioId = req.params.scenarioId;
    
    try {
      const sessions = await storage.getScenarioSessions(scenarioId);
      
      logRequest('GET', `/api/scenarios/${scenarioId}/sessions`, startTime, 200, `Retrieved ${sessions.length} sessions`);
      res.json(sessions);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('GET', `/api/scenarios/${scenarioId}/sessions`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Link scenario to session
  app.post("/api/scenarios/:scenarioId/sessions/:sessionId/link", async (req, res) => {
    const startTime = Date.now();
    const { scenarioId, sessionId } = req.params;
    
    try {
      console.log(`[API] Linking scenario ${scenarioId} to session ${sessionId}`);
      
      const link = await storage.linkScenarioToSession(scenarioId, sessionId);
      
      logRequest('POST', `/api/scenarios/${scenarioId}/sessions/${sessionId}/link`, startTime, 201, 'Linked successfully');
      res.status(201).json(link);
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', `/api/scenarios/${scenarioId}/sessions/${sessionId}/link`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  // Unlink scenario from session
  app.delete("/api/scenarios/:scenarioId/sessions/:sessionId/link", async (req, res) => {
    const startTime = Date.now();
    const { scenarioId, sessionId } = req.params;
    
    try {
      console.log(`[API] Unlinking scenario ${scenarioId} from session ${sessionId}`);
      
      await storage.unlinkScenarioFromSession(scenarioId, sessionId);
      
      logRequest('DELETE', `/api/scenarios/${scenarioId}/sessions/${sessionId}/link`, startTime, 204, 'Unlinked successfully');
      res.status(204).send();
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('DELETE', `/api/scenarios/${scenarioId}/sessions/${sessionId}/link`, startTime, statusCode, `Error: ${errorResponse.error}`);
      res.status(statusCode).json(errorResponse);
    }
  });

  /**
   * IMPORT/EXPORT ENDPOINTS
   * Excel file operations for scenarios and regions
   */

  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed'));
      }
    }
  });


  // Import scenarios from Excel
  app.post("/api/scenarios/import", upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }
      
      console.log(`[API] Importing scenarios from file: ${req.file.originalname}`);
      
      // Parse Excel file
      const importedData = importScenariosFromExcel(req.file.buffer);
      
      // Validate imported data
      const validation = validateImportedData(importedData);
      if (!validation.isValid) {
        logRequest('POST', '/api/scenarios/import', startTime, 400, `Validation failed: ${validation.errors.length} errors`);
        return res.status(400).json({
          error: 'Import validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors
        });
      }
      
      // Import scenarios
      const importedScenarios = [];
      const scenarioIdMap = new Map<string, string>(); // old ID -> new ID mapping
      
      for (const scenarioData of importedData.scenarios) {
        try {
          const scenario = await storage.createScenario({
            ...scenarioData,
            status: (scenarioData.status as 'draft' | 'active' | 'completed' | 'archived') || 'draft',
            keyThemes: Array.isArray(scenarioData.keyThemes) ? scenarioData.keyThemes : [],
            userId: req.body.userId || 'demo-user'
          });
          importedScenarios.push(scenario);
          
          // For regions that reference scenario IDs, we need to map them
          const originalId = scenarioData.title; // Use title as temporary mapping
          scenarioIdMap.set(originalId, scenario.id);
        } catch (error) {
          console.warn(`Failed to import scenario: ${scenarioData.title}`, error);
        }
      }
      
      // Import regions
      const importedRegions = [];
      for (const regionData of importedData.regions) {
        try {
          // Find matching scenario for this region
          let scenarioId = regionData.scenarioId;
          if (!scenarioId && importedScenarios.length > 0) {
            // If no scenario ID specified, assign to first imported scenario
            scenarioId = importedScenarios[0].id;
          }
          
          const region = await storage.createRegion({
            ...regionData,
            type: regionData.type as 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub',
            description: regionData.description || undefined,
            controllingFaction: regionData.controllingFaction || undefined,
            population: regionData.population || undefined,
            resources: Array.isArray(regionData.resources) ? regionData.resources : undefined,
            threatLevel: regionData.threatLevel || 1,
            politicalStance: (regionData.politicalStance as 'hostile' | 'neutral' | 'friendly' | 'allied') || undefined,
            tradeRoutes: Array.isArray(regionData.tradeRoutes) ? regionData.tradeRoutes : undefined,
            scenarioId
          });
          importedRegions.push(region);
        } catch (error) {
          console.warn(`Failed to import region: ${regionData.name}`, error);
        }
      }
      
      logRequest('POST', '/api/scenarios/import', startTime, 201, `Imported ${importedScenarios.length} scenarios, ${importedRegions.length} regions`);
      res.status(201).json({
        success: true,
        imported: {
          scenarios: importedScenarios.length,
          regions: importedRegions.length
        },
        scenarios: importedScenarios,
        regions: importedRegions
      });
      
    } catch (error) {
      const statusCode = getErrorStatusCode(error as Error);
      const errorResponse = formatErrorResponse(error as Error);
      
      logRequest('POST', '/api/scenarios/import', startTime, statusCode, `Error: ${errorResponse.error}`);
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
  console.log('  - GET    /api/scenarios');
  console.log('  - GET    /api/scenarios/:id');
  console.log('  - POST   /api/scenarios');
  console.log('  - PATCH  /api/scenarios/:id');
  console.log('  - DELETE /api/scenarios/:id');
  console.log('  - GET    /api/scenarios/:scenarioId/regions');
  console.log('  - GET    /api/regions/:id');
  console.log('  - POST   /api/regions');
  console.log('  - PATCH  /api/regions/:id');
  console.log('  - DELETE /api/regions/:id');
  console.log('  - GET    /api/sessions/:sessionId/scenarios');
  console.log('  - GET    /api/scenarios/:scenarioId/sessions');
  console.log('  - POST   /api/scenarios/:scenarioId/sessions/:sessionId/link');
  console.log('  - DELETE /api/scenarios/:scenarioId/sessions/:sessionId/link');
  console.log('  - GET    /api/scenarios/export');
  console.log('  - POST   /api/scenarios/import');
  console.log('  - GET    /api/health');
  
  return httpServer;
}
