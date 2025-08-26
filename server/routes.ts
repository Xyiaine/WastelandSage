import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertNodeSchema, insertConnectionSchema, insertTimelineEventSchema } from "@shared/schema";
import { generateEvent, generateNPC, type EventGenerationContext } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Sessions
  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(data);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSession(req.params.id, req.body);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Nodes
  app.get("/api/sessions/:sessionId/nodes", async (req, res) => {
    try {
      const nodes = await storage.getSessionNodes(req.params.sessionId);
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/nodes", async (req, res) => {
    try {
      const data = insertNodeSchema.parse(req.body);
      const node = await storage.createNode(data);
      res.json(node);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/nodes/:id", async (req, res) => {
    try {
      const node = await storage.updateNode(req.params.id, req.body);
      res.json(node);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/nodes/:id", async (req, res) => {
    try {
      await storage.deleteNode(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Connections
  app.get("/api/sessions/:sessionId/connections", async (req, res) => {
    try {
      const connections = await storage.getSessionConnections(req.params.sessionId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/connections", async (req, res) => {
    try {
      const data = insertConnectionSchema.parse(req.body);
      const connection = await storage.createConnection(data);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/connections/:id", async (req, res) => {
    try {
      await storage.deleteConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Timeline Events
  app.get("/api/sessions/:sessionId/timeline", async (req, res) => {
    try {
      const events = await storage.getSessionTimeline(req.params.sessionId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/timeline-events", async (req, res) => {
    try {
      const data = insertTimelineEventSchema.parse(req.body);
      const event = await storage.createTimelineEvent(data);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/timeline-events/:id", async (req, res) => {
    try {
      const event = await storage.updateTimelineEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/timeline-events/:id", async (req, res) => {
    try {
      await storage.deleteTimelineEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/sessions/:sessionId/timeline/reorder", async (req, res) => {
    try {
      const { orderedIds } = req.body;
      await storage.reorderTimelineEvents(req.params.sessionId, orderedIds);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // AI Generation
  app.post("/api/generate-event", async (req, res) => {
    try {
      const context: EventGenerationContext = req.body;
      const event = await generateEvent(context);
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/generate-npc", async (req, res) => {
    try {
      const context = req.body;
      const npc = await generateNPC(context);
      res.json(npc);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
