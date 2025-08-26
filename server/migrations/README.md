# Database Migration System

## Overview

This directory contains database migration scripts for the AI GM Assistant - Wasteland Edition application. The migration system ensures consistent database schema evolution across development, staging, and production environments.

## Migration Strategy

### Current State
- **Development**: In-memory storage (MemStorage) for fast iteration
- **Production**: PostgreSQL with Drizzle ORM migrations

### Migration Files Structure
```
migrations/
├── README.md                    # This file
├── 001_initial_schema.sql       # Core tables and relationships
├── 002_add_indexes.sql          # Performance indexes
├── 003_add_constraints.sql      # Data integrity constraints
├── 004_add_triggers.sql         # Audit trails and automatic updates
└── seed/
    ├── test_data.sql           # Development test data
    └── production_defaults.sql # Production default settings
```

## Schema Optimization Features

### 1. Proper Indexing Strategy
- **Primary Keys**: UUID with clustered indexes for fast lookups
- **Foreign Keys**: Indexed for join performance
- **Search Fields**: B-tree indexes on name and description fields
- **Composite Indexes**: Multi-column indexes for common query patterns

### 2. Data Integrity Constraints
- **Foreign Key Constraints**: Enforce referential integrity
- **Check Constraints**: Validate enum values and ranges
- **Unique Constraints**: Prevent duplicate usernames and connections
- **Not Null Constraints**: Ensure required fields are populated

### 3. Performance Optimizations
- **JSONB Indexes**: GIN indexes on properties columns for fast JSON queries
- **Partial Indexes**: Conditional indexes for active/completed states
- **Query Optimization**: Materialized views for complex aggregations

### 4. Audit and Monitoring
- **Triggers**: Automatic timestamp updates on modifications
- **Audit Tables**: Track changes for rollback capabilities
- **Performance Monitoring**: Query statistics and slow query logging

## Migration Commands

### Apply Migrations
```bash
# Development (auto-applied)
npm run dev

# Production
npm run migrate:up

# Rollback
npm run migrate:down
```

### Database Health Check
```bash
# Check schema integrity
npm run db:check

# Performance analysis
npm run db:analyze

# Backup before migration
npm run db:backup
```

## Schema Evolution Guidelines

### 1. Backwards Compatibility
- Always use additive changes when possible
- Provide default values for new columns
- Use feature flags for breaking changes

### 2. Performance Considerations
- Test migrations against production-sized datasets
- Monitor query performance after schema changes
- Use online schema change tools for large tables

### 3. Data Safety
- Always backup before applying migrations
- Test rollback procedures
- Use transactions for atomic changes

## Production Deployment Checklist

- [ ] Schema changes tested in staging environment
- [ ] Migration scripts reviewed for performance impact
- [ ] Backup strategy confirmed and tested
- [ ] Rollback plan documented and tested
- [ ] Monitoring alerts configured for new schema
- [ ] Application code updated to handle schema changes
- [ ] Database connection pooling optimized for new schema

## Troubleshooting

### Common Issues
1. **Foreign Key Violations**: Check data consistency before applying constraints
2. **Index Creation Timeouts**: Create indexes concurrently in production
3. **Migration Rollback Failures**: Ensure all migrations have corresponding down scripts
4. **Performance Degradation**: Monitor query plans and optimize indexes

### Emergency Procedures
1. **Schema Corruption**: Restore from backup and replay transactions
2. **Migration Hanging**: Kill migration process and restart from checkpoint
3. **Data Loss**: Use point-in-time recovery from backup