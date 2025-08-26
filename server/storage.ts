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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sessions
  getSession(id: string): Promise<Session | undefined>;
  getUserSessions(userId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: string): Promise<void>;
  
  // Nodes
  getSessionNodes(sessionId: string): Promise<Node[]>;
  getNode(id: string): Promise<Node | undefined>;
  createNode(node: InsertNode): Promise<Node>;
  updateNode(id: string, updates: Partial<Node>): Promise<Node>;
  deleteNode(id: string): Promise<void>;
  
  // Connections
  getSessionConnections(sessionId: string): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  deleteConnection(id: string): Promise<void>;
  
  // Timeline Events
  getSessionTimeline(sessionId: string): Promise<TimelineEvent[]>;
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
  updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent>;
  deleteTimelineEvent(id: string): Promise<void>;
  reorderTimelineEvents(sessionId: string, orderedIds: string[]): Promise<void>;
}

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
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Sessions
  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const session: Session = { 
      ...insertSession, 
      id,
      userId: insertSession.userId ?? null,
      currentPhase: insertSession.currentPhase ?? 0,
      duration: insertSession.duration ?? 0,
      aiMode: insertSession.aiMode ?? null,
      createdAt: now,
      updatedAt: now
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');
    
    const updatedSession = { 
      ...session, 
      ...updates,
      updatedAt: new Date()
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    // Also delete related data
    Array.from(this.nodes.entries())
      .filter(([_, node]) => node.sessionId === id)
      .forEach(([nodeId]) => this.nodes.delete(nodeId));
    
    Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.sessionId === id)
      .forEach(([connId]) => this.connections.delete(connId));
      
    Array.from(this.timelineEvents.entries())
      .filter(([_, event]) => event.sessionId === id)
      .forEach(([eventId]) => this.timelineEvents.delete(eventId));
  }

  // Nodes
  async getSessionNodes(sessionId: string): Promise<Node[]> {
    return Array.from(this.nodes.values()).filter(
      node => node.sessionId === sessionId
    );
  }

  async getNode(id: string): Promise<Node | undefined> {
    return this.nodes.get(id);
  }

  async createNode(insertNode: InsertNode): Promise<Node> {
    const id = randomUUID();
    const node: Node = { 
      ...insertNode, 
      id,
      sessionId: insertNode.sessionId ?? null,
      description: insertNode.description ?? null,
      properties: insertNode.properties ?? null,
      x: insertNode.x ?? 0,
      y: insertNode.y ?? 0,
      createdAt: new Date()
    };
    this.nodes.set(id, node);
    return node;
  }

  async updateNode(id: string, updates: Partial<Node>): Promise<Node> {
    const node = this.nodes.get(id);
    if (!node) throw new Error('Node not found');
    
    const updatedNode = { ...node, ...updates };
    this.nodes.set(id, updatedNode);
    return updatedNode;
  }

  async deleteNode(id: string): Promise<void> {
    this.nodes.delete(id);
    // Delete related connections
    Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.fromNodeId === id || conn.toNodeId === id)
      .forEach(([connId]) => this.connections.delete(connId));
  }

  // Connections
  async getSessionConnections(sessionId: string): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(
      conn => conn.sessionId === sessionId
    );
  }

  async createConnection(insertConnection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const connection: Connection = { 
      ...insertConnection, 
      id,
      sessionId: insertConnection.sessionId ?? null,
      fromNodeId: insertConnection.fromNodeId ?? null,
      toNodeId: insertConnection.toNodeId ?? null,
      strength: insertConnection.strength ?? 1,
      createdAt: new Date()
    };
    this.connections.set(id, connection);
    return connection;
  }

  async deleteConnection(id: string): Promise<void> {
    this.connections.delete(id);
  }

  // Timeline Events
  async getSessionTimeline(sessionId: string): Promise<TimelineEvent[]> {
    return Array.from(this.timelineEvents.values())
      .filter(event => event.sessionId === sessionId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createTimelineEvent(insertEvent: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = randomUUID();
    const event: TimelineEvent = { 
      ...insertEvent, 
      id,
      sessionId: insertEvent.sessionId ?? null,
      nodeId: insertEvent.nodeId ?? null,
      description: insertEvent.description ?? null,
      duration: insertEvent.duration ?? 0,
      isCompleted: insertEvent.isCompleted ?? null,
      timestamp: new Date()
    };
    this.timelineEvents.set(id, event);
    return event;
  }

  async updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent> {
    const event = this.timelineEvents.get(id);
    if (!event) throw new Error('Timeline event not found');
    
    const updatedEvent = { ...event, ...updates };
    this.timelineEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteTimelineEvent(id: string): Promise<void> {
    this.timelineEvents.delete(id);
  }

  async reorderTimelineEvents(sessionId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const event = this.timelineEvents.get(id);
      if (event && event.sessionId === sessionId) {
        this.timelineEvents.set(id, { ...event, orderIndex: index });
      }
    });
  }
}

export const storage = new MemStorage();
