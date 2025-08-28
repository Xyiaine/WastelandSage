/**
 * Database Schema for AI GM Assistant - Wasteland Edition
 * 
 * This file defines the PostgreSQL database schema using Drizzle ORM.
 * The schema supports a tabletop RPG session management system with:
 * - User authentication and session management
 * - Node-based scenario library (events, NPCs, factions, locations, items)
 * - Timeline event management for structured 4-hour sessions
 * - Connection system for narrative relationships
 * 
 * Schema Design Principles:
 * - Flexible JSONB storage for type-specific properties
 * - Foreign key relationships for data integrity
 * - Timestamps for audit trails
 * - Nullable fields to support optional relationships
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Users table - Stores authentication information
 * 
 * Fields:
 * - id: UUID primary key (auto-generated)
 * - username: Unique username for login
 * - password: Hashed password (should be bcrypt hashed before storage)
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // TODO: Add password validation in app layer
});

/**
 * Sessions table - Core RPG session management
 * 
 * Represents a 4-hour tabletop RPG session with dual creator modes:
 * - "road": Fast-paced survival scenarios for wasteland travel
 * - "city": Intrigue-driven political gameplay in settlements
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to session creator (nullable for shared sessions)
 * - name: Human-readable session name
 * - creatorMode: Determines event types and pacing ('road' | 'city')
 * - currentPhase: Current session phase (0-4: Hook→Exploration→Rising Tension→Climax→Resolution)
 * - duration: Total session time in minutes
 * - aiMode: AI behavior ('chaos' for unpredictable, 'continuity' for logical)
 * - createdAt/updatedAt: Audit timestamps
 */
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Nullable for collaborative sessions
  name: text("name").notNull(),
  creatorMode: text("creator_mode").notNull(), // 'road' | 'city' - validated in app layer
  currentPhase: integer("current_phase").default(0), // 0-4 for 5-phase structure
  duration: integer("duration").default(0), // Session duration in minutes
  aiMode: text("ai_mode").default("continuity"), // 'chaos' | 'continuity'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Nodes table - Flexible entity storage for scenario elements
 * 
 * Stores all narrative elements in a unified structure:
 * - Events: Plot points, encounters, discoveries
 * - NPCs: Characters with motivations and connections
 * - Factions: Groups with agendas and relationships
 * - Locations: Places with descriptions and connections
 * - Items: Objects with properties and ownership
 * 
 * Fields:
 * - id: UUID primary key
 * - sessionId: Foreign key to owning session (nullable for reusable nodes)
 * - type: Node category for filtering and behavior
 * - name: Display name for the entity
 * - description: Detailed narrative description
 * - properties: JSONB for type-specific data (stats, motivations, etc.)
 * - x, y: Graph coordinates for visual node positioning
 * - createdAt: Creation timestamp
 */
export const nodes = pgTable("nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id), // Nullable for shared/template nodes
  type: text("type").notNull(), // 'event' | 'npc' | 'faction' | 'location' | 'item'
  name: text("name").notNull(),
  description: text("description"), // Nullable for quick creation
  properties: jsonb("properties"), // Type-specific data: {faction: string, motivation: string, etc.}
  x: integer("x").default(0), // Visual graph X coordinate
  y: integer("y").default(0), // Visual graph Y coordinate  
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Connections table - Relationship mapping between narrative nodes
 * 
 * Defines how story elements relate to each other for:
 * - Temporal: Sequence of events, cause-and-effect
 * - Spatial: Geographic relationships, travel routes
 * - Factional: Allegiances, conflicts, hierarchies
 * - Ownership: Who owns what, territorial control
 * 
 * Fields:
 * - id: UUID primary key
 * - sessionId: Foreign key to session (nullable for cross-session relationships)
 * - fromNodeId/toNodeId: Connected nodes (nullable during creation)
 * - type: Relationship category for filtering and AI context
 * - strength: Connection intensity (1=weak, 5=critical) for AI weighting
 * - createdAt: Creation timestamp
 */
export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id), // Nullable for cross-session connections
  fromNodeId: varchar("from_node_id").references(() => nodes.id), // Source node
  toNodeId: varchar("to_node_id").references(() => nodes.id), // Target node
  type: text("type").notNull(), // 'temporal' | 'spatial' | 'factional' | 'ownership'
  strength: integer("strength").default(1), // 1-5 scale for AI context weighting
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Timeline Events table - Sequential event management for structured sessions
 * 
 * Manages the chronological flow of a 4-hour RPG session using a 5-phase structure:
 * 1. Hook: Opening scene, establishes stakes (15-30 min)
 * 2. Exploration: Investigation, character development (60-90 min)
 * 3. Rising Tension: Complications, obstacles (60-90 min)
 * 4. Climax: Major confrontation, decision point (30-45 min)
 * 5. Resolution: Consequences, setup for next session (15-30 min)
 * 
 * Fields:
 * - id: UUID primary key
 * - sessionId: Foreign key to session (nullable for template events)
 * - nodeId: Optional link to associated story node
 * - name: Event title for timeline display
 * - description: Detailed event content and GM notes
 * - phase: Session phase for pacing control
 * - duration: Estimated time in minutes for pacing
 * - orderIndex: Sort order within phase
 * - creatorMode: Mode context for appropriate event types
 * - isCompleted: Completion status for session tracking
 * - timestamp: When event was added/scheduled
 */
export const timelineEvents = pgTable("timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id), // Nullable for template events
  nodeId: varchar("node_id").references(() => nodes.id), // Optional connection to story node
  name: text("name").notNull(),
  description: text("description"), // GM notes and event details
  phase: text("phase").notNull(), // 'hook' | 'exploration' | 'rising_tension' | 'climax' | 'resolution'
  duration: integer("duration").default(0), // Estimated duration in minutes
  orderIndex: integer("order_index").notNull(), // Sort order within session
  creatorMode: text("creator_mode").notNull(), // 'road' | 'city' for context
  isCompleted: text("is_completed").default("false"), // 'true' | 'false' | 'skipped'
  timestamp: timestamp("timestamp").defaultNow(),
});

/**
 * Zod Insert Schemas - Runtime validation for API requests
 * 
 * These schemas validate incoming data before database insertion,
 * omitting auto-generated fields and providing runtime type safety.
 */

// User creation schema - excludes auto-generated ID
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  // Add validation rules
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8).max(100), // Should be hashed before storage
});

// Session creation schema - excludes auto-generated fields
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Add validation rules
  name: z.string().min(1).max(200),
  creatorMode: z.enum(["road", "city"]),
  currentPhase: z.number().int().min(0).max(4).optional(),
  duration: z.number().int().min(0).max(600).optional(), // Max 10 hours
  aiMode: z.enum(["chaos", "continuity"]).optional(),
});

// Node creation schema
export const insertNodeSchema = createInsertSchema(nodes).omit({
  id: true,
  createdAt: true,
}).extend({
  // Add validation rules
  type: z.enum(["event", "npc", "faction", "location", "item"]),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  x: z.number().int().optional(),
  y: z.number().int().optional(),
});

// Connection creation schema
export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
}).extend({
  // Add validation rules
  type: z.enum(["temporal", "spatial", "factional", "ownership"]),
  strength: z.number().int().min(1).max(5).optional(),
});

// Timeline event creation schema
export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  timestamp: true,
}).extend({
  // Add validation rules
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  phase: z.enum(["hook", "exploration", "rising_tension", "climax", "resolution"]),
  duration: z.number().int().min(0).max(300).optional(), // Max 5 hours per event
  orderIndex: z.number().int().min(0),
  creatorMode: z.enum(["road", "city"]),
  isCompleted: z.enum(["true", "false", "skipped"]).optional(),
});

/**
 * TypeScript Types - Inferred from schemas for type safety
 * 
 * Insert types: For creating new records (validated input)
 * Select types: For database queries (includes all fields)
 */

// User types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Session types
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Node types
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;

// Connection types
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

// Timeline event types
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEvents.$inferSelect;

/**
 * Scenarios table - Main scenario/campaign management
 * 
 * Stores high-level campaign information and world-building elements:
 * - Main story concepts and themes
 * - Regional politics and factions
 * - Key locations and their relationships
 * - Overarching narrative elements
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to scenario creator
 * - title: Main scenario name/title
 * - mainIdea: Core concept and themes for the scenario
 * - worldContext: Background information about the world/setting
 * - politicalSituation: Current political climate and tensions
 * - keyThemes: Major themes and narrative elements
 * - status: Current scenario development status
 * - createdAt/updatedAt: Audit timestamps
 */
export const scenarios = pgTable("scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  mainIdea: text("main_idea").notNull(), // Core concept and central themes
  worldContext: text("world_context"), // Background setting information
  politicalSituation: text("political_situation"), // Current political climate
  keyThemes: jsonb("key_themes"), // Array of themes: ["survival", "politics", "mystery"]
  status: text("status").default("draft"), // 'draft' | 'active' | 'completed' | 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Regions table - Geographic/political areas within scenarios
 * 
 * Represents major areas that control or influence the game world:
 * - Cities, settlements, and territories
 * - Controlling factions and their influence
 * - Resources and strategic importance
 * - Relationships with other regions
 * 
 * Fields:
 * - id: UUID primary key
 * - scenarioId: Foreign key to owning scenario
 * - name: Region name (e.g., "New Angeles", "The Wastes")
 * - type: Region classification for gameplay mechanics
 * - description: Detailed region description
 * - controllingFaction: Dominant faction or power
 * - population: Estimated population or influence
 * - resources: Available resources and strategic assets
 * - threatLevel: Danger rating for player reference
 * - politicalStance: Current political alignment
 * - tradeRoutes: Connected regions for travel/commerce
 * - createdAt: Creation timestamp
 */
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").references(() => scenarios.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub' | 'industrial'
  description: text("description"),
  controllingFaction: text("controlling_faction"), // Name of controlling faction
  population: integer("population"), // Population size or influence level
  resources: jsonb("resources"), // Array of resources: ["water", "fuel", "weapons"]
  threatLevel: integer("threat_level").default(1), // 1-5 scale for danger assessment
  politicalStance: text("political_stance"), // 'hostile' | 'neutral' | 'friendly' | 'allied'
  tradeRoutes: jsonb("trade_routes"), // Array of connected region IDs
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Scenario Sessions table - Links scenarios to specific game sessions
 * 
 * Many-to-many relationship allowing scenarios to span multiple sessions
 * and sessions to draw from multiple scenarios for flexibility.
 */
export const scenarioSessions = pgTable("scenario_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").references(() => scenarios.id),
  sessionId: varchar("session_id").references(() => sessions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scenario creation schema
export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  mainIdea: z.string().min(10, "Main idea must be at least 10 characters").max(10000, "Main idea must be under 10000 characters"),
  worldContext: z.string().max(10000, "World context must be under 10000 characters").optional().nullable(),
  politicalSituation: z.string().max(10000, "Political situation must be under 10000 characters").optional().nullable(),
  keyThemes: z.array(z.string()).optional().nullable().default([]),
  status: z.enum(["draft", "active", "completed", "archived"]).optional().default("draft"),
  userId: z.string().optional().nullable(), // Allow userId to be passed in requests
});

// Region creation schema
export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1).max(200),
  type: z.enum(["city", "settlement", "wasteland", "fortress", "trade_hub", "industrial"]),
  description: z.string().max(3000).optional(),
  controllingFaction: z.string().max(200).optional(),
  population: z.number().int().min(0).optional(),
  resources: z.array(z.string()).optional(),
  threatLevel: z.number().int().min(1).max(5).optional(),
  politicalStance: z.enum(["hostile", "neutral", "friendly", "allied"]).optional(),
  tradeRoutes: z.array(z.string()).optional(),
});

// Scenario session link schema
export const insertScenarioSessionSchema = createInsertSchema(scenarioSessions).omit({
  id: true,
  createdAt: true,
});

/**
 * Utility types for common operations
 */
export type CreatorMode = "road" | "city";
export type AiMode = "chaos" | "continuity";
export type NodeType = "event" | "npc" | "faction" | "location" | "item";
export type ConnectionType = "temporal" | "spatial" | "factional" | "ownership";
export type SessionPhase = "hook" | "exploration" | "rising_tension" | "climax" | "resolution";
export type CompletionStatus = "true" | "false" | "skipped";
export type ScenarioStatus = "draft" | "active" | "completed" | "archived";
export type RegionType = "city" | "settlement" | "wasteland" | "fortress" | "trade_hub" | "industrial";
export type PoliticalStance = "hostile" | "neutral" | "friendly" | "allied";

// New types for scenario management
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;
export type InsertScenarioSession = z.infer<typeof insertScenarioSessionSchema>;
export type ScenarioSession = typeof scenarioSessions.$inferSelect;
