import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  creatorMode: text("creator_mode").notNull(), // 'road' or 'city'
  currentPhase: integer("current_phase").default(0),
  duration: integer("duration").default(0), // in minutes
  aiMode: text("ai_mode").default("continuity"), // 'chaos' or 'continuity'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const nodes = pgTable("nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id),
  type: text("type").notNull(), // 'event', 'npc', 'faction', 'location', 'item'
  name: text("name").notNull(),
  description: text("description"),
  properties: jsonb("properties"), // flexible storage for type-specific data
  x: integer("x").default(0), // graph position
  y: integer("y").default(0), // graph position
  createdAt: timestamp("created_at").defaultNow(),
});

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id),
  fromNodeId: varchar("from_node_id").references(() => nodes.id),
  toNodeId: varchar("to_node_id").references(() => nodes.id),
  type: text("type").notNull(), // 'temporal', 'spatial', 'factional', 'ownership'
  strength: integer("strength").default(1), // connection strength 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

export const timelineEvents = pgTable("timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id),
  nodeId: varchar("node_id").references(() => nodes.id),
  name: text("name").notNull(),
  description: text("description"),
  phase: text("phase").notNull(), // 'hook', 'exploration', 'rising_tension', 'climax', 'resolution'
  duration: integer("duration").default(0), // in minutes
  orderIndex: integer("order_index").notNull(),
  creatorMode: text("creator_mode").notNull(), // 'road' or 'city'
  isCompleted: text("is_completed").default("false"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNodeSchema = createInsertSchema(nodes).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  createdAt: true,
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
