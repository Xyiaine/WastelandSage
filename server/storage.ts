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
  type InsertTimelineEvent,
  type Scenario,
  type InsertScenario,
  type Region,
  type InsertRegion,
  type ScenarioSession,
  type InsertScenarioSession,
  type ScenarioNPC,
  type InsertScenarioNPC,
  type ScenarioQuest,
  type InsertScenarioQuest,
  type EnvironmentalCondition,
  type InsertEnvironmentalCondition,
  type PlayerCharacter,
  type InsertPlayerCharacter,
  type SessionPlayer,
  type InsertSessionPlayer
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
  
  // Scenario management
  getScenario(id: string): Promise<Scenario | undefined>;
  getUserScenarios(userId: string): Promise<Scenario[]>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario>;
  deleteScenario(id: string): Promise<void>; // Cascades to regions and sessions
  
  // Region management
  getScenarioRegions(scenarioId: string): Promise<Region[]>;
  getRegion(id: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: string, updates: Partial<Region>): Promise<Region>;
  deleteRegion(id: string): Promise<void>;
  
  // Scenario-Session linking
  linkScenarioToSession(scenarioId: string, sessionId: string): Promise<ScenarioSession>;
  unlinkScenarioFromSession(scenarioId: string, sessionId: string): Promise<void>;
  getSessionScenarios(sessionId: string): Promise<Scenario[]>;
  getScenarioSessions(scenarioId: string): Promise<Session[]>;
  
  // Scenario NPC management
  getScenarioNPCs(scenarioId: string): Promise<ScenarioNPC[]>;
  getScenarioNPC(id: string): Promise<ScenarioNPC | undefined>;
  createScenarioNPC(npc: InsertScenarioNPC): Promise<ScenarioNPC>;
  updateScenarioNPC(id: string, updates: Partial<ScenarioNPC>): Promise<ScenarioNPC>;
  deleteScenarioNPC(id: string): Promise<void>;
  suppressScenarioNPC(id: string): Promise<ScenarioNPC>;
  restoreScenarioNPC(id: string): Promise<ScenarioNPC>;
  
  // Scenario Quest management
  getScenarioQuests(scenarioId: string): Promise<ScenarioQuest[]>;
  getScenarioQuest(id: string): Promise<ScenarioQuest | undefined>;
  createScenarioQuest(quest: InsertScenarioQuest): Promise<ScenarioQuest>;
  updateScenarioQuest(id: string, updates: Partial<ScenarioQuest>): Promise<ScenarioQuest>;
  deleteScenarioQuest(id: string): Promise<void>;
  
  // Environmental Condition management
  getScenarioConditions(scenarioId: string): Promise<EnvironmentalCondition[]>;
  getEnvironmentalCondition(id: string): Promise<EnvironmentalCondition | undefined>;
  createEnvironmentalCondition(condition: InsertEnvironmentalCondition): Promise<EnvironmentalCondition>;
  updateEnvironmentalCondition(id: string, updates: Partial<EnvironmentalCondition>): Promise<EnvironmentalCondition>;
  deleteEnvironmentalCondition(id: string): Promise<void>;
  
  // Player Character management
  getUserCharacters(userId: string): Promise<PlayerCharacter[]>;
  getSessionCharacters(sessionId: string): Promise<PlayerCharacter[]>;
  getPlayerCharacter(id: string): Promise<PlayerCharacter | undefined>;
  createPlayerCharacter(character: InsertPlayerCharacter): Promise<PlayerCharacter>;
  updatePlayerCharacter(id: string, updates: Partial<PlayerCharacter>): Promise<PlayerCharacter>;
  deletePlayerCharacter(id: string): Promise<void>;
  
  // Session Player management
  getSessionPlayers(sessionId: string): Promise<SessionPlayer[]>;
  getSessionPlayer(id: string): Promise<SessionPlayer | undefined>;
  addPlayerToSession(player: InsertSessionPlayer): Promise<SessionPlayer>;
  updateSessionPlayer(id: string, updates: Partial<SessionPlayer>): Promise<SessionPlayer>;
  removePlayerFromSession(id: string): Promise<void>;
  
  // Utility methods for optimization
  getStorageStats(): Promise<{
    users: number;
    sessions: number;
    nodes: number;
    connections: number;
    timelineEvents: number;
    scenarios: number;
    regions: number;
    scenarioNPCs: number;
    scenarioQuests: number;
    environmentalConditions: number;
    playerCharacters: number;
    sessionPlayers: number;
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
  private scenarios: Map<string, Scenario>;
  private regions: Map<string, Region>;
  private scenarioSessions: Map<string, ScenarioSession>;
  private scenarioNPCs: Map<string, ScenarioNPC>;
  private scenarioQuests: Map<string, ScenarioQuest>;
  private environmentalConditions: Map<string, EnvironmentalCondition>;
  private playerCharacters: Map<string, PlayerCharacter>;
  private sessionPlayers: Map<string, SessionPlayer>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.nodes = new Map();
    this.connections = new Map();
    this.timelineEvents = new Map();
    this.scenarios = new Map();
    this.regions = new Map();
    this.scenarioSessions = new Map();
    this.scenarioNPCs = new Map();
    this.scenarioQuests = new Map();
    this.environmentalConditions = new Map();
    this.playerCharacters = new Map();
    this.sessionPlayers = new Map();
    
    // Initialize with default Mediterranean Basin scenario
    this.initializeDefaultContent();
    
    // Log initialization for debugging
    console.log('[MemStorage] Initialized with default Mediterranean Basin scenario');
  }

  /**
   * Initialize the storage with the default "Legacy of the Two Braziers" scenario
   * This ensures the Mediterranean Basin world is always available
   */
  private initializeDefaultContent(): void {
    const defaultScenarioId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for default scenario
    
    // Create the default scenario
    const defaultScenario: Scenario = {
      id: defaultScenarioId,
      userId: 'demo-user',
      title: 'Legacy of the Two Braziers - Mediterranean Basin',
      mainIdea: 'A campaign set in the post-apocalyptic Mediterranean Basin where 10 powerful city-states control vital resources after two devastating nuclear wars. Players navigate the delicate balance of power, survival, and intrigue in a world shaped by scarcity and diesel-powered machines.',
      worldContext: 'The year is 2200. Two nuclear wars (2050 and 2100) have transformed the Mediterranean Basin into a harsh wasteland where survival depends on the fragile alliances between city-states. Each city controls a vital resource, creating a precarious balance of power where one misstep could trigger a third world war.',
      politicalSituation: 'The 10 city-states exist in constant tension: Medical City heals but depends on others for fuel; Fuel City controls transport but produces unstable products; Industrial City builds everything but needs resources; Water & Food City feeds everyone but faces constant threats; Entertainment City influences minds but survives on others charity; Nuke City glows with power but spreads fear; Recycling City salvages the past but suffers radiation; Military City dominates by force but lacks materials; The Ancient Isle may be paradise or myth; Omega Bunker manipulates from shadows.',
      keyThemes: ['survival', 'political_intrigue', 'resource_scarcity', 'technology_worship', 'faction_conflict'],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.scenarios.set(defaultScenarioId, defaultScenario);
    
    // Create the 10 Mediterranean city-states
    const defaultRegions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        scenarioId: defaultScenarioId,
        name: 'Cité Médicale',
        type: 'city' as const,
        description: '« Les Blouses Blanches » - Spécialité : médicaments, chirurgie, prothèses, vaccins. Indispensable pour soigner blessures, maladies et radiations. Dirigée par un conseil de docteurs et apothicaires autoritaires.',
        controllingFaction: 'Les Blouses Blanches',
        population: 15000,
        resources: ['medicine', 'technology'],
        threatLevel: 2,
        politicalStance: 'neutral' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        scenarioId: defaultScenarioId,
        name: 'Cité du Carburant',
        type: 'settlement' as const,
        description: '« Les Raffineurs » - Spécialité : mazout, carburant synthétique, huiles. Contrôle les convois motorisés. Leurs raffineries sont aussi des forteresses mobiles. Carburant instable, parfois explosif.',
        controllingFaction: 'Les Raffineurs',
        population: 12000,
        resources: ['fuel', 'technology'],
        threatLevel: 3,
        politicalStance: 'hostile' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        scenarioId: defaultScenarioId,
        name: 'Cité Industrielle',
        type: 'settlement' as const,
        description: '« Les Forgerons d\'Acier » - Spécialité : machines, pièces détachées, mécanique lourde. Maîtrise la production de véhicules et générateurs. Usines colossales, villes entières noyées dans la fumée.',
        controllingFaction: 'Les Forgerons d\'Acier',
        population: 25000,
        resources: ['metal', 'technology', 'machinery'],
        threatLevel: 2,
        politicalStance: 'neutral' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        scenarioId: defaultScenarioId,
        name: 'Cité de l\'Eau & Alimentation',
        type: 'fortress' as const,
        description: '« Les Gardiens de la Source » - Spécialité : serres blindées, puits, élevages, semences rares. Nourriture et eau = pouvoir vital. Fortifications autour de vastes réservoirs souterrains. Cible de toutes les convoitises.',
        controllingFaction: 'Les Gardiens de la Source',
        population: 18000,
        resources: ['food', 'water', 'seeds'],
        threatLevel: 4,
        politicalStance: 'friendly' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        scenarioId: defaultScenarioId,
        name: 'Cité du Divertissement',
        type: 'trade_hub' as const,
        description: '« Les Faiseurs de Rêves » - Spécialité : arènes, spectacles, cinéma, propagande. Influence culturelle et morale énorme. Connue pour ses radios et journaux de masse. Dépend des autres pour survivre matériellement.',
        controllingFaction: 'Les Faiseurs de Rêves',
        population: 20000,
        resources: ['information', 'entertainment', 'propaganda'],
        threatLevel: 1,
        politicalStance: 'neutral' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        scenarioId: defaultScenarioId,
        name: 'Nuke City',
        type: 'city' as const,
        description: '« Le Réacteur à Ciel Ouvert » - Unique cité nucléaire de surface. Énergie colossale, défenses électrifiées, armes avancées. Ville lumineuse dans le désert, crainte de tous. Rayonnements, accidents et paranoïa des habitants.',
        controllingFaction: 'Le Réacteur à Ciel Ouvert',
        population: 8000,
        resources: ['energy', 'technology', 'weapons'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        scenarioId: defaultScenarioId,
        name: 'Cité des Métaux & Recyclage',
        type: 'settlement' as const,
        description: '« Les Fossoyeurs » - Spécialité : récupération dans les ruines, fonderies, mines. Fournit tous les métaux et alliages rares. Cité construite dans un cimetière de gratte-ciels effondrés. Habitants exposés à radiations et maladies.',
        controllingFaction: 'Les Fossoyeurs',
        population: 10000,
        resources: ['metal', 'rare_materials', 'salvage'],
        threatLevel: 3,
        politicalStance: 'neutral' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        scenarioId: defaultScenarioId,
        name: 'Cité de l\'Armement & Défense',
        type: 'fortress' as const,
        description: '« Les Arsenaux » - Spécialité : armes à feu, explosifs, blindages, véhicules de guerre. Puissance militaire écrasante. La cité est un gigantesque complexe militaire. Trop dépendante de matières premières.',
        controllingFaction: 'Les Arsenaux',
        population: 22000,
        resources: ['weapons', 'explosives', 'armor'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        scenarioId: defaultScenarioId,
        name: 'L\'Île des Anciens',
        type: 'city' as const,
        description: '« Le Paradis Perdu » - Technologie pré-apocalyptique intacte, agriculture abondante. Autosuffisante, riche, civilisée. Isolée, difficile à atteindre. Certains doutent même qu\'elle existe vraiment.',
        controllingFaction: 'Le Paradis Perdu',
        population: 5000,
        resources: ['pre_war_tech', 'abundant_food', 'clean_water'],
        threatLevel: 1,
        politicalStance: 'neutral' as const,
        tradeRoutes: null,
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        scenarioId: defaultScenarioId,
        name: 'Bunker Oméga',
        type: 'fortress' as const,
        description: '« Les Fantômes d\'Acier » - Cité souterraine ultra-avancée, énergie nucléaire. Technologie la plus avancée du monde (armes, drones, IA rudimentaires). N\'intervient pas officiellement, mais manipule la surface via espions et agents secrets.',
        controllingFaction: 'Les Fantômes d\'Acier',
        population: 3000,
        resources: ['advanced_tech', 'ai', 'espionage'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: null,
        createdAt: new Date()
      }
    ];
    
    // Add all regions to storage
    defaultRegions.forEach(region => {
      this.regions.set(region.id, region as Region);
    });
    
    console.log(`[MemStorage] Initialized default scenario with ${defaultRegions.length} Mediterranean city-states`);
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
      if (updates.currentPhase !== undefined && updates.currentPhase !== null) {
        updates.currentPhase = Math.max(0, Math.min(4, updates.currentPhase));
      }
      
      if (updates.duration !== undefined && updates.duration !== null) {
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
   * SCENARIO OPERATIONS
   * High-level scenario and world-building management
   */

  async getScenario(id: string): Promise<Scenario | undefined> {
    try {
      this.validateId(id, 'getScenario');
      const scenario = this.scenarios.get(id);
      
      if (scenario) {
        console.log(`[MemStorage] Retrieved scenario: ${scenario.title}`);
      }
      
      return scenario;
    } catch (error) {
      console.error(`[MemStorage] Error getting scenario '${id}':`, error);
      throw error;
    }
  }

  async getUserScenarios(userId: string): Promise<Scenario[]> {
    try {
      // For demo-user, be more flexible with validation
      if (userId !== 'demo-user') {
        this.validateId(userId, 'getUserScenarios');
      }
      
      const scenarios = Array.from(this.scenarios.values()).filter(
        scenario => scenario.userId === userId
      );
      
      console.log(`[MemStorage] Found ${scenarios.length} scenarios for user ${userId}`);
      return scenarios.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting scenarios for user '${userId}':`, error);
      throw error;
    }
  }

  async createScenario(insertScenario: InsertScenario): Promise<Scenario> {
    try {
      // Validate required fields
      if (!insertScenario.title || insertScenario.title.trim() === '') {
        throw new ValidationError('Scenario title is required');
      }
      
      if (!insertScenario.mainIdea || insertScenario.mainIdea.trim() === '') {
        throw new ValidationError('Main idea is required');
      }

      // For demo purposes, create a default user if needed
      if (insertScenario.userId === 'demo-user') {
        // Create demo user if it doesn't exist
        try {
          await this.getUser('demo-user');
        } catch (error) {
          // Create demo user
          const demoUser = {
            id: 'demo-user',
            username: 'demo',
            password: 'demo-password'
          };
          this.users.set('demo-user', demoUser);
          console.log('[MemStorage] Created demo user');
        }
      } else if (insertScenario.userId) {
        // Validate other users exist
        const user = await this.getUser(insertScenario.userId);
        if (!user) {
          throw new ReferentialIntegrityError(`User '${insertScenario.userId}' does not exist`);
        }
      }

      const id = randomUUID();
      const now = new Date();
      const scenario: Scenario = { 
        ...insertScenario, 
        id,
        userId: insertScenario.userId ?? null,
        worldContext: insertScenario.worldContext ?? null,
        politicalSituation: insertScenario.politicalSituation ?? null,
        keyThemes: insertScenario.keyThemes ?? null,
        status: insertScenario.status ?? "draft",
        createdAt: now,
        updatedAt: now
      };
      
      this.scenarios.set(id, scenario);
      console.log(`[MemStorage] Created scenario: ${scenario.title} (${id})`);
      return scenario;
    } catch (error) {
      console.error('[MemStorage] Error creating scenario:', error);
      throw error;
    }
  }

  async updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario> {
    try {
      this.validateId(id, 'updateScenario');
      
      const scenario = this.scenarios.get(id);
      if (!scenario) {
        throw new NotFoundError('Scenario', id);
      }

      // Validate updates
      if (updates.title !== undefined && (!updates.title || updates.title.trim() === '')) {
        throw new ValidationError('Scenario title cannot be empty');
      }
      
      if (updates.status && !['draft', 'active', 'completed', 'archived'].includes(updates.status)) {
        throw new ValidationError('Status must be: draft, active, completed, or archived');
      }

      const updatedScenario = { 
        ...scenario, 
        ...updates,
        id, // Prevent ID changes
        updatedAt: new Date()
      };
      
      this.scenarios.set(id, updatedScenario);
      console.log(`[MemStorage] Updated scenario: ${updatedScenario.title} (${id})`);
      return updatedScenario;
    } catch (error) {
      console.error(`[MemStorage] Error updating scenario '${id}':`, error);
      throw error;
    }
  }

  async deleteScenario(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteScenario');
      
      const scenario = this.scenarios.get(id);
      if (!scenario) {
        throw new NotFoundError('Scenario', id);
      }

      // Cascade delete related entities
      const deletedRegions: string[] = [];
      const deletedLinks: string[] = [];
      
      // Delete regions
      Array.from(this.regions.entries())
        .filter(([_, region]) => region.scenarioId === id)
        .forEach(([regionId]) => {
          this.regions.delete(regionId);
          deletedRegions.push(regionId);
        });
      
      // Delete scenario-session links
      Array.from(this.scenarioSessions.entries())
        .filter(([_, link]) => link.scenarioId === id)
        .forEach(([linkId]) => {
          this.scenarioSessions.delete(linkId);
          deletedLinks.push(linkId);
        });
      
      // Finally delete the scenario
      this.scenarios.delete(id);
      
      console.log(`[MemStorage] Deleted scenario ${scenario.title} and cascaded: ${deletedRegions.length} regions, ${deletedLinks.length} session links`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting scenario '${id}':`, error);
      throw error;
    }
  }

  /**
   * REGION OPERATIONS
   * Geographic and political area management
   */

  async getScenarioRegions(scenarioId: string): Promise<Region[]> {
    try {
      this.validateId(scenarioId, 'getScenarioRegions');
      
      const regions = Array.from(this.regions.values()).filter(
        region => region.scenarioId === scenarioId
      );
      
      console.log(`[MemStorage] Found ${regions.length} regions for scenario ${scenarioId}`);
      return regions.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting regions for scenario '${scenarioId}':`, error);
      throw error;
    }
  }

  async getRegion(id: string): Promise<Region | undefined> {
    try {
      this.validateId(id, 'getRegion');
      const region = this.regions.get(id);
      
      if (region) {
        console.log(`[MemStorage] Retrieved region: ${region.name} (${region.type})`);
      }
      
      return region;
    } catch (error) {
      console.error(`[MemStorage] Error getting region '${id}':`, error);
      throw error;
    }
  }

  async createRegion(insertRegion: InsertRegion): Promise<Region> {
    try {
      // Validate required fields
      if (!insertRegion.name || insertRegion.name.trim() === '') {
        throw new ValidationError('Region name is required');
      }
      
      if (!insertRegion.type || !['city', 'settlement', 'wasteland', 'fortress', 'trade_hub'].includes(insertRegion.type)) {
        throw new ValidationError('Region type must be: city, settlement, wasteland, fortress, or trade_hub');
      }

      // Validate scenario exists if provided
      if (insertRegion.scenarioId) {
        const scenario = await this.getScenario(insertRegion.scenarioId);
        if (!scenario) {
          throw new ReferentialIntegrityError(`Scenario '${insertRegion.scenarioId}' does not exist`);
        }
      }

      // Validate threat level
      const threatLevel = insertRegion.threatLevel !== undefined ? 
        Math.max(1, Math.min(5, insertRegion.threatLevel)) : 1;

      const id = randomUUID();
      const region: Region = { 
        ...insertRegion, 
        id,
        scenarioId: insertRegion.scenarioId ?? null,
        description: insertRegion.description ?? null,
        controllingFaction: insertRegion.controllingFaction ?? null,
        population: insertRegion.population ?? null,
        resources: insertRegion.resources ?? null,
        politicalStance: insertRegion.politicalStance ?? null,
        tradeRoutes: insertRegion.tradeRoutes ?? null,
        threatLevel,
        createdAt: new Date()
      };
      
      this.regions.set(id, region);
      console.log(`[MemStorage] Created region: ${region.name} (${region.type}, ${id})`);
      return region;
    } catch (error) {
      console.error('[MemStorage] Error creating region:', error);
      throw error;
    }
  }

  async updateRegion(id: string, updates: Partial<Region>): Promise<Region> {
    try {
      this.validateId(id, 'updateRegion');
      
      const region = this.regions.get(id);
      if (!region) {
        throw new NotFoundError('Region', id);
      }

      // Validate updates
      if (updates.type && !['city', 'settlement', 'wasteland', 'fortress', 'trade_hub'].includes(updates.type)) {
        throw new ValidationError('Region type must be: city, settlement, wasteland, fortress, or trade_hub');
      }
      
      if (updates.name !== undefined && (!updates.name || updates.name.trim() === '')) {
        throw new ValidationError('Region name cannot be empty');
      }
      
      if (updates.threatLevel !== undefined && typeof updates.threatLevel === 'number') {
        updates.threatLevel = Math.max(1, Math.min(5, updates.threatLevel));
      }
      
      if (updates.politicalStance && !['hostile', 'neutral', 'friendly', 'allied'].includes(updates.politicalStance)) {
        throw new ValidationError('Political stance must be: hostile, neutral, friendly, or allied');
      }

      const updatedRegion = { 
        ...region, 
        ...updates,
        id // Prevent ID changes
      };
      
      this.regions.set(id, updatedRegion);
      console.log(`[MemStorage] Updated region: ${updatedRegion.name} (${id})`);
      return updatedRegion;
    } catch (error) {
      console.error(`[MemStorage] Error updating region '${id}':`, error);
      throw error;
    }
  }

  async deleteRegion(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteRegion');
      
      const region = this.regions.get(id);
      if (!region) {
        throw new NotFoundError('Region', id);
      }

      // Delete the region
      this.regions.delete(id);
      
      console.log(`[MemStorage] Deleted region ${region.name}`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting region '${id}':`, error);
      throw error;
    }
  }

  /**
   * SCENARIO-SESSION LINKING
   * Many-to-many relationship management
   */

  async linkScenarioToSession(scenarioId: string, sessionId: string): Promise<ScenarioSession> {
    try {
      this.validateId(scenarioId, 'linkScenarioToSession.scenarioId');
      this.validateId(sessionId, 'linkScenarioToSession.sessionId');
      
      // Validate both entities exist
      const scenario = await this.getScenario(scenarioId);
      if (!scenario) {
        throw new ReferentialIntegrityError(`Scenario '${scenarioId}' does not exist`);
      }
      
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ReferentialIntegrityError(`Session '${sessionId}' does not exist`);
      }

      // Check if link already exists
      const existingLink = Array.from(this.scenarioSessions.values())
        .find(link => link.scenarioId === scenarioId && link.sessionId === sessionId);
      
      if (existingLink) {
        console.log(`[MemStorage] Link already exists between scenario ${scenarioId} and session ${sessionId}`);
        return existingLink;
      }

      const id = randomUUID();
      const link: ScenarioSession = {
        id,
        scenarioId,
        sessionId,
        createdAt: new Date()
      };
      
      this.scenarioSessions.set(id, link);
      console.log(`[MemStorage] Linked scenario ${scenario.title} to session ${session.name}`);
      return link;
    } catch (error) {
      console.error(`[MemStorage] Error linking scenario '${scenarioId}' to session '${sessionId}':`, error);
      throw error;
    }
  }

  async unlinkScenarioFromSession(scenarioId: string, sessionId: string): Promise<void> {
    try {
      this.validateId(scenarioId, 'unlinkScenarioFromSession.scenarioId');
      this.validateId(sessionId, 'unlinkScenarioFromSession.sessionId');
      
      const linkToDelete = Array.from(this.scenarioSessions.entries())
        .find(([_, link]) => link.scenarioId === scenarioId && link.sessionId === sessionId);
      
      if (linkToDelete) {
        this.scenarioSessions.delete(linkToDelete[0]);
        console.log(`[MemStorage] Unlinked scenario ${scenarioId} from session ${sessionId}`);
      } else {
        console.log(`[MemStorage] No link found between scenario ${scenarioId} and session ${sessionId}`);
      }
    } catch (error) {
      console.error(`[MemStorage] Error unlinking scenario '${scenarioId}' from session '${sessionId}':`, error);
      throw error;
    }
  }

  async getSessionScenarios(sessionId: string): Promise<Scenario[]> {
    try {
      this.validateId(sessionId, 'getSessionScenarios');
      await this.validateSessionExists(sessionId);
      
      const links = Array.from(this.scenarioSessions.values())
        .filter(link => link.sessionId === sessionId);
      
      const scenarios = links
        .map(link => this.scenarios.get(link.scenarioId!))
        .filter(scenario => scenario !== undefined) as Scenario[];
      
      console.log(`[MemStorage] Found ${scenarios.length} scenarios for session ${sessionId}`);
      return scenarios;
    } catch (error) {
      console.error(`[MemStorage] Error getting scenarios for session '${sessionId}':`, error);
      throw error;
    }
  }

  async getScenarioSessions(scenarioId: string): Promise<Session[]> {
    try {
      this.validateId(scenarioId, 'getScenarioSessions');
      
      const scenario = await this.getScenario(scenarioId);
      if (!scenario) {
        throw new NotFoundError('Scenario', scenarioId);
      }
      
      const links = Array.from(this.scenarioSessions.values())
        .filter(link => link.scenarioId === scenarioId);
      
      const sessions = links
        .map(link => this.sessions.get(link.sessionId!))
        .filter(session => session !== undefined) as Session[];
      
      console.log(`[MemStorage] Found ${sessions.length} sessions for scenario ${scenarioId}`);
      return sessions.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting sessions for scenario '${scenarioId}':`, error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   * Performance monitoring and statistics
   */

  /**
   * SCENARIO NPC METHODS
   */

  async getScenarioNPCs(scenarioId: string): Promise<ScenarioNPC[]> {
    try {
      this.validateId(scenarioId, 'getScenarioNPCs');
      
      const npcs = Array.from(this.scenarioNPCs.values()).filter(
        npc => npc.scenarioId === scenarioId
      );
      
      console.log(`[MemStorage] Found ${npcs.length} NPCs for scenario ${scenarioId}`);
      return npcs.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting NPCs for scenario '${scenarioId}':`, error);
      throw error;
    }
  }

  async getScenarioNPC(id: string): Promise<ScenarioNPC | undefined> {
    try {
      this.validateId(id, 'getScenarioNPC');
      const npc = this.scenarioNPCs.get(id);
      
      if (npc) {
        console.log(`[MemStorage] Retrieved NPC: ${npc.name} (${npc.role})`);
      }
      
      return npc;
    } catch (error) {
      console.error(`[MemStorage] Error getting NPC '${id}':`, error);
      throw error;
    }
  }

  async createScenarioNPC(insertNPC: InsertScenarioNPC): Promise<ScenarioNPC> {
    try {
      if (!insertNPC.name || insertNPC.name.trim() === '') {
        throw new ValidationError('NPC name is required');
      }
      
      if (!insertNPC.role) {
        throw new ValidationError('NPC role is required');
      }

      const id = randomUUID();
      const npc: ScenarioNPC = { 
        ...insertNPC, 
        id,
        scenarioId: insertNPC.scenarioId ?? null,
        description: insertNPC.description ?? null,
        location: insertNPC.location ?? null,
        faction: insertNPC.faction ?? null,
        importance: insertNPC.importance ?? 'minor',
        status: insertNPC.status ?? 'alive',
        createdAt: new Date()
      };
      
      this.scenarioNPCs.set(id, npc);
      console.log(`[MemStorage] Created NPC: ${npc.name} (${npc.role}, ${id})`);
      return npc;
    } catch (error) {
      console.error('[MemStorage] Error creating NPC:', error);
      throw error;
    }
  }

  async updateScenarioNPC(id: string, updates: Partial<ScenarioNPC>): Promise<ScenarioNPC> {
    try {
      this.validateId(id, 'updateScenarioNPC');
      
      const existingNPC = this.scenarioNPCs.get(id);
      if (!existingNPC) {
        throw new NotFoundError('NPC', id);
      }

      const updatedNPC: ScenarioNPC = { 
        ...existingNPC, 
        ...updates,
        id: existingNPC.id // Prevent ID changes
      };
      
      this.scenarioNPCs.set(id, updatedNPC);
      console.log(`[MemStorage] Updated NPC: ${updatedNPC.name} (${id})`);
      return updatedNPC;
    } catch (error) {
      console.error(`[MemStorage] Error updating NPC '${id}':`, error);
      throw error;
    }
  }

  async deleteScenarioNPC(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteScenarioNPC');
      
      const npc = this.scenarioNPCs.get(id);
      if (!npc) {
        throw new NotFoundError('NPC', id);
      }

      this.scenarioNPCs.delete(id);
      console.log(`[MemStorage] Deleted NPC: ${npc.name} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting NPC '${id}':`, error);
      throw error;
    }
  }

  async suppressScenarioNPC(id: string): Promise<ScenarioNPC> {
    return this.updateScenarioNPC(id, { status: 'suppressed' });
  }

  async restoreScenarioNPC(id: string): Promise<ScenarioNPC> {
    return this.updateScenarioNPC(id, { status: 'alive' });
  }

  /**
   * SCENARIO QUEST METHODS
   */

  async getScenarioQuests(scenarioId: string): Promise<ScenarioQuest[]> {
    try {
      this.validateId(scenarioId, 'getScenarioQuests');
      
      const quests = Array.from(this.scenarioQuests.values()).filter(
        quest => quest.scenarioId === scenarioId
      );
      
      console.log(`[MemStorage] Found ${quests.length} quests for scenario ${scenarioId}`);
      return quests.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting quests for scenario '${scenarioId}':`, error);
      throw error;
    }
  }

  async getScenarioQuest(id: string): Promise<ScenarioQuest | undefined> {
    try {
      this.validateId(id, 'getScenarioQuest');
      return this.scenarioQuests.get(id);
    } catch (error) {
      console.error(`[MemStorage] Error getting quest '${id}':`, error);
      throw error;
    }
  }

  async createScenarioQuest(insertQuest: InsertScenarioQuest): Promise<ScenarioQuest> {
    try {
      if (!insertQuest.title || insertQuest.title.trim() === '') {
        throw new ValidationError('Quest title is required');
      }

      const id = randomUUID();
      const quest: ScenarioQuest = { 
        ...insertQuest, 
        id,
        scenarioId: insertQuest.scenarioId ?? null,
        description: insertQuest.description,
        status: insertQuest.status ?? 'not_started',
        priority: insertQuest.priority ?? 'medium',
        rewards: insertQuest.rewards ?? null,
        requirements: insertQuest.requirements ?? null,
        createdAt: new Date()
      };
      
      this.scenarioQuests.set(id, quest);
      console.log(`[MemStorage] Created quest: ${quest.title} (${id})`);
      return quest;
    } catch (error) {
      console.error('[MemStorage] Error creating quest:', error);
      throw error;
    }
  }

  async updateScenarioQuest(id: string, updates: Partial<ScenarioQuest>): Promise<ScenarioQuest> {
    try {
      this.validateId(id, 'updateScenarioQuest');
      
      const existingQuest = this.scenarioQuests.get(id);
      if (!existingQuest) {
        throw new NotFoundError('Quest', id);
      }

      const updatedQuest: ScenarioQuest = { 
        ...existingQuest, 
        ...updates,
        id: existingQuest.id
      };
      
      this.scenarioQuests.set(id, updatedQuest);
      console.log(`[MemStorage] Updated quest: ${updatedQuest.title} (${id})`);
      return updatedQuest;
    } catch (error) {
      console.error(`[MemStorage] Error updating quest '${id}':`, error);
      throw error;
    }
  }

  async deleteScenarioQuest(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteScenarioQuest');
      
      const quest = this.scenarioQuests.get(id);
      if (!quest) {
        throw new NotFoundError('Quest', id);
      }

      this.scenarioQuests.delete(id);
      console.log(`[MemStorage] Deleted quest: ${quest.title} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting quest '${id}':`, error);
      throw error;
    }
  }

  /**
   * ENVIRONMENTAL CONDITION METHODS
   */

  async getScenarioConditions(scenarioId: string): Promise<EnvironmentalCondition[]> {
    try {
      this.validateId(scenarioId, 'getScenarioConditions');
      
      const conditions = Array.from(this.environmentalConditions.values()).filter(
        condition => condition.scenarioId === scenarioId
      );
      
      console.log(`[MemStorage] Found ${conditions.length} conditions for scenario ${scenarioId}`);
      return conditions.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting conditions for scenario '${scenarioId}':`, error);
      throw error;
    }
  }

  async getEnvironmentalCondition(id: string): Promise<EnvironmentalCondition | undefined> {
    try {
      this.validateId(id, 'getEnvironmentalCondition');
      return this.environmentalConditions.get(id);
    } catch (error) {
      console.error(`[MemStorage] Error getting condition '${id}':`, error);
      throw error;
    }
  }

  async createEnvironmentalCondition(insertCondition: InsertEnvironmentalCondition): Promise<EnvironmentalCondition> {
    try {
      if (!insertCondition.name || insertCondition.name.trim() === '') {
        throw new ValidationError('Condition name is required');
      }

      const id = randomUUID();
      const condition: EnvironmentalCondition = { 
        ...insertCondition, 
        id,
        scenarioId: insertCondition.scenarioId ?? null,
        description: insertCondition.description,
        severity: insertCondition.severity ?? 'moderate',
        affectedRegions: insertCondition.affectedRegions ?? null,
        duration: insertCondition.duration ?? null,
        createdAt: new Date()
      };
      
      this.environmentalConditions.set(id, condition);
      console.log(`[MemStorage] Created condition: ${condition.name} (${id})`);
      return condition;
    } catch (error) {
      console.error('[MemStorage] Error creating condition:', error);
      throw error;
    }
  }

  async updateEnvironmentalCondition(id: string, updates: Partial<EnvironmentalCondition>): Promise<EnvironmentalCondition> {
    try {
      this.validateId(id, 'updateEnvironmentalCondition');
      
      const existingCondition = this.environmentalConditions.get(id);
      if (!existingCondition) {
        throw new NotFoundError('Condition', id);
      }

      const updatedCondition: EnvironmentalCondition = { 
        ...existingCondition, 
        ...updates,
        id: existingCondition.id
      };
      
      this.environmentalConditions.set(id, updatedCondition);
      console.log(`[MemStorage] Updated condition: ${updatedCondition.name} (${id})`);
      return updatedCondition;
    } catch (error) {
      console.error(`[MemStorage] Error updating condition '${id}':`, error);
      throw error;
    }
  }

  async deleteEnvironmentalCondition(id: string): Promise<void> {
    try {
      this.validateId(id, 'deleteEnvironmentalCondition');
      
      const condition = this.environmentalConditions.get(id);
      if (!condition) {
        throw new NotFoundError('Condition', id);
      }

      this.environmentalConditions.delete(id);
      console.log(`[MemStorage] Deleted condition: ${condition.name} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting condition '${id}':`, error);
      throw error;
    }
  }

  /**
   * PLAYER CHARACTER METHODS
   */

  async getUserCharacters(userId: string): Promise<PlayerCharacter[]> {
    try {
      this.validateId(userId, 'getUserCharacters');
      
      const characters = Array.from(this.playerCharacters.values()).filter(
        character => character.userId === userId
      );
      
      console.log(`[MemStorage] Found ${characters.length} characters for user ${userId}`);
      return characters.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting characters for user '${userId}':`, error);
      throw error;
    }
  }

  async getSessionCharacters(sessionId: string): Promise<PlayerCharacter[]> {
    try {
      this.validateId(sessionId, 'getSessionCharacters');
      
      const characters = Array.from(this.playerCharacters.values()).filter(
        character => character.sessionId === sessionId
      );
      
      console.log(`[MemStorage] Found ${characters.length} characters for session ${sessionId}`);
      return characters.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting characters for session '${sessionId}':`, error);
      throw error;
    }
  }

  async getPlayerCharacter(id: string): Promise<PlayerCharacter | undefined> {
    try {
      this.validateId(id, 'getPlayerCharacter');
      return this.playerCharacters.get(id);
    } catch (error) {
      console.error(`[MemStorage] Error getting character '${id}':`, error);
      throw error;
    }
  }

  async createPlayerCharacter(insertCharacter: InsertPlayerCharacter): Promise<PlayerCharacter> {
    try {
      if (!insertCharacter.name || insertCharacter.name.trim() === '') {
        throw new ValidationError('Character name is required');
      }

      const id = randomUUID();
      const character: PlayerCharacter = { 
        ...insertCharacter, 
        id,
        sessionId: insertCharacter.sessionId ?? null,
        userId: insertCharacter.userId ?? null,
        level: insertCharacter.level ?? 1,
        background: insertCharacter.background ?? null,
        stats: insertCharacter.stats ?? null,
        skills: insertCharacter.skills ?? null,
        equipment: insertCharacter.equipment ?? null,
        notes: insertCharacter.notes ?? null,
        isActive: insertCharacter.isActive ?? 'true',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.playerCharacters.set(id, character);
      console.log(`[MemStorage] Created character: ${character.name} (${character.characterClass}, ${id})`);
      return character;
    } catch (error) {
      console.error('[MemStorage] Error creating character:', error);
      throw error;
    }
  }

  async updatePlayerCharacter(id: string, updates: Partial<PlayerCharacter>): Promise<PlayerCharacter> {
    try {
      this.validateId(id, 'updatePlayerCharacter');
      
      const existingCharacter = this.playerCharacters.get(id);
      if (!existingCharacter) {
        throw new NotFoundError('Character', id);
      }

      const updatedCharacter: PlayerCharacter = { 
        ...existingCharacter, 
        ...updates,
        id: existingCharacter.id,
        updatedAt: new Date()
      };
      
      this.playerCharacters.set(id, updatedCharacter);
      console.log(`[MemStorage] Updated character: ${updatedCharacter.name} (${id})`);
      return updatedCharacter;
    } catch (error) {
      console.error(`[MemStorage] Error updating character '${id}':`, error);
      throw error;
    }
  }

  async deletePlayerCharacter(id: string): Promise<void> {
    try {
      this.validateId(id, 'deletePlayerCharacter');
      
      const character = this.playerCharacters.get(id);
      if (!character) {
        throw new NotFoundError('Character', id);
      }

      // Remove from session players first
      Array.from(this.sessionPlayers.entries()).forEach(([sessionPlayerId, sessionPlayer]) => {
        if (sessionPlayer.characterId === id) {
          this.sessionPlayers.delete(sessionPlayerId);
        }
      });

      this.playerCharacters.delete(id);
      console.log(`[MemStorage] Deleted character: ${character.name} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting character '${id}':`, error);
      throw error;
    }
  }

  /**
   * SESSION PLAYER METHODS
   */

  async getSessionPlayers(sessionId: string): Promise<SessionPlayer[]> {
    try {
      this.validateId(sessionId, 'getSessionPlayers');
      
      const players = Array.from(this.sessionPlayers.values()).filter(
        player => player.sessionId === sessionId
      );
      
      console.log(`[MemStorage] Found ${players.length} players for session ${sessionId}`);
      return players.sort((a, b) => (a.joinedAt?.getTime() || 0) - (b.joinedAt?.getTime() || 0));
    } catch (error) {
      console.error(`[MemStorage] Error getting players for session '${sessionId}':`, error);
      throw error;
    }
  }

  async getSessionPlayer(id: string): Promise<SessionPlayer | undefined> {
    try {
      this.validateId(id, 'getSessionPlayer');
      return this.sessionPlayers.get(id);
    } catch (error) {
      console.error(`[MemStorage] Error getting session player '${id}':`, error);
      throw error;
    }
  }

  async addPlayerToSession(insertPlayer: InsertSessionPlayer): Promise<SessionPlayer> {
    try {
      if (!insertPlayer.sessionId || !insertPlayer.userId) {
        throw new ValidationError('Session ID and User ID are required');
      }

      const id = randomUUID();
      const player: SessionPlayer = { 
        ...insertPlayer, 
        id,
        sessionId: insertPlayer.sessionId ?? null,
        userId: insertPlayer.userId ?? null,
        characterId: insertPlayer.characterId ?? null,
        role: insertPlayer.role ?? 'player',
        permissions: insertPlayer.permissions ?? null,
        isOnline: insertPlayer.isOnline ?? 'false',
        joinedAt: new Date(),
        lastActive: new Date()
      };
      
      this.sessionPlayers.set(id, player);
      console.log(`[MemStorage] Added player to session: ${insertPlayer.userId} (${id})`);
      return player;
    } catch (error) {
      console.error('[MemStorage] Error adding player to session:', error);
      throw error;
    }
  }

  async updateSessionPlayer(id: string, updates: Partial<SessionPlayer>): Promise<SessionPlayer> {
    try {
      this.validateId(id, 'updateSessionPlayer');
      
      const existingPlayer = this.sessionPlayers.get(id);
      if (!existingPlayer) {
        throw new NotFoundError('Session Player', id);
      }

      const updatedPlayer: SessionPlayer = { 
        ...existingPlayer, 
        ...updates,
        id: existingPlayer.id,
        lastActive: new Date()
      };
      
      this.sessionPlayers.set(id, updatedPlayer);
      console.log(`[MemStorage] Updated session player: ${existingPlayer.userId} (${id})`);
      return updatedPlayer;
    } catch (error) {
      console.error(`[MemStorage] Error updating session player '${id}':`, error);
      throw error;
    }
  }

  async removePlayerFromSession(id: string): Promise<void> {
    try {
      this.validateId(id, 'removePlayerFromSession');
      
      const player = this.sessionPlayers.get(id);
      if (!player) {
        throw new NotFoundError('Session Player', id);
      }

      this.sessionPlayers.delete(id);
      console.log(`[MemStorage] Removed player from session: ${player.userId} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error removing player from session '${id}':`, error);
      throw error;
    }
  }

  async getStorageStats(): Promise<{
    users: number;
    sessions: number;
    nodes: number;
    connections: number;
    timelineEvents: number;
    scenarios: number;
    regions: number;
    scenarioNPCs: number;
    scenarioQuests: number;
    environmentalConditions: number;
    playerCharacters: number;
    sessionPlayers: number;
  }> {
    return {
      users: this.users.size,
      sessions: this.sessions.size,
      nodes: this.nodes.size,
      connections: this.connections.size,
      timelineEvents: this.timelineEvents.size,
      scenarios: this.scenarios.size,
      regions: this.regions.size,
      scenarioNPCs: this.scenarioNPCs.size,
      scenarioQuests: this.scenarioQuests.size,
      environmentalConditions: this.environmentalConditions.size,
      playerCharacters: this.playerCharacters.size,
      sessionPlayers: this.sessionPlayers.size,
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
