export type CreatorMode = 'road' | 'city';
export type AiMode = 'chaos' | 'continuity';
export type SessionPhase = 'hook' | 'exploration' | 'rising_tension' | 'climax' | 'resolution';
export type NodeType = 'event' | 'npc' | 'faction' | 'location' | 'item';
export type ConnectionType = 'temporal' | 'spatial' | 'factional' | 'ownership';
export type PacingAction = 'accelerate' | 'slow' | 'tension' | 'resolve';

export interface SessionData {
  id: string;
  name: string;
  creatorMode: CreatorMode;
  currentPhase: number;
  duration: number;
  aiMode: AiMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeData {
  id: string;
  sessionId: string;
  type: NodeType;
  name: string;
  description?: string;
  properties?: Record<string, any>;
  x: number;
  y: number;
  createdAt: Date;
}

export interface ConnectionData {
  id: string;
  sessionId: string;
  fromNodeId: string;
  toNodeId: string;
  type: ConnectionType;
  strength: number;
  createdAt: Date;
}

export interface TimelineEventData {
  id: string;
  sessionId: string;
  nodeId?: string;
  name: string;
  description?: string;
  phase: SessionPhase;
  duration: number;
  orderIndex: number;
  creatorMode: CreatorMode;
  isCompleted: string;
  timestamp: Date;
}

export interface GeneratedEventData {
  name: string;
  description: string;
  suggestedNodes: Array<{
    type: NodeType;
    name: string;
    description: string;
    properties: Record<string, any>;
  }>;
  suggestedConnections: Array<{
    fromType: string;
    fromName: string;
    toType: string;
    toName: string;
    connectionType: string;
  }>;
  estimatedDuration: number;
  pacingImpact: PacingAction;
}

export interface NPCData {
  name: string;
  description: string;
  type: string;
  properties: {
    faction: string;
    motivation: string;
    equipment: string[];
    secrets: string[];
  };
}
