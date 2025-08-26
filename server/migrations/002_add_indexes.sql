-- AI GM Assistant - Performance Indexes
-- Version: 1.0.0
-- Description: Optimized indexes for fast queries and joins

-- User table indexes
CREATE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Session table indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_creator_mode ON sessions(creator_mode);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX idx_sessions_user_updated ON sessions(user_id, updated_at DESC) WHERE user_id IS NOT NULL;

-- Composite index for session listing
CREATE INDEX idx_sessions_active ON sessions(user_id, creator_mode, updated_at DESC) 
    WHERE user_id IS NOT NULL;

-- Node table indexes
CREATE INDEX idx_nodes_session_id ON nodes(session_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_session_type ON nodes(session_id, type);
CREATE INDEX idx_nodes_name_trgm ON nodes USING gin(name gin_trgm_ops);
CREATE INDEX idx_nodes_created_at ON nodes(created_at DESC);

-- JSONB indexes for node properties
CREATE INDEX idx_nodes_properties_gin ON nodes USING gin(properties);
CREATE INDEX idx_nodes_faction ON nodes USING gin((properties->>'faction')) 
    WHERE properties ? 'faction';
CREATE INDEX idx_nodes_motivation ON nodes USING gin((properties->>'motivation')) 
    WHERE properties ? 'motivation';

-- Spatial indexes for node positioning
CREATE INDEX idx_nodes_position ON nodes(x, y) WHERE x IS NOT NULL AND y IS NOT NULL;

-- Connection table indexes
CREATE INDEX idx_connections_session_id ON connections(session_id);
CREATE INDEX idx_connections_from_node ON connections(from_node_id);
CREATE INDEX idx_connections_to_node ON connections(to_node_id);
CREATE INDEX idx_connections_type ON connections(type);
CREATE INDEX idx_connections_strength ON connections(strength DESC);

-- Composite indexes for connection queries
CREATE INDEX idx_connections_session_type ON connections(session_id, type);
CREATE INDEX idx_connections_nodes ON connections(from_node_id, to_node_id);
CREATE INDEX idx_connections_bidirectional ON connections(to_node_id, from_node_id);

-- Timeline event table indexes
CREATE INDEX idx_timeline_events_session_id ON timeline_events(session_id);
CREATE INDEX idx_timeline_events_node_id ON timeline_events(node_id) WHERE node_id IS NOT NULL;
CREATE INDEX idx_timeline_events_phase ON timeline_events(phase);
CREATE INDEX idx_timeline_events_completion ON timeline_events(is_completed);
CREATE INDEX idx_timeline_events_creator_mode ON timeline_events(creator_mode);

-- Composite indexes for timeline queries
CREATE INDEX idx_timeline_events_session_phase ON timeline_events(session_id, phase, order_index);
CREATE INDEX idx_timeline_events_session_completed ON timeline_events(session_id, is_completed, order_index);

-- Full-text search indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_timeline_events_name_trgm ON timeline_events USING gin(name gin_trgm_ops);
CREATE INDEX idx_timeline_events_description_trgm ON timeline_events USING gin(description gin_trgm_ops) 
    WHERE description IS NOT NULL;

-- Partial indexes for performance
CREATE INDEX idx_sessions_active_only ON sessions(updated_at DESC) 
    WHERE current_phase < 4; -- Active sessions only

CREATE INDEX idx_nodes_with_properties ON nodes(session_id, type) 
    WHERE properties != '{}'; -- Nodes with properties only

CREATE INDEX idx_connections_strong ON connections(session_id, from_node_id, to_node_id) 
    WHERE strength >= 3; -- Strong connections only

CREATE INDEX idx_timeline_events_incomplete ON timeline_events(session_id, order_index) 
    WHERE is_completed = 'false'; -- Incomplete events only

-- Index maintenance
COMMENT ON INDEX idx_sessions_active IS 'Fast lookup for active sessions by user';
COMMENT ON INDEX idx_nodes_session_type IS 'Optimized for filtering nodes by session and type';
COMMENT ON INDEX idx_connections_session_type IS 'Fast connection queries by session and relationship type';
COMMENT ON INDEX idx_timeline_events_session_phase IS 'Chronological event ordering within phases';

-- Analyze tables for optimal query planning
ANALYZE users;
ANALYZE sessions;
ANALYZE nodes;
ANALYZE connections;
ANALYZE timeline_events;