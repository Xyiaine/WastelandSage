-- AI GM Assistant - Automated Triggers and Maintenance
-- Version: 1.0.0
-- Description: Triggers for automatic updates, auditing, and maintenance

-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at columns
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Session statistics tracking
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
DECLARE
    session_duration INTEGER;
    completed_events INTEGER;
    total_events INTEGER;
BEGIN
    -- Calculate session progress when timeline events change
    IF TG_TABLE_NAME = 'timeline_events' THEN
        SELECT 
            COALESCE(SUM(duration), 0),
            COUNT(*) FILTER (WHERE is_completed = 'true'),
            COUNT(*)
        INTO session_duration, completed_events, total_events
        FROM timeline_events 
        WHERE session_id = COALESCE(NEW.session_id, OLD.session_id);
        
        -- Update session duration and phase based on completion
        UPDATE sessions 
        SET 
            duration = session_duration,
            current_phase = CASE 
                WHEN completed_events = 0 THEN 0
                WHEN completed_events::FLOAT / total_events < 0.2 THEN 0  -- Hook
                WHEN completed_events::FLOAT / total_events < 0.4 THEN 1  -- Exploration
                WHEN completed_events::FLOAT / total_events < 0.7 THEN 2  -- Rising Tension
                WHEN completed_events::FLOAT / total_events < 0.9 THEN 3  -- Climax
                ELSE 4  -- Resolution
            END
        WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_stats
    AFTER INSERT OR UPDATE OR DELETE ON timeline_events
    FOR EACH ROW EXECUTE FUNCTION update_session_stats();

-- Node relationship counter
CREATE OR REPLACE FUNCTION update_node_connection_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update connection counts in node properties
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update from_node connection count
        UPDATE nodes 
        SET properties = jsonb_set(
            COALESCE(properties, '{}'),
            '{connection_count}',
            to_jsonb((
                SELECT COUNT(*) FROM connections 
                WHERE from_node_id = NEW.from_node_id OR to_node_id = NEW.from_node_id
            ))
        )
        WHERE id = NEW.from_node_id;
        
        -- Update to_node connection count
        UPDATE nodes 
        SET properties = jsonb_set(
            COALESCE(properties, '{}'),
            '{connection_count}',
            to_jsonb((
                SELECT COUNT(*) FROM connections 
                WHERE from_node_id = NEW.to_node_id OR to_node_id = NEW.to_node_id
            ))
        )
        WHERE id = NEW.to_node_id;
    END IF;
    
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        -- Update old connection counts
        UPDATE nodes 
        SET properties = jsonb_set(
            COALESCE(properties, '{}'),
            '{connection_count}',
            to_jsonb((
                SELECT COUNT(*) FROM connections 
                WHERE from_node_id = OLD.from_node_id OR to_node_id = OLD.from_node_id
            ))
        )
        WHERE id = OLD.from_node_id;
        
        UPDATE nodes 
        SET properties = jsonb_set(
            COALESCE(properties, '{}'),
            '{connection_count}',
            to_jsonb((
                SELECT COUNT(*) FROM connections 
                WHERE from_node_id = OLD.to_node_id OR to_node_id = OLD.to_node_id
            ))
        )
        WHERE id = OLD.to_node_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_connection_count
    AFTER INSERT OR UPDATE OR DELETE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_node_connection_count();

-- Automatic property validation and enrichment
CREATE OR REPLACE FUNCTION enrich_node_properties()
RETURNS TRIGGER AS $$
BEGIN
    -- Add default properties based on node type
    CASE NEW.type
        WHEN 'npc' THEN
            NEW.properties = jsonb_set(
                COALESCE(NEW.properties, '{}'),
                '{default_stats}',
                '{"combat": 5, "social": 5, "technical": 5, "survival": 5}'::jsonb
            );
        WHEN 'location' THEN
            NEW.properties = jsonb_set(
                COALESCE(NEW.properties, '{}'),
                '{environment_type}',
                '"unknown"'::jsonb
            );
        WHEN 'faction' THEN
            NEW.properties = jsonb_set(
                COALESCE(NEW.properties, '{}'),
                '{influence_level}',
                '3'::jsonb
            );
        WHEN 'item' THEN
            NEW.properties = jsonb_set(
                COALESCE(NEW.properties, '{}'),
                '{condition}',
                '"good"'::jsonb
            );
        ELSE
            -- Event or custom type
            NEW.properties = COALESCE(NEW.properties, '{}');
    END CASE;
    
    -- Add metadata
    NEW.properties = jsonb_set(
        NEW.properties,
        '{last_modified}',
        to_jsonb(NOW())
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enrich_node_properties
    BEFORE INSERT OR UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION enrich_node_properties();

-- Cleanup old audit log entries (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_audit_log()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_log 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Log cleanup operation
    INSERT INTO audit_log (table_name, operation, new_data, timestamp)
    VALUES ('audit_log', 'CLEANUP', jsonb_build_object('cleaned_at', NOW()), NOW());
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension in production)
-- SELECT cron.schedule('cleanup-audit-log', '0 2 * * *', 'SELECT cleanup_audit_log();');

-- Database statistics collection
CREATE OR REPLACE FUNCTION collect_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        last_vacuum,
        last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY size_bytes DESC;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    'sessions' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE current_phase < 4) as active_count,
    AVG(duration) as avg_duration,
    MAX(updated_at) as last_activity
FROM sessions
UNION ALL
SELECT 
    'nodes' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE session_id IS NOT NULL) as active_count,
    NULL as avg_duration,
    MAX(created_at) as last_activity
FROM nodes
UNION ALL
SELECT 
    'connections' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) as active_count,
    AVG(strength) as avg_duration,
    MAX(created_at) as last_activity
FROM connections
UNION ALL
SELECT 
    'timeline_events' as entity_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_completed = 'false') as active_count,
    AVG(duration) as avg_duration,
    MAX(timestamp) as last_activity
FROM timeline_events;

-- Comments for documentation
COMMENT ON FUNCTION update_session_stats() IS 'Automatically updates session duration and phase based on timeline event completion';
COMMENT ON FUNCTION update_node_connection_count() IS 'Maintains connection count in node properties for quick access';
COMMENT ON FUNCTION enrich_node_properties() IS 'Adds default properties and metadata to nodes based on their type';
COMMENT ON FUNCTION cleanup_audit_log() IS 'Removes old audit log entries to prevent table bloat';
COMMENT ON VIEW performance_summary IS 'Provides quick overview of system usage and performance metrics';