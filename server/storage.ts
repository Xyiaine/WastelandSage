/**
 * Storage Layer - Abstracted data persistence with in-memory implementation
 * 
 * This module provides:
 * - Storage interface abstraction for easy database swapping
 * - In-memory implementation for development and testing
 * - Comprehensive error handling and validation
 * - Referential integrity enforcement
 * - Optimized query patterns
 * 
 * Design Patterns:
 * - Repository pattern for data access
 * - Error-first callback approach
 * - Defensive programming with null checks
 * - Cascade deletion for referential integrity
 */

import { 
  type User, 
  type InsertUser, 
  type Session, 
  type InsertSession,
  type Node,
  type InsertNode,
  type Connection,
  type InsertConnection,
  type TimelineEvent,
  type InsertTimelineEvent
} from "@shared/schema";
import { randomUUID } from "crypto";

/**
 * Custom error classes for better error handling
 */
export class StorageError extends Error {
  constructor(message: string, public code: string = 'STORAGE_ERROR') {
    super(message);
    this.name = 'StorageError';
  }
}

export class NotFoundError extends StorageError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID '${id}' not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends StorageError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ReferentialIntegrityError extends StorageError {
  constructor(message: string) {
    super(message, 'REFERENTIAL_INTEGRITY_ERROR');
    this.name = 'ReferentialIntegrityError';
  }
}

/**
 * Storage interface - Abstraction layer for data persistence
 * 
 * This interface allows easy swapping between storage implementations:
 * - MemStorage: In-memory for development/testing
 * - PostgresStorage: Production database implementation
 * - RedisStorage: Cache layer for performance
 * 
 * All methods include comprehensive error handling and return promises
 * for consistent async behavior across implementations.
 */
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session management with cascade operations
  getSession(id: string): Promise<Session | undefined>;
  getUserSessions(userId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: string): Promise<void>; // Cascades to related entities
  
  // Node management with session validation
  getSessionNodes(sessionId: string): Promise<Node[]>;
  getNode(id: string): Promise<Node | undefined>;
  createNode(node: InsertNode): Promise<Node>;
  updateNode(id: string, updates: Partial<Node>): Promise<Node>;
  deleteNode(id: string): Promise<void>; // Cascades to connections
  
  // Connection management with referential integrity
  getSessionConnections(sessionId: string): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  deleteConnection(id: string): Promise<void>;
  
  // Timeline event management with ordering
  getSessionTimeline(sessionId: string): Promise<TimelineEvent[]>;
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
  updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent>;
  deleteTimelineEvent(id: string): Promise<void>;
  reorderTimelineEvents(sessionId: string, orderedIds: string[]): Promise<void>;
  
  // Utility methods for optimization
  getStorageStats(): Promise<{
    users: number;
    sessions: number;
    nodes: number;
    connections: number;
    timelineEvents: number;
  }>;
}

/**
 * In-Memory Storage Implementation
 * 
 * Provides fast, lightweight storage for development and testing.
 * Features:
 * - Map-based storage for O(1) lookups
 * - Referential integrity enforcement
 * - Cascade deletion operations
 * - Input validation and error handling
 * - Memory-efficient filtering operations
 * 
 * Note: Data is lost on restart - use PostgresStorage for production
 */
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private nodes: Map<string, Node>;
  private connections: Map<string, Connection>;
  private timelineEvents: Map<string, TimelineEvent>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.nodes = new Map();
    this.connections = new Map();
    this.timelineEvents = new Map();
    
    // Log initialization for debugging
    console.log('[MemStorage] Initialized with empty collections');
  }

  /**
   * Input validation helper - ensures IDs are valid UUIDs
   */
  private validateId(id: string, context: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`Invalid ID provided for ${context}: '${id}'`);
    }
    
    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn(`[MemStorage] ID '${id}' does not match UUID format for ${context}`);
    }
  }

  /**
   * Check if a session exists - used for referential integrity
   */
  private async validateSessionExists(sessionId: string): Promise<void> {
    if (sessionId && !this.sessions.has(sessionId)) {
      throw new ReferentialIntegrityError(`Session '${sessionId}' does not exist`);
    }
  }

  /**
   * Check if nodes exist - used for connection validation
   */
  private async validateNodesExist(fromNodeId?: string, toNodeId?: string): Promise<void> {
    if (fromNodeId && !this.nodes.has(fromNodeId)) {
      throw new ReferentialIntegrityError(`From node '${fromNodeId}' does not exist`);
    }
    if (toNodeId && !this.nodes.has(toNodeId)) {
      throw new ReferentialIntegrityError(`To node '${toNodeId}' does not exist`);
    }
  }

  /**
   * USER OPERATIONS
   * Handles user authentication and management
   */

  async getUser(id: string): Promise<User | undefined> {
    try {
      this.validateId(id, 'getUser');
      const user = this.users.get(id);
      
      if (user) {
        console.log(`[MemStorage] Retrieved user: ${user.username}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[MemStorage] Error getting user '${id}':`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new ValidationError('Username cannot be empty');
      }

      const user = Array.from(this.users.values()).find(
        (user) => user.username.toLowerCase() === username.toLowerCase(),
      );
      
      if (user) {
        console.log(`[MemStorage] Found user by username: ${username}`);
      }
      
      return user;
    } catch (error) {
      console.error(`[MemStorage] Error getting user by username '${username}':`, error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Validate input
      if (!insertUser.username || !insertUser.password) {
        throw new ValidationError('Username and password are required');
      }

      // Check for duplicate username
      const existingUser = await this.getUserByUsername(insertUser.username);
      if (existingUser) {
        throw new ValidationError(`Username '${insertUser.username}' already exists`);
      }

      const id = randomUUID();
      const user: User = { ...insertUser, id };
      this.users.set(id, user);
      
      console.log(`[MemStorage] Created user: ${user.username} (${id})`);
      return user;
    } catch (error) {
      console.error('[MemStorage] Error creating user:', error);
      throw error;
    }
  }

  /**
   * SESSION OPERATIONS
   * Core RPG session management with cascade operations
   */

  async getSession(id: string): Promise<Session | undefined> {
    try {
      this.validateId(id, 'getSession');
      const session = this.sessions.get(id);
      
      if (session) {
        console.log(`[MemStorage] Retrieved session: ${session.name} (${session.creatorMode} mode)`);
      }
      
      return session;
    } catch (error) {
      console.error(`[MemStorage] Error getting session '${id}':`, error);
      throw error;
    }
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      this.validateId(userId, 'getUserSessions');
      
      const sessions = Array.from(this.sessions.values()).filter(
        session => session.userId === userId
      );
      
      console.log(`[MemStorage] Found ${sessions.length} sessions for user ${userId}`);
      return sessions.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting sessions for user '${userId}':`, error);
      throw error;
    }
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    try {
      // Validate required fields
      if (!insertSession.name || insertSession.name.trim() === '') {
        throw new ValidationError('Session name is required');
      }
      
      if (!insertSession.creatorMode || !['road', 'city'].includes(insertSession.creatorMode)) {
        throw new ValidationError('Creator mode must be either "road" or "city"');
      }

      // Validate user exists if provided
      if (insertSession.userId) {
        const user = await this.getUser(insertSession.userId);
        if (!user) {
          throw new ReferentialIntegrityError(`User '${insertSession.userId}' does not exist`);
        }
      }

      const id = randomUUID();
      const now = new Date();
      const session: Session = { 
        ...insertSession, 
        id,
        userId: insertSession.userId ?? null,
        currentPhase: Math.max(0, Math.min(4, insertSession.currentPhase ?? 0)), // Clamp to 0-4
        duration: Math.max(0, insertSession.duration ?? 0), // Ensure non-negative
        aiMode: insertSession.aiMode ?? "continuity",
        createdAt: now,
        updatedAt: now
      };
      
      this.sessions.set(id, session);
      console.log(`[MemStorage] Created session: ${session.name} (${id})`);
      return session;
    } catch (error) {
      console.error('[MemStorage] Error creating session:', error);
      throw error;
    }
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    try {
      this.validateId(id, 'updateSession');
      
      const session = this.sessions.get(id);
      if (!session) {
        throw new NotFoundError('Session', id);
      }

      // Validate updates
      if (updates.currentPhase !== undefined) {
        updates.currentPhase = Math.max(0, Math.min(4, updates.currentPhase));
      }
      
      if (updates.duration !== undefined) {
        updates.duration = Math.max(0, updates.duration);
      }
      
      if (updates.creatorMode && !['road', 'city'].includes(updates.creatorMode)) {
        throw new ValidationError('Creator mode must be either "road" or "city"');
      }
      
      if (updates.aiMode && !['chaos', 'continuity'].includes(updates.aiMode)) {
        throw new ValidationError('AI mode must be either "chaos" or "continuity"');
      }

      const updatedSession = { 
        ...session, 
        ...updates,
        id, // Prevent ID changes
        updatedAt: new Date()
      };
      
      this.sessions.set(id, updatedSession);
      console.log(`[MemStorage] Updated session: ${updatedSession.name} (${id})`);
      return updatedSession;
    } catch (error) {
      console.error(`[MemStorage] Error updating session '${id}':`, error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteSession');
      
      const session = this.sessions.get(id);
      if (!session) {
        throw new NotFoundError('Session', id);
      }

      // Cascade delete related entities
      const deletedNodes: string[] = [];
      const deletedConnections: string[] = [];
      const deletedEvents: string[] = [];
      
      // Delete nodes
      Array.from(this.nodes.entries())
        .filter(([_, node]) => node.sessionId === id)
        .forEach(([nodeId]) => {
          this.nodes.delete(nodeId);
          deletedNodes.push(nodeId);
        });
      
      // Delete connections
      Array.from(this.connections.entries())
        .filter(([_, conn]) => conn.sessionId === id)
        .forEach(([connId]) => {
          this.connections.delete(connId);
          deletedConnections.push(connId);
        });
        
      // Delete timeline events
      Array.from(this.timelineEvents.entries())
        .filter(([_, event]) => event.sessionId === id)
        .forEach(([eventId]) => {
          this.timelineEvents.delete(eventId);
          deletedEvents.push(eventId);
        });
      
      // Finally delete the session
      this.sessions.delete(id);
      
      console.log(`[MemStorage] Deleted session ${session.name} and cascaded: ${deletedNodes.length} nodes, ${deletedConnections.length} connections, ${deletedEvents.length} events`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting session '${id}':`, error);
      throw error;
    }
  }

  /**
   * NODE OPERATIONS
   * Manages story elements (events, NPCs, factions, locations, items)
   */

  async getSessionNodes(sessionId: string): Promise<Node[]> {
    try {
      this.validateId(sessionId, 'getSessionNodes');
      await this.validateSessionExists(sessionId);
      
      const nodes = Array.from(this.nodes.values()).filter(
        node => node.sessionId === sessionId
      );
      
      console.log(`[MemStorage] Found ${nodes.length} nodes for session ${sessionId}`);
      return nodes.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting nodes for session '${sessionId}':`, error);
      throw error;
    }
  }

  async getNode(id: string): Promise<Node | undefined> {
    try {
      this.validateId(id, 'getNode');
      const node = this.nodes.get(id);
      
      if (node) {
        console.log(`[MemStorage] Retrieved node: ${node.name} (${node.type})`);
      }
      
      return node;
    } catch (error) {
      console.error(`[MemStorage] Error getting node '${id}':`, error);
      throw error;
    }
  }

  async createNode(insertNode: InsertNode): Promise<Node> {
    try {
      // Validate required fields
      if (!insertNode.name || insertNode.name.trim() === '') {
        throw new ValidationError('Node name is required');
      }
      
      if (!insertNode.type || !['event', 'npc', 'faction', 'location', 'item'].includes(insertNode.type)) {
        throw new ValidationError('Node type must be: event, npc, faction, location, or item');
      }

      // Validate session exists if provided
      if (insertNode.sessionId) {
        await this.validateSessionExists(insertNode.sessionId);
      }

      // Validate coordinates
      const x = Math.max(-10000, Math.min(10000, insertNode.x ?? 0)); // Clamp to reasonable bounds
      const y = Math.max(-10000, Math.min(10000, insertNode.y ?? 0));

      const id = randomUUID();
      const node: Node = { 
        ...insertNode, 
        id,
        sessionId: insertNode.sessionId ?? null,
        description: insertNode.description ?? null,
        properties: insertNode.properties ?? null,
        x,
        y,
        createdAt: new Date()
      };
      
      this.nodes.set(id, node);
      console.log(`[MemStorage] Created node: ${node.name} (${node.type}, ${id})`);
      return node;
    } catch (error) {
      console.error('[MemStorage] Error creating node:', error);
      throw error;
    }
  }

  async updateNode(id: string, updates: Partial<Node>): Promise<Node> {
    try {
      this.validateId(id, 'updateNode');
      
      const node = this.nodes.get(id);
      if (!node) {
        throw new NotFoundError('Node', id);
      }

      // Validate updates
      if (updates.type && !['event', 'npc', 'faction', 'location', 'item'].includes(updates.type)) {
        throw new ValidationError('Node type must be: event, npc, faction, location, or item');
      }
      
      if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
        throw new ValidationError('Node name cannot be empty');
      }
      
      // Clamp coordinates (handle nullable values properly)
      if (updates.x !== undefined && typeof updates.x === 'number') {
        updates.x = Math.max(-10000, Math.min(10000, updates.x));
      }
      if (updates.y !== undefined && typeof updates.y === 'number') {
        updates.y = Math.max(-10000, Math.min(10000, updates.y));
      }

      const updatedNode = { 
        ...node, 
        ...updates,
        id // Prevent ID changes
      };
      
      this.nodes.set(id, updatedNode);
      console.log(`[MemStorage] Updated node: ${updatedNode.name} (${id})`);
      return updatedNode;
    } catch (error) {
      console.error(`[MemStorage] Error updating node '${id}':`, error);
      throw error;
    }
  }

  async deleteNode(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteNode');
      
      const node = this.nodes.get(id);
      if (!node) {
        throw new NotFoundError('Node', id);
      }

      // Cascade delete related connections
      const deletedConnections: string[] = [];
      Array.from(this.connections.entries())
        .filter(([_, conn]) => conn.fromNodeId === id || conn.toNodeId === id)
        .forEach(([connId]) => {
          this.connections.delete(connId);
          deletedConnections.push(connId);
        });
      
      // Delete the node
      this.nodes.delete(id);
      
      console.log(`[MemStorage] Deleted node ${node.name} and ${deletedConnections.length} related connections`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting node '${id}':`, error);
      throw error;
    }
  }

  /**
   * CONNECTION OPERATIONS
   * Manages relationships between story elements
   */

  async getSessionConnections(sessionId: string): Promise<Connection[]> {
    try {
      this.validateId(sessionId, 'getSessionConnections');
      await this.validateSessionExists(sessionId);
      
      const connections = Array.from(this.connections.values()).filter(
        conn => conn.sessionId === sessionId
      );
      
      console.log(`[MemStorage] Found ${connections.length} connections for session ${sessionId}`);
      return connections.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting connections for session '${sessionId}':`, error);
      throw error;
    }
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    try {
      // Validate required fields
      if (!insertConnection.type || !['temporal', 'spatial', 'factional', 'ownership'].includes(insertConnection.type)) {
        throw new ValidationError('Connection type must be: temporal, spatial, factional, or ownership');
      }

      // Validate session exists if provided
      if (insertConnection.sessionId) {
        await this.validateSessionExists(insertConnection.sessionId);
      }

      // Validate nodes exist if provided
      await this.validateNodesExist(insertConnection.fromNodeId || undefined, insertConnection.toNodeId || undefined);
      
      // Prevent self-connections
      if (insertConnection.fromNodeId && insertConnection.toNodeId && 
          insertConnection.fromNodeId === insertConnection.toNodeId) {
        throw new ValidationError('Cannot create connection from a node to itself');
      }

      // Validate strength
      const strength = Math.max(1, Math.min(5, insertConnection.strength ?? 1));

      const id = randomUUID();
      const connection: Connection = { 
        ...insertConnection, 
        id,
        sessionId: insertConnection.sessionId ?? null,
        fromNodeId: insertConnection.fromNodeId ?? null,
        toNodeId: insertConnection.toNodeId ?? null,
        strength,
        createdAt: new Date()
      };
      
      this.connections.set(id, connection);
      console.log(`[MemStorage] Created connection: ${connection.type} (strength ${strength}, ${id})`);
      return connection;
    } catch (error) {
      console.error('[MemStorage] Error creating connection:', error);
      throw error;
    }
  }

  async deleteConnection(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteConnection');
      
      const connection = this.connections.get(id);
      if (!connection) {
        throw new NotFoundError('Connection', id);
      }

      this.connections.delete(id);
      console.log(`[MemStorage] Deleted connection: ${connection.type} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting connection '${id}':`, error);
      throw error;
    }
  }

  /**
   * TIMELINE EVENT OPERATIONS
   * Manages sequential events for structured 4-hour sessions
   */

  async getSessionTimeline(sessionId: string): Promise<TimelineEvent[]> {
    try {
      this.validateId(sessionId, 'getSessionTimeline');
      await this.validateSessionExists(sessionId);
      
      const events = Array.from(this.timelineEvents.values())
        .filter(event => event.sessionId === sessionId)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      
      console.log(`[MemStorage] Found ${events.length} timeline events for session ${sessionId}`);
      return events;
    } catch (error) {
      console.error(`[MemStorage] Error getting timeline for session '${sessionId}':`, error);
      throw error;
    }
  }

  async createTimelineEvent(insertEvent: InsertTimelineEvent): Promise<TimelineEvent> {
    try {
      // Validate required fields
      if (!insertEvent.name || insertEvent.name.trim() === '') {
        throw new ValidationError('Timeline event name is required');
      }
      
      if (!insertEvent.phase || !['hook', 'exploration', 'rising_tension', 'climax', 'resolution'].includes(insertEvent.phase)) {
        throw new ValidationError('Phase must be: hook, exploration, rising_tension, climax, or resolution');
      }
      
      if (!insertEvent.creatorMode || !['road', 'city'].includes(insertEvent.creatorMode)) {
        throw new ValidationError('Creator mode must be either "road" or "city"');
      }
      
      if (typeof insertEvent.orderIndex !== 'number' || insertEvent.orderIndex < 0) {
        throw new ValidationError('Order index must be a non-negative number');
      }

      // Validate session exists if provided
      if (insertEvent.sessionId) {
        await this.validateSessionExists(insertEvent.sessionId);
      }

      // Validate node exists if provided
      if (insertEvent.nodeId) {
        const node = await this.getNode(insertEvent.nodeId);
        if (!node) {
          throw new ReferentialIntegrityError(`Node '${insertEvent.nodeId}' does not exist`);
        }
      }

      // Validate duration
      const duration = Math.max(0, Math.min(300, insertEvent.duration ?? 0)); // Max 5 hours

      const id = randomUUID();
      const event: TimelineEvent = { 
        ...insertEvent, 
        id,
        sessionId: insertEvent.sessionId ?? null,
        nodeId: insertEvent.nodeId ?? null,
        description: insertEvent.description ?? null,
        duration,
        isCompleted: insertEvent.isCompleted ?? "false",
        timestamp: new Date()
      };
      
      this.timelineEvents.set(id, event);
      console.log(`[MemStorage] Created timeline event: ${event.name} (${event.phase}, ${id})`);
      return event;
    } catch (error) {
      console.error('[MemStorage] Error creating timeline event:', error);
      throw error;
    }
  }

  async updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent> {
    try {
      this.validateId(id, 'updateTimelineEvent');
      
      const event = this.timelineEvents.get(id);
      if (!event) {
        throw new NotFoundError('Timeline event', id);
      }

      // Validate updates
      if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
        throw new ValidationError('Timeline event name cannot be empty');
      }
      
      if (updates.phase && !['hook', 'exploration', 'rising_tension', 'climax', 'resolution'].includes(updates.phase)) {
        throw new ValidationError('Phase must be: hook, exploration, rising_tension, climax, or resolution');
      }
      
      if (updates.creatorMode && !['road', 'city'].includes(updates.creatorMode)) {
        throw new ValidationError('Creator mode must be either "road" or "city"');
      }
      
      if (updates.orderIndex !== undefined && (typeof updates.orderIndex !== 'number' || updates.orderIndex < 0)) {
        throw new ValidationError('Order index must be a non-negative number');
      }
      
      if (updates.duration !== undefined) {
        updates.duration = updates.duration !== null ? Math.max(0, Math.min(300, updates.duration)) : null;
      }
      
      if (updates.isCompleted && !['true', 'false', 'skipped'].includes(updates.isCompleted)) {
        throw new ValidationError('Completion status must be: true, false, or skipped');
      }

      const updatedEvent = { 
        ...event, 
        ...updates,
        id // Prevent ID changes
      };
      
      this.timelineEvents.set(id, updatedEvent);
      console.log(`[MemStorage] Updated timeline event: ${updatedEvent.name} (${id})`);
      return updatedEvent;
    } catch (error) {
      console.error(`[MemStorage] Error updating timeline event '${id}':`, error);
      throw error;
    }
  }

  async deleteTimelineEvent(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteTimelineEvent');
      
      const event = this.timelineEvents.get(id);
      if (!event) {
        throw new NotFoundError('Timeline event', id);
      }

      this.timelineEvents.delete(id);
      console.log(`[MemStorage] Deleted timeline event: ${event.name} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting timeline event '${id}':`, error);
      throw error;
    }
  }

  async reorderTimelineEvents(sessionId: string, orderedIds: string[]): Promise<void> {
    try {
      this.validateId(sessionId, 'reorderTimelineEvents');
      await this.validateSessionExists(sessionId);
      
      if (!Array.isArray(orderedIds)) {
        throw new ValidationError('orderedIds must be an array');
      }

      // Validate all IDs exist and belong to the session
      const sessionEvents = await this.getSessionTimeline(sessionId);
      const sessionEventIds = new Set(sessionEvents.map(e => e.id));
      
      for (const id of orderedIds) {
        if (!sessionEventIds.has(id)) {
          throw new ValidationError(`Timeline event '${id}' does not belong to session '${sessionId}'`);
        }
      }

      // Update order indices
      let updated = 0;
      orderedIds.forEach((id, index) => {
        const event = this.timelineEvents.get(id);
        if (event && event.sessionId === sessionId) {
          this.timelineEvents.set(id, { ...event, orderIndex: index });
          updated++;
        }
      });
      
      console.log(`[MemStorage] Reordered ${updated} timeline events for session ${sessionId}`);
    } catch (error) {
      console.error(`[MemStorage] Error reordering timeline events for session '${sessionId}':`, error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   * Performance monitoring and statistics
   */

  async getStorageStats(): Promise<{
    users: number;
    sessions: number;
    nodes: number;
    connections: number;
    timelineEvents: number;
  }> {
    return {
      users: this.users.size,
      sessions: this.sessions.size,
      nodes: this.nodes.size,
      connections: this.connections.size,
      timelineEvents: this.timelineEvents.size,
    };
  }
}

// Initialize storage instance
export const storage = new MemStorage();

/**
 * Storage factory function for dependency injection
 * Allows easy swapping of storage implementations
 */
export function createStorage(type: 'memory' | 'postgres' = 'memory'): IStorage {
  switch (type) {
    case 'memory':
      return new MemStorage();
    case 'postgres':
      // TODO: Implement PostgresStorage class
      throw new Error('PostgresStorage not yet implemented');
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}
