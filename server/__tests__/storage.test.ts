
import { MemoryStorage } from '../storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('Session Management', () => {
    test('creates session with valid data', () => {
      const sessionData = {
        name: 'Test Session',
        creatorMode: 'road' as const,
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity' as const
      };

      const session = storage.createSession(sessionData);
      
      expect(session.id).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.creatorMode).toBe('road');
    });

    test('retrieves session by id', () => {
      const sessionData = {
        name: 'Test Session',
        creatorMode: 'road' as const,
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity' as const
      };

      const created = storage.createSession(sessionData);
      const retrieved = storage.getSession(created.id);
      
      expect(retrieved).toEqual(created);
    });

    test('updates session data', () => {
      const sessionData = {
        name: 'Test Session',
        creatorMode: 'road' as const,
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity' as const
      };

      const session = storage.createSession(sessionData);
      const updated = storage.updateSession(session.id, { name: 'Updated Session' });
      
      expect(updated?.name).toBe('Updated Session');
    });

    test('deletes session', () => {
      const sessionData = {
        name: 'Test Session',
        creatorMode: 'road' as const,
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity' as const
      };

      const session = storage.createSession(sessionData);
      const deleted = storage.deleteSession(session.id);
      const retrieved = storage.getSession(session.id);
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });
  });
});
