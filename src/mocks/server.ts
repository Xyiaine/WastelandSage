
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/sessions/:sessionId', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.sessionId,
        name: 'Test Session',
        creatorMode: 'road',
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity'
      })
    );
  }),

  rest.get('/api/scenarios', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Mediterranean Basin 2200',
          worldContext: 'Post-apocalyptic Mediterranean',
          createdAt: new Date().toISOString()
        }
      ])
    );
  }),

  rest.post('/api/sessions', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'new-session-id',
        name: 'New Session',
        creatorMode: 'road',
        currentPhase: 0
      })
    );
  })
];

export const server = setupServer(...handlers);
