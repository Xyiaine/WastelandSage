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

  // Performance indexes
  private sessionsByUser: Map<string, Set<string>> = new Map();
  private scenariosByUser: Map<string, Set<string>> = new Map();
  private nodesBySession: Map<string, Set<string>> = new Map();

  // Simple LRU cache for frequently accessed data
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // Clean cache periodically
    setInterval(() => this.cleanCache(), 60000); // Every minute
  }

  private cleanCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        entriesToDelete.push(key);
      }
    });
    
    entriesToDelete.forEach(key => this.cache.delete(key));
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Initialize the storage with the default "Legacy of the Two Braziers" scenario
   * This ensures the Mediterranean Basin world is always available
   */
  private initializeDefaultContent(): void {
    const defaultScenarioId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for default scenario

    // Initialize default scenario with Mediterranean Basin theme
    const defaultScenario: Scenario = {
      id: defaultScenarioId,
      userId: 'demo-user',
      title: 'Legacy of the Two Braziers',
      mainIdea: 'Mediterranean Basin, 2200 AD. Ten city-states control specialized resources in a fragile post-nuclear world. The "Balance of Necessity" treaty prevents total war, but secret alliances, resource blackmail, and territorial disputes threaten to shatter 50 years of uneasy peace. Ancient nuclear powers hold the ultimate deterrent while new factions plot in the shadows.',
      worldContext: 'After the Great Nuclear Wars of 2050-2080, the Mediterranean became the last bastion of organized civilization. The Treaty of the Two Braziers (2150 AD) established the current balance: each city-state controls one vital resource, making total war economically suicidal. However, climate shifts, resource depletion, and generational change strain this system. The recent discovery of pre-war technology caches threatens to upset the balance entirely.',
      politicalSituation: 'CURRENT CRISIS: The "Water Wars" begin as the Guardians of the Source face internal rebellion while three city-states secretly negotiate alternative water sources. The Life Alliance (Medical+Agricultural) pressures smaller states while the Industrial Axis (Steel Forges+Nuclear Reactor) builds autonomous weapons. The Entertainment Coalition spreads propaganda while Information Brokers sell secrets to all sides. Two assassination attempts on faction leaders in the past month signal the end of diplomatic solutions.',
      keyThemes: ['fragile peace', 'resource warfare', 'political assassination', 'secret alliances', 'technological arms race', 'economic warfare', 'succession crises', 'territorial expansion'],
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.scenarios.set(defaultScenarioId, defaultScenario);
    if (!this.scenariosByUser.has('demo-user')) {
      this.scenariosByUser.set('demo-user', new Set());
    }
    this.scenariosByUser.get('demo-user')!.add(defaultScenarioId);

    // Create the 10 Mediterranean city-states
    const defaultRegions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        scenarioId: defaultScenarioId,
        name: 'Cité Médicale',
        type: 'city' as const,
        description: '« Les Blouses Blanches » - POLITICAL CRISIS: Internal power struggle between Director Vasquez (pro-isolation) and Chief Surgeon Romano (aggressive expansion). Recent epidemic in Salvage City blamed on their "medical rationing" policy. Secret negotiations with Nuclear City for advanced medical tech threaten Life Alliance. Medical blackmail used against enemies - withholding treatment for political gain. Heavily fortified hospitals hide weapon research.',
        controllingFaction: 'Les Blouses Blanches',
        population: 35000,
        resources: ['medicine', 'medical technology', 'pharmaceuticals', 'biological weapons'],
        threatLevel: 3,
        politicalStance: 'allied' as const,
        tradeRoutes: ['Emergency medical corridors', 'Pharmaceutical smuggling routes'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        scenarioId: defaultScenarioId,
        name: 'Cité du Carburant',
        type: 'settlement' as const,
        description: '« Les Raffineurs » - SECURITY ALERT: Frequent pirate raids targeting fuel convoys. Rumors of "Fuel City" supplying refined petroleum to rogue factions. Internal sabotage suspected after refinery explosion last month. Strict rationing imposed on non-allied states, fueling resentment. Mobility units are heavily armed but stretched thin.',
        controllingFaction: 'Les Raffineurs',
        population: 12000,
        resources: ['fuel', 'technology'],
        threatLevel: 3,
        politicalStance: 'hostile' as const,
        tradeRoutes: ['Armored fuel convoys', 'Smuggled fuel pipelines'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        scenarioId: defaultScenarioId,
        name: 'Cité Industrielle',
        type: 'settlement' as const,
        description: '« Les Forgerons d\'Acier » - TECHNOLOGICAL ARMS RACE: Developing advanced autonomous drones and weapons. Considers the Treaty of Two Braziers obsolete. Clashes with Military City over resource acquisition for war machine production. Internal guilds vie for control of advanced AI research. Preparing for potential preemptive strike against rival industrial powers.',
        controllingFaction: 'Les Forgerons d\'Acier',
        population: 25000,
        resources: ['metal', 'technology', 'machinery', 'weapons manufacturing'],
        threatLevel: 4,
        politicalStance: 'neutral' as const,
        tradeRoutes: ['Component supply lines', 'Weapons export routes'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        scenarioId: defaultScenarioId,
        name: 'Cité de l\'Eau & Alimentation',
        type: 'fortress' as const,
        description: '« Les Gardiens de la Source » - INTERNAL REBELLION: Facing widespread discontent due to water rationing and perceived favoritism towards allied states. Rebel factions, "The Thirsty" and "Seed of Doubt," actively sabotage water purification and distribution. The ruling council is divided on how to quell the unrest, with hardliners advocating for military action.',
        controllingFaction: 'Les Gardiens de la Source',
        population: 18000,
        resources: ['food', 'water', 'seeds', 'agricultural technology'],
        threatLevel: 4,
        politicalStance: 'friendly' as const,
        tradeRoutes: ['Vital water caravans', 'Food distribution networks'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        scenarioId: defaultScenarioId,
        name: 'Cité du Divertissement',
        type: 'trade_hub' as const,
        description: '« Les Faiseurs de Rêves » - PROPAGANDA WARFARE: Broadcasting heavily biased news and entertainment to influence public opinion across the basin. Accused of fabricating reports of atrocities by rival states. Operatives sow discord through underground media networks. The ruling council is secretly funded by multiple factions seeking to control the narrative.',
        controllingFaction: 'Les Faiseurs de Rêves',
        population: 20000,
        resources: ['information', 'entertainment', 'propaganda', 'espionage'],
        threatLevel: 1,
        politicalStance: 'neutral' as const,
        tradeRoutes: ['Information smuggling', 'Cultural exchange (controlled)'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        scenarioId: defaultScenarioId,
        name: 'Nuke City',
        type: 'city' as const,
        description: '« Le Réacteur à Ciel Ouvert » - NUCLEAR DETERRENCE: Possesses the last functional nuclear arsenal. Maintains strict isolation, but its energy output is crucial for several city-states. Intelligence suggests secret development of advanced radiation weaponry. Political climate is paranoid, with constant purges of perceived internal threats. Openly hostile to all external contact.',
        controllingFaction: 'Le Réacteur à Ciel Ouvert',
        population: 8000,
        resources: ['energy', 'technology', 'weapons', 'nuclear materials'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: ['Restricted energy conduits', 'Black market tech sales'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440007',
        scenarioId: defaultScenarioId,
        name: 'Cité des Métaux & Recyclage',
        type: 'settlement' as const,
        description: '« Les Fossoyeurs » - RESOURCE DEPENDENCY: Crucial supplier of metals and salvage, but relies heavily on Fuel City for energy and Medical City for radiation treatments. Facing increased radiation sickness among workers due to unsafe salvage sites. Exploited by larger powers for raw materials, leading to internal calls for greater autonomy.',
        controllingFaction: 'Les Fossoyeurs',
        population: 10000,
        resources: ['metal', 'rare_materials', 'salvage', 'radiation shielding'],
        threatLevel: 3,
        politicalStance: 'neutral' as const,
        tradeRoutes: ['Scrap metal shipments', 'Salvaged technology exchange'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        scenarioId: defaultScenarioId,
        name: 'Cité de l\'Armement & Défense',
        type: 'fortress' as const,
        description: '« Les Arsenaux » - MILITARY HEGEMONY & DEBT: Dominates regional security through its powerful military, but is heavily indebted to Industrial City for advanced components. Facing pressure to deploy forces in the escalating "Water Wars." Internal factions debate whether to remain loyal to the Life Alliance or seek new patrons.',
        controllingFaction: 'Les Arsenaux',
        population: 22000,
        resources: ['weapons', 'explosives', 'armor', 'military hardware'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: ['Arms shipments', 'Mercenary recruitment'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440009',
        scenarioId: defaultScenarioId,
        name: 'L\'Île des Anciens',
        type: 'city' as const,
        description: '« Le Paradis Perdu » - ISOLATIONIST MYSTERY: Highly advanced, self-sufficient, and enigmatic. Rarely interacts with other city-states. Rumored to possess pre-war technology far beyond current understanding. Attempts to establish contact by other factions are met with automated defenses or complete silence. Internal politics are unknown, fueling speculation and desire to breach their isolation.',
        controllingFaction: 'Le Paradis Perdu',
        population: 5000,
        resources: ['pre_war_tech', 'abundant_food', 'clean_water', 'advanced AI'],
        threatLevel: 1,
        politicalStance: 'neutral' as const,
        tradeRoutes: ['Rumored hyperspace routes', 'Sealed diplomatic channels'],
        createdAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        scenarioId: defaultScenarioId,
        name: 'Bunker Oméga',
        type: 'fortress' as const,
        description: '« Les Fantômes d\'Acier » - SHADOW WARFARE & MANIPULATION: Operates from subterranean bases, wielding advanced surveillance and cyber warfare capabilities. Secretly influences surface politics through disinformation campaigns and assassination contracts. Holds vast archives of pre-war data and AI. Primary goal: consolidating power and achieving technological singularity, regardless of the cost to the surface world.',
        controllingFaction: 'Les Fantômes d\'Acier',
        population: 3000,
        resources: ['advanced_tech', 'ai', 'espionage', 'cyber warfare'],
        threatLevel: 5,
        politicalStance: 'hostile' as const,
        tradeRoutes: ['Encrypted data streams', 'Covert agent networks'],
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

      // Add to index
      if (!this.sessionsByUser.has(id)) {
        this.sessionsByUser.set(id, new Set());
      }

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
      const cacheKey = `session:${id}`;
      const cachedSession = this.getFromCache<Session>(cacheKey);

      if (cachedSession) {
        console.log(`[MemStorage] Cache hit for session: ${id}`);
        return cachedSession;
      }

      const session = this.sessions.get(id);

      if (session) {
        console.log(`[MemStorage] Retrieved session: ${session.name} (${session.creatorMode} mode)`);
        this.setCache(cacheKey, session);
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
      const cacheKey = `userSessions:${userId}`;
      const cachedSessions = this.getFromCache<Session[]>(cacheKey);

      if (cachedSessions) {
        console.log(`[MemStorage] Cache hit for user sessions: ${userId}`);
        return cachedSessions;
      }

      const sessionIds = this.sessionsByUser.get(userId);
      if (!sessionIds) {
        console.log(`[MemStorage] No sessions found for user ${userId} via index`);
        return [];
      }

      const sessions = Array.from(sessionIds)
        .map(id => this.sessions.get(id))
        .filter((session): session is Session => session !== undefined);

      console.log(`[MemStorage] Found ${sessions.length} sessions for user ${userId}`);
      const sortedSessions = sessions.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      this.setCache(cacheKey, sortedSessions);
      return sortedSessions;
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
        // Add to index
        if (!this.sessionsByUser.has(insertSession.userId)) {
          this.sessionsByUser.set(insertSession.userId, new Set());
        }
        this.sessionsByUser.get(insertSession.userId)!.add(randomUUID()); // Placeholder, will be corrected after session creation
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

      // Update index after session creation
      if (session.userId) {
        this.sessionsByUser.get(session.userId)!.delete(Array.from(this.sessionsByUser.get(session.userId)!)[0]); // Remove placeholder
        this.sessionsByUser.get(session.userId)!.add(id);
      }

      // Invalidate cache for user sessions if user ID is present
      if (session.userId) {
        this.cache.delete(`userSessions:${session.userId}`);
      }

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

      // Store previous userId to invalidate cache if it changes
      const oldUserId = session.userId;

      const updatedSession = { 
        ...session, 
        ...updates,
        id, // Prevent ID changes
        updatedAt: new Date()
      };

      this.sessions.set(id, updatedSession);

      // Invalidate cache for session and user sessions if relevant fields change
      this.cache.delete(`session:${id}`);
      if (updates.userId !== undefined && updates.userId !== oldUserId) {
        if (oldUserId) this.cache.delete(`userSessions:${oldUserId}`);
        if (updatedSession.userId) this.cache.delete(`userSessions:${updatedSession.userId}`);
      } else if (oldUserId) {
        // If other fields changed, still invalidate the user's session list cache
        this.cache.delete(`userSessions:${oldUserId}`);
      }

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

      // Remove from user index
      if (session.userId && this.sessionsByUser.has(session.userId)) {
        this.sessionsByUser.get(session.userId)!.delete(id);
        // Invalidate user sessions cache
        this.cache.delete(`userSessions:${session.userId}`);
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
          // Remove from node index
          if (this.nodesBySession.has(id)) {
            this.nodesBySession.get(id)!.delete(nodeId);
          }
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
      // Invalidate session cache
      this.cache.delete(`session:${id}`);

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

      const cacheKey = `sessionNodes:${sessionId}`;
      const cachedNodes = this.getFromCache<Node[]>(cacheKey);

      if (cachedNodes) {
        console.log(`[MemStorage] Cache hit for session nodes: ${sessionId}`);
        return cachedNodes;
      }

      const nodeIds = this.nodesBySession.get(sessionId);
      if (!nodeIds) {
        console.log(`[MemStorage] No nodes found for session ${sessionId} via index`);
        return [];
      }

      const nodes = Array.from(nodeIds)
        .map(id => this.nodes.get(id))
        .filter((node): node is Node => node !== undefined);

      console.log(`[MemStorage] Found ${nodes.length} nodes for session ${sessionId}`);
      const sortedNodes = nodes.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
      this.setCache(cacheKey, sortedNodes);
      return sortedNodes;
    } catch (error) {
      console.error(`[MemStorage] Error getting nodes for session '${sessionId}':`, error);
      throw error;
    }
  }

  async getNode(id: string): Promise<Node | undefined> {
    try {
      this.validateId(id, 'getNode');
      const cacheKey = `node:${id}`;
      const cachedNode = this.getFromCache<Node>(cacheKey);

      if (cachedNode) {
        console.log(`[MemStorage] Cache hit for node: ${id}`);
        return cachedNode;
      }

      const node = this.nodes.get(id);

      if (node) {
        console.log(`[MemStorage] Retrieved node: ${node.name} (${node.type})`);
        this.setCache(cacheKey, node);
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
        // Add to index
        if (!this.nodesBySession.has(insertNode.sessionId)) {
          this.nodesBySession.set(insertNode.sessionId, new Set());
        }
        this.nodesBySession.get(insertNode.sessionId)!.add(randomUUID()); // Placeholder
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

      // Update index after node creation
      if (node.sessionId) {
        this.nodesBySession.get(node.sessionId)!.delete(Array.from(this.nodesBySession.get(node.sessionId)!)[0]); // Remove placeholder
        this.nodesBySession.get(node.sessionId)!.add(id);
      }

      // Invalidate cache for session nodes if session ID is present
      if (node.sessionId) {
        this.cache.delete(`sessionNodes:${node.sessionId}`);
      }

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

      const oldSessionId = node.sessionId;

      const updatedNode = { 
        ...node, 
        ...updates,
        id // Prevent ID changes
      };

      this.nodes.set(id, updatedNode);

      // Invalidate cache if session ID changes or other relevant fields change
      if (updates.sessionId !== undefined && updates.sessionId !== oldSessionId) {
        if (oldSessionId) this.cache.delete(`sessionNodes:${oldSessionId}`);
        if (updatedNode.sessionId) this.cache.delete(`sessionNodes:${updatedNode.sessionId}`);
      } else if (oldSessionId) {
        this.cache.delete(`sessionNodes:${oldSessionId}`);
      }
      this.cache.delete(`node:${id}`); // Invalidate node cache

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

      // Remove from session index
      if (node.sessionId && this.nodesBySession.has(node.sessionId)) {
        this.nodesBySession.get(node.sessionId)!.delete(id);
        // Invalidate session nodes cache
        this.cache.delete(`sessionNodes:${node.sessionId}`);
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
      // Invalidate node cache
      this.cache.delete(`node:${id}`);

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

      // Caching not implemented for connections yet, but would follow similar pattern as nodes/sessions

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

      // Caching not implemented for timeline events yet

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

      // Invalidate cache for session timeline if session ID is present and relevant fields change
      if (event.sessionId && (updates.name || updates.phase || updates.orderIndex !== undefined || updates.duration !== undefined || updates.isCompleted !== undefined)) {
        this.cache.delete(`sessionTimeline:${event.sessionId}`);
      }

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

      // Invalidate cache for session timeline if session ID is present
      if (event.sessionId) {
        this.cache.delete(`sessionTimeline:${event.sessionId}`);
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

      // Invalidate cache for session timeline
      this.cache.delete(`sessionTimeline:${sessionId}`);

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
      const cacheKey = `scenario:${id}`;
      const cachedScenario = this.getFromCache<Scenario>(cacheKey);

      if (cachedScenario) {
        console.log(`[MemStorage] Cache hit for scenario: ${id}`);
        return cachedScenario;
      }

      const scenario = this.scenarios.get(id);

      if (scenario) {
        console.log(`[MemStorage] Retrieved scenario: ${scenario.title}`);
        this.setCache(cacheKey, scenario);
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

      const cacheKey = `userScenarios:${userId}`;
      const cachedScenarios = this.getFromCache<Scenario[]>(cacheKey);

      if (cachedScenarios) {
        console.log(`[MemStorage] Cache hit for user scenarios: ${userId}`);
        return cachedScenarios;
      }

      const scenarioIds = this.scenariosByUser.get(userId);
      if (!scenarioIds) {
        console.log(`[MemStorage] No scenarios found for user ${userId} via index`);
        return [];
      }

      const scenarios = Array.from(scenarioIds)
        .map(id => this.scenarios.get(id))
        .filter((scenario): scenario is Scenario => scenario !== undefined);

      console.log(`[MemStorage] Found ${scenarios.length} scenarios for user ${userId}`);
      const sortedScenarios = scenarios.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      this.setCache(cacheKey, sortedScenarios);
      return sortedScenarios;
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

      // Add to user index
      if (scenario.userId) {
        if (!this.scenariosByUser.has(scenario.userId)) {
          this.scenariosByUser.set(scenario.userId, new Set());
        }
        this.scenariosByUser.get(scenario.userId)!.add(id);
      }

      // Invalidate user scenarios cache if user ID is present
      if (scenario.userId) {
        this.cache.delete(`userScenarios:${scenario.userId}`);
      }

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

      const oldUserId = scenario.userId;

      const updatedScenario = { 
        ...scenario, 
        ...updates,
        id, // Prevent ID changes
        updatedAt: new Date()
      };

      this.scenarios.set(id, updatedScenario);

      // Invalidate cache for scenario and user scenarios if relevant fields change
      this.cache.delete(`scenario:${id}`);
      if (updates.userId !== undefined && updates.userId !== oldUserId) {
        if (oldUserId) this.cache.delete(`userScenarios:${oldUserId}`);
        if (updatedScenario.userId) this.cache.delete(`userScenarios:${updatedScenario.userId}`);
      } else if (oldUserId) {
        this.cache.delete(`userScenarios:${oldUserId}`);
      }

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

      // Remove from user index
      if (scenario.userId && this.scenariosByUser.has(scenario.userId)) {
        this.scenariosByUser.get(scenario.userId)!.delete(id);
        // Invalidate user scenarios cache
        this.cache.delete(`userScenarios:${scenario.userId}`);
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
      // Invalidate scenario cache
      this.cache.delete(`scenario:${id}`);

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

      // Caching not implemented for regions yet

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
      // Caching not implemented for regions yet

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

      // Invalidate scenario regions cache if scenario ID is present
      if (region.scenarioId) {
        this.cache.delete(`scenarioRegions:${region.scenarioId}`);
      }

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

      const oldScenarioId = region.scenarioId;

      const updatedRegion = { 
        ...region, 
        ...updates,
        id // Prevent ID changes
      };

      this.regions.set(id, updatedRegion);

      // Invalidate cache if scenario ID changes or other relevant fields change
      if (updates.scenarioId !== undefined && updates.scenarioId !== oldScenarioId) {
        if (oldScenarioId) this.cache.delete(`scenarioRegions:${oldScenarioId}`);
        if (updatedRegion.scenarioId) this.cache.delete(`scenarioRegions:${updatedRegion.scenarioId}`);
      } else if (oldScenarioId) {
        this.cache.delete(`scenarioRegions:${oldScenarioId}`);
      }

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

      // Invalidate scenario regions cache if scenario ID is present
      if (region.scenarioId) {
        this.cache.delete(`scenarioRegions:${region.scenarioId}`);
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

      // Invalidate relevant caches
      if (scenario.userId) this.cache.delete(`userScenarios:${scenario.userId}`);
      if (session.userId) this.cache.delete(`userSessions:${session.userId}`);
      this.cache.delete(`sessionScenarios:${sessionId}`);
      this.cache.delete(`scenarioSessions:${scenarioId}`);


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

        // Invalidate relevant caches
        const scenario = await this.getScenario(scenarioId);
        const session = await this.getSession(sessionId);
        if (scenario?.userId) this.cache.delete(`userScenarios:${scenario.userId}`);
        if (session?.userId) this.cache.delete(`userSessions:${session.userId}`);
        this.cache.delete(`sessionScenarios:${sessionId}`);
        this.cache.delete(`scenarioSessions:${scenarioId}`);


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

      const cacheKey = `sessionScenarios:${sessionId}`;
      const cachedScenarios = this.getFromCache<Scenario[]>(cacheKey);

      if (cachedScenarios) {
        console.log(`[MemStorage] Cache hit for session scenarios: ${sessionId}`);
        return cachedScenarios;
      }

      const links = Array.from(this.scenarioSessions.values())
        .filter(link => link.sessionId === sessionId);

      const scenarios = links
        .map(link => this.scenarios.get(link.scenarioId!))
        .filter(scenario => scenario !== undefined) as Scenario[];

      console.log(`[MemStorage] Found ${scenarios.length} scenarios for session ${sessionId}`);
      const sortedScenarios = scenarios.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      this.setCache(cacheKey, sortedScenarios);
      return sortedScenarios;
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

      const cacheKey = `scenarioSessions:${scenarioId}`;
      const cachedSessions = this.getFromCache<Session[]>(cacheKey);

      if (cachedSessions) {
        console.log(`[MemStorage] Cache hit for scenario sessions: ${scenarioId}`);
        return cachedSessions;
      }

      const links = Array.from(this.scenarioSessions.values())
        .filter(link => link.scenarioId === scenarioId);

      const sessions = links
        .map(link => this.sessions.get(link.sessionId!))
        .filter(session => session !== undefined) as Session[];

      console.log(`[MemStorage] Found ${sessions.length} sessions for scenario ${scenarioId}`);
      const sortedSessions = sessions.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
      this.setCache(cacheKey, sortedSessions);
      return sortedSessions;
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

      // Caching not implemented for NPCs yet

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
      // Caching not implemented for NPCs yet
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

      // Invalidate scenario NPCs cache if scenario ID is present
      if (npc.scenarioId) {
        this.cache.delete(`scenarioNPCs:${npc.scenarioId}`);
      }

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

      // Invalidate cache if scenario ID changes or other relevant fields change
      if (existingNPC.scenarioId && (updates.name || updates.role || updates.status || updates.importance || updates.location || updates.faction)) {
        this.cache.delete(`scenarioNPCs:${existingNPC.scenarioId}`);
      }

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

      // Invalidate scenario NPCs cache if scenario ID is present
      if (npc.scenarioId) {
        this.cache.delete(`scenarioNPCs:${npc.scenarioId}`);
      }

      this.scenarioNPCs.delete(id);
      console.log(`[MemStorage] Deleted NPC: ${npc.name} (${id})`);
    } catch (error) {
      console.error(`[MemStorage] Error deleting NPC '${id}':`, error);
      throw error;
    }
  }

  async suppressScenarioNPC(id: string): Promise<ScenarioNPC> {
    const updatedNPC = await this.updateScenarioNPC(id, { status: 'suppressed' });
    // Cache invalidation is handled within updateScenarioNPC
    return updatedNPC;
  }

  async restoreScenarioNPC(id: string): Promise<ScenarioNPC> {
    const updatedNPC = await this.updateScenarioNPC(id, { status: 'alive' });
    // Cache invalidation is handled within updateScenarioNPC
    return updatedNPC;
  }

  /**
   * SCENARIO QUEST METHODS
   */

  async getScenarioQuests(scenarioId: string): Promise<ScenarioQuest[]> {
    try {
      this.validateId(scenarioId, 'getScenarioQuests');

      // Caching not implemented for quests yet

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
      // Caching not implemented for quests yet
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

      // Invalidate scenario quests cache if scenario ID is present
      if (quest.scenarioId) {
        this.cache.delete(`scenarioQuests:${quest.scenarioId}`);
      }

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

      // Invalidate cache if scenario ID changes or other relevant fields change
      if (existingQuest.scenarioId && (updates.title || updates.description || updates.status || updates.priority || updates.rewards || updates.requirements)) {
        this.cache.delete(`scenarioQuests:${existingQuest.scenarioId}`);
      }

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

      // Invalidate scenario quests cache if scenario ID is present
      if (quest.scenarioId) {
        this.cache.delete(`scenarioQuests:${quest.scenarioId}`);
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

      // Caching not implemented for conditions yet

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
      // Caching not implemented for conditions yet
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

      // Invalidate scenario conditions cache if scenario ID is present
      if (condition.scenarioId) {
        this.cache.delete(`scenarioConditions:${condition.scenarioId}`);
      }

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

      // Invalidate cache if scenario ID changes or other relevant fields change
      if (existingCondition.scenarioId && (updates.name || updates.description || updates.severity || updates.affectedRegions || updates.duration)) {
        this.cache.delete(`scenarioConditions:${existingCondition.scenarioId}`);
      }

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

      // Invalidate scenario conditions cache if scenario ID is present
      if (condition.scenarioId) {
        this.cache.delete(`scenarioConditions:${condition.scenarioId}`);
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

      // Caching not implemented for characters yet

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

      // Caching not implemented for characters yet

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
      // Caching not implemented for characters yet
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

      // Invalidate relevant caches
      if (character.userId) this.cache.delete(`userCharacters:${character.userId}`);
      if (character.sessionId) this.cache.delete(`sessionCharacters:${character.sessionId}`);

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

      // Invalidate relevant caches
      if (existingCharacter.userId) this.cache.delete(`userCharacters:${existingCharacter.userId}`);
      if (existingCharacter.sessionId) this.cache.delete(`sessionCharacters:${existingCharacter.sessionId}`);
      if (updatedCharacter.userId !== existingCharacter.userId && updatedCharacter.userId) this.cache.delete(`userCharacters:${updatedCharacter.userId}`);
      if (updatedCharacter.sessionId !== existingCharacter.sessionId && updatedCharacter.sessionId) this.cache.delete(`sessionCharacters:${updatedCharacter.sessionId}`);


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

      // Invalidate relevant caches
      if (character.userId) this.cache.delete(`userCharacters:${character.userId}`);
      if (character.sessionId) this.cache.delete(`sessionCharacters:${character.sessionId}`);

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

      // Caching not implemented for session players yet

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
      // Caching not implemented for session players yet
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

      // Check if player already exists in session
      const existingPlayer = Array.from(this.sessionPlayers.values())
        .find(p => p.sessionId === insertPlayer.sessionId && p.userId === insertPlayer.userId);
      if (existingPlayer) {
        console.log(`[MemStorage] Player ${insertPlayer.userId} already in session ${insertPlayer.sessionId}`);
        return existingPlayer;
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

      // Invalidate relevant caches
      if (player.sessionId) {
        this.cache.delete(`sessionPlayers:${player.sessionId}`);
      }

      console.log(`[MemStorage] Added player to session: ${player.userId} (${id})`);
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

      // Invalidate session players cache if session ID is present
      if (existingPlayer.sessionId) {
        this.cache.delete(`sessionPlayers:${existingPlayer.sessionId}`);
      }

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

      // Invalidate session players cache if session ID is present
      if (player.sessionId) {
        this.cache.delete(`sessionPlayers:${player.sessionId}`);
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