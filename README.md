
# Dieselpunk GM Assistant

A comprehensive Game Master tool for running Dieselpunk/Wasteland tabletop RPG sessions, inspired by Mad Max and Fallout universes.

## Features

- **Session Management**: Track multi-phase game sessions with timeline and pacing controls
- **AI Event Generation**: OpenAI-powered dynamic event creation based on context
- **Scenario Builder**: Create and manage detailed game worlds and political situations
- **Character & NPC Management**: Track players and generate NPCs
- **Interactive Library**: Reusable story elements with smart categorization
- **Real-time Collaboration**: Support for multiple GMs and session sharing

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Storage**: In-memory (with database migration path)
- **AI**: OpenAI GPT integration
- **Internationalization**: i18next

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components
│   ├── hooks/           # Custom React hooks
│   ├── i18n/           # Internationalization
│   ├── lib/            # Utilities and types
│   └── pages/          # Route components
├── server/             # Express backend
│   ├── middleware/     # Security and validation
│   ├── services/       # OpenAI and external APIs
│   ├── utils/          # Server utilities
│   └── migrations/     # Database schema (future)
└── shared/             # Shared types and schemas
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (for AI features)

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key to .env

# Start development server
npm run dev
```

### Environment Variables
```
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
PORT=5000
```

## Usage

### Creating Sessions
1. Choose creator mode: **Road** (highway adventures) or **City** (settlement politics)
2. Progress through 5 phases: World Building → Planning → Execution → Resolution → Review
3. Use AI generation for dynamic events based on context

### Managing Scenarios
- Build detailed world contexts with political situations
- Create reusable regions, factions, and NPCs
- Link scenarios to sessions for consistent worldbuilding

### AI Features
- Context-aware event generation
- NPC creation with motivations and backstories
- Smart suggestions based on current game state

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

### Security Features
- Input validation and sanitization
- Rate limiting for API endpoints
- CORS protection
- Security headers (CSP, etc.)
- XSS prevention

## Performance Optimizations

- Component memoization for expensive renders
- Debounced user inputs
- Efficient caching layer
- Bundle splitting and lazy loading
- Optimized API queries with indexing

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Roadmap

- [ ] Database persistence (PostgreSQL/SQLite)
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced AI personas for different GM styles
- [ ] Mobile responsive design improvements
- [ ] Plugin system for custom rules
- [ ] Campaign management across multiple scenarios
