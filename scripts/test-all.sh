
#!/bin/bash

echo "🧪 Running comprehensive test suite..."

# Exit on any failure
set -e

# Type checking
echo "📋 Running TypeScript type checks..."
npx tsc --noEmit

# Linting
echo "🔍 Running ESLint..."
npx eslint . --ext .ts,.tsx --max-warnings 0

# Frontend tests
echo "🎭 Running frontend tests..."
npm run test -- --coverage --watchAll=false

# Backend tests
echo "⚙️  Running backend tests..."
npm run test:server

# Build test
echo "📦 Testing production build..."
npm run build

# Security audit
echo "🛡️  Running security audit..."
npm audit --audit-level moderate

echo "✅ All tests passed!"
