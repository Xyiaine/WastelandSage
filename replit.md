# AI GM Assistant – Wasteland Edition

## Overview

This project is an AI-powered Game Master assistant application designed specifically for Dieselpunk, Mad Max, and Fallout-inspired tabletop RPG sessions. The application helps GMs build modular 4-hour RPG sessions with dynamic pacing and context-aware event generation. It features two distinct adventure creation modes: "On the Road" for fast-paced survival scenarios and "City/Camp" for intrigue-driven political gameplay. The system uses a node-based scenario library to store and connect events, NPCs, factions, items, and locations, with AI integration to maintain narrative consistency across sessions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a React-based frontend built with Vite and TypeScript. The UI framework is based on shadcn/ui components with Radix UI primitives, providing a comprehensive component library including dialogs, buttons, forms, and layout components. The design system uses a dark theme with a dieselpunk color palette featuring rust, brass, and steel tones to match the post-apocalyptic aesthetic.

The frontend follows a component-based architecture with:
- **Router**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod schema validation
- **UI Components**: shadcn/ui component library built on Radix UI

### Backend Architecture
The backend is built with Express.js and follows a RESTful API pattern. The server architecture includes:
- **Server Framework**: Express.js with TypeScript
- **Development Setup**: Vite integration for hot module replacement in development
- **API Routes**: Modular route handlers for sessions, nodes, connections, and timeline events
- **Storage Layer**: Abstracted storage interface with in-memory implementation (designed for easy database integration)
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

The API design supports CRUD operations for all major entities (sessions, nodes, connections, timeline events) with structured request/response patterns.

### Data Storage Solutions
The application uses Drizzle ORM with PostgreSQL as the primary database solution. The database schema includes:
- **Users**: Authentication and user management
- **Sessions**: Core session management with creator mode, phases, and AI settings
- **Nodes**: Flexible entity storage for events, NPCs, factions, locations, and items
- **Connections**: Relationship mapping between nodes with typed connections
- **Timeline Events**: Sequential event management with ordering and completion tracking

The schema is designed for flexibility with JSONB columns for type-specific properties and supports both temporal and spatial relationships between entities.

### Authentication and Authorization
The system includes a basic user authentication structure with username/password authentication. The implementation uses session-based authentication with user context maintained throughout the application lifecycle.

### External Service Integrations
The application integrates with OpenAI's API for AI-powered content generation:
- **Event Generation**: Context-aware event creation based on session history and connected nodes
- **NPC Generation**: Dynamic character creation with faction and role-based parameters
- **Narrative Consistency**: AI mode selection between "chaos" and "continuity" for different storytelling approaches

The AI integration uses the latest GPT model and includes sophisticated prompt engineering to generate appropriate content for the dieselpunk/post-apocalyptic setting.

## External Dependencies

### Core Technologies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **TypeScript**: Type safety throughout the entire application stack
- **Express.js**: Backend web framework for API development
- **Node.js**: Runtime environment with ES modules support

### Database and ORM
- **Drizzle ORM**: Type-safe database operations and migrations
- **PostgreSQL**: Primary database (configured via DATABASE_URL)
- **Neon Database**: Serverless PostgreSQL hosting solution

### AI and External APIs
- **OpenAI API**: GPT-based content generation and narrative assistance
- **API Integration**: RESTful service integration for AI-powered features

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Unstyled, accessible UI components
- **shadcn/ui**: Pre-built component library with consistent design patterns
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

### State Management and Networking
- **TanStack Query**: Server state management, caching, and synchronization
- **Wouter**: Lightweight client-side routing
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### Development and Replit Integration
- **Replit Plugins**: Development environment integration for hot reloading and error handling
- **TypeScript Compiler**: Type checking and compilation
- **Development Middleware**: Custom logging and request/response tracking