-- AI GM Assistant - Wasteland Edition
-- Initial Database Schema Migration
-- Version: 1.0.0
-- Description: Core tables for RPG session management with AI integration

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB operators extension
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Users table - Authentication and user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- bcrypt hashed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add username validation constraint
ALTER TABLE users ADD CONSTRAINT username_length CHECK (length(username) >= 3 AND length(username) <= 50);
ALTER TABLE users ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$');

-- Sessions table - Core RPG session management
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    creator_mode TEXT NOT NULL CHECK (creator_mode IN ('road', 'city')),
    current_phase INTEGER DEFAULT 0 CHECK (current_phase >= 0 AND current_phase <= 4),
    duration INTEGER DEFAULT 0 CHECK (duration >= 0),
    ai_mode TEXT DEFAULT 'continuity' CHECK (ai_mode IN ('chaos', 'continuity')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add session name validation
ALTER TABLE sessions ADD CONSTRAINT session_name_length CHECK (length(name) >= 1 AND length(name) <= 200);

-- Nodes table - Flexible entity storage for scenario elements
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('event', 'npc', 'faction', 'location', 'item')),
    name TEXT NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    x INTEGER DEFAULT 0 CHECK (x >= -10000 AND x <= 10000),
    y INTEGER DEFAULT 0 CHECK (y >= -10000 AND y <= 10000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add node name validation
ALTER TABLE nodes ADD CONSTRAINT node_name_length CHECK (length(name) >= 1 AND length(name) <= 200);

-- Connections table - Relationship mapping between narrative nodes
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    from_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    to_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('temporal', 'spatial', 'factional', 'ownership')),
    strength INTEGER DEFAULT 1 CHECK (strength >= 1 AND strength <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent self-connections
ALTER TABLE connections ADD CONSTRAINT no_self_connections CHECK (from_node_id != to_node_id);

-- Timeline Events table - Sequential event management for structured sessions
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    phase TEXT NOT NULL CHECK (phase IN ('hook', 'exploration', 'rising_tension', 'climax', 'resolution')),
    duration INTEGER DEFAULT 0 CHECK (duration >= 0 AND duration <= 300),
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    creator_mode TEXT NOT NULL CHECK (creator_mode IN ('road', 'city')),
    is_completed TEXT DEFAULT 'false' CHECK (is_completed IN ('true', 'false', 'skipped')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add timeline event name validation
ALTER TABLE timeline_events ADD CONSTRAINT timeline_event_name_length CHECK (length(name) >= 1 AND length(name) <= 200);

-- Ensure unique order within session
CREATE UNIQUE INDEX idx_timeline_events_session_order ON timeline_events(session_id, order_index);

-- Comments for documentation
COMMENT ON TABLE users IS 'User authentication and account management';
COMMENT ON TABLE sessions IS 'RPG sessions with dual creator modes (road/city) and AI integration';
COMMENT ON TABLE nodes IS 'Flexible storage for story elements (events, NPCs, factions, locations, items)';
COMMENT ON TABLE connections IS 'Relationships between story elements for narrative coherence';
COMMENT ON TABLE timeline_events IS 'Sequential events for structured 4-hour RPG sessions';

COMMENT ON COLUMN sessions.creator_mode IS 'Determines session type: road (survival) or city (intrigue)';
COMMENT ON COLUMN sessions.current_phase IS '0-4 for 5-phase structure: Hook→Exploration→Rising Tension→Climax→Resolution';
COMMENT ON COLUMN sessions.ai_mode IS 'AI behavior: chaos (unpredictable) or continuity (logical)';
COMMENT ON COLUMN nodes.properties IS 'JSONB storage for type-specific data (stats, motivations, equipment, etc.)';
COMMENT ON COLUMN connections.strength IS 'Connection importance (1=weak, 5=critical) for AI context weighting';
COMMENT ON COLUMN timeline_events.order_index IS 'Sort order within session for chronological flow';