/**
 * OpenAI Service - AI-powered content generation for RPG sessions
 * 
 * This service provides intelligent content generation for the Wasteland Edition GM Assistant:
 * - Context-aware event generation based on session history
 * - Dynamic NPC creation with appropriate motivations and backstories
 * - Narrative consistency maintenance across sessions
 * - Dieselpunk/Mad Max/Fallout thematic consistency
 * 
 * Features:
 * - Dual AI modes: 'chaos' for unpredictable events, 'continuity' for logical progression
 * - Creator mode awareness: different content for 'road' vs 'city' scenarios
 * - Connection suggestions for narrative coherence
 * - Pacing control integration
 * - Comprehensive error handling and fallbacks
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

/**
 * Custom error classes for AI service operations
 */
export class AIServiceError extends Error {
  constructor(message: string, public code: string = 'AI_SERVICE_ERROR', public originalError?: Error) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIGenerationError extends AIServiceError {
  constructor(message: string, originalError?: Error) {
    super(`AI generation failed: ${message}`, 'AI_GENERATION_ERROR', originalError);
    this.name = 'AIGenerationError';
  }
}

export class AIValidationError extends AIServiceError {
  constructor(message: string) {
    super(`AI response validation failed: ${message}`, 'AI_VALIDATION_ERROR');
    this.name = 'AIValidationError';
  }
}

/**
 * Context interface for AI event generation
 * Provides comprehensive information for creating contextually appropriate events
 */
export interface EventGenerationContext {
  sessionId: string;
  creatorMode: 'road' | 'city';
  currentPhase: string;
  aiMode: 'chaos' | 'continuity';
  
  // Session history for narrative continuity
  recentEvents: Array<{
    name: string;
    description: string;
    phase: string;
  }>;
  
  // Connected story elements for integration
  connectedNodes: Array<{
    type: string;
    name: string;
    description: string;
  }>;
  
  // Optional environmental context
  environment?: string;        // e.g., "desert wasteland", "ruined city", "underground bunker"
  threatLevel?: string;        // e.g., "low", "medium", "high", "extreme"
  timeOfDay?: string;         // e.g., "dawn", "noon", "dusk", "night"
  weather?: string;           // e.g., "sandstorm", "acid rain", "clear skies"
  playerCount?: number;       // Number of players for scaling
}

/**
 * Generated event structure with all necessary components for GM use
 */
export interface GeneratedEvent {
  name: string;               // Short, memorable event title
  description: string;        // Detailed GM description with setting, NPCs, situation
  
  // Story elements to add to the scenario library
  suggestedNodes: Array<{
    type: 'event' | 'npc' | 'faction' | 'location' | 'item';
    name: string;
    description: string;
    properties: Record<string, any>; // Type-specific data (stats, motivations, etc.)
  }>;
  
  // Narrative connections to existing story elements
  suggestedConnections: Array<{
    fromType: string;          // Type of existing element
    fromName: string;          // Name of existing element
    toType: string;            // Type of new element
    toName: string;            // Name of new element
    connectionType: 'temporal' | 'spatial' | 'factional' | 'ownership';
    reasoning?: string;        // Why this connection makes sense
  }>;
  
  estimatedDuration: number;  // Duration in minutes for pacing
  pacingImpact: 'accelerate' | 'slow' | 'tension' | 'resolve';
  
  // Additional GM tools
  gameplayTips?: string[];    // Suggestions for running the event
  alternativeOutcomes?: string[]; // Different ways the event could resolve
  requiredPreparation?: string[]; // What the GM needs to prep
}

/**
 * Generate AI-powered RPG event with comprehensive context awareness
 * 
 * @param context - Session context for appropriate event generation
 * @returns Promise<GeneratedEvent> - Complete event with nodes and connections
 * @throws AIGenerationError - When generation fails
 * @throws AIValidationError - When response validation fails
 */
export async function generateEvent(context: EventGenerationContext): Promise<GeneratedEvent> {
  // Input validation
  if (!context.sessionId || !context.creatorMode || !context.currentPhase || !context.aiMode) {
    throw new AIValidationError('Missing required context fields for event generation');
  }
  
  if (!['road', 'city'].includes(context.creatorMode)) {
    throw new AIValidationError(`Invalid creator mode: ${context.creatorMode}`);
  }
  
  if (!['chaos', 'continuity'].includes(context.aiMode)) {
    throw new AIValidationError(`Invalid AI mode: ${context.aiMode}`);
  }

  console.log(`[OpenAI] Generating ${context.creatorMode} event for phase ${context.currentPhase} (${context.aiMode} mode)`);
  
  const prompt = createEventPrompt(context);
  
  try {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(context)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: context.aiMode === 'chaos' ? 0.8 : 0.4,
      max_tokens: 2000, // Ensure sufficient space for detailed responses
    });

    const generationTime = Date.now() - startTime;
    console.log(`[OpenAI] Event generated in ${generationTime}ms`);

    if (!response.choices[0]?.message?.content) {
      throw new AIGenerationError('OpenAI returned empty response');
    }

    const result = JSON.parse(response.choices[0].message.content);
    const validatedEvent = validateGeneratedEvent(result);
    
    console.log(`[OpenAI] Generated event: ${validatedEvent.name} (${validatedEvent.pacingImpact} impact)`);
    return validatedEvent;
    
  } catch (error) {
    console.error('[OpenAI] Event generation failed:', error);
    
    if (error instanceof SyntaxError) {
      throw new AIValidationError(`Invalid JSON response from AI: ${error.message}`);
    }
    
    if (error instanceof AIServiceError) {
      throw error; // Re-throw our custom errors
    }
    
    // Handle OpenAI API errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        throw new AIGenerationError('Rate limit exceeded. Please try again in a moment.', error);
      }
      if (error.message.includes('API key')) {
        throw new AIGenerationError('Invalid API key configuration', error);
      }
      if (error.message.includes('network')) {
        throw new AIGenerationError('Network error connecting to AI service', error);
      }
    }
    
    throw new AIGenerationError(
      `Unexpected error during event generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create system prompt based on context for better AI responses
 */
function getSystemPrompt(context: EventGenerationContext): string {
  const modeDescription = context.creatorMode === 'road' 
    ? 'survival-focused wasteland travel with resource scarcity, vehicle encounters, and environmental hazards'
    : 'intrigue-driven settlement politics with faction conflicts, social maneuvering, and resource control';
    
  const aiModeDescription = context.aiMode === 'chaos'
    ? 'Create unpredictable, high-action events that shake up the status quo'
    : 'Generate logical events that build on existing narrative threads';

  return `You are an expert RPG Game Master assistant specializing in dieselpunk/Mad Max/Fallout post-apocalyptic settings.

Your role: Generate contextually appropriate events for ${modeDescription}.

AI Mode Instructions: ${aiModeDescription}.

Core Principles:
- Maintain thematic consistency with the dieselpunk aesthetic (rust, metal, survival, scavenged technology)
- Create meaningful player choices with consequences
- Build on existing story elements when possible
- Ensure events fit the current session phase and pacing needs
- Provide rich sensory details and atmospheric descriptions
- Include clear GM guidance for running the event

Always respond with valid JSON in the exact format specified.`;
}

/**
 * Create detailed prompt for AI event generation
 * Includes all context and specific formatting requirements
 */
function createEventPrompt(context: EventGenerationContext): string {
  const scenarioType = context.creatorMode === 'road' ? 'wasteland road' : 'settlement/city';
  const focusType = context.creatorMode === 'road' ? 'survival/action-focused' : 'intrigue/social-focused';
  const aiModeDesc = context.aiMode === 'chaos' ? 'unpredictable, high-action' : 'logical, story-consistent';
  
  let prompt = `Generate an RPG event for a ${scenarioType} scenario in a dieselpunk post-apocalyptic setting.

**Session Context:**
- Current phase: ${context.currentPhase}
- Creator mode: ${context.creatorMode}
- AI Mode: ${context.aiMode} (${aiModeDesc})
- Session ID: ${context.sessionId}`;

  // Add optional context if provided
  if (context.environment) {
    prompt += `\n- Environment: ${context.environment}`;
  }

  if (context.threatLevel) {
    prompt += `\n- Threat Level: ${context.threatLevel}`;
  }
  
  if (context.timeOfDay) {
    prompt += `\n- Time of Day: ${context.timeOfDay}`;
  }
  
  if (context.weather) {
    prompt += `\n- Weather: ${context.weather}`;
  }
  
  if (context.playerCount) {
    prompt += `\n- Player Count: ${context.playerCount}`;
  }

  // Include recent events for continuity
  if (context.recentEvents.length > 0) {
    prompt += `\n\n**Recent Session Events (for continuity):**`;
    context.recentEvents.slice(-3).forEach((event, i) => { // Limit to last 3 events
      prompt += `\n${i + 1}. "${event.name}" (${event.phase}): ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}`;
    });
  }

  // Include connected story elements
  if (context.connectedNodes.length > 0) {
    prompt += `\n\n**Existing Story Elements (consider connections):**`;
    context.connectedNodes.slice(0, 5).forEach(node => { // Limit to 5 nodes
      prompt += `\n- ${node.type.toUpperCase()}: "${node.name}" - ${node.description.substring(0, 150)}${node.description.length > 150 ? '...' : ''}`;
    });
  }

  // Generation requirements
  prompt += `\n\n**Generate a ${focusType} event that:**
1. Fits naturally into the current narrative context
2. Creates meaningful player choices with consequences
3. Can connect to existing story elements when appropriate
4. Maintains strong dieselpunk aesthetic (rust, metal, scavenged tech, survival themes)
5. Is appropriate for the current session phase
6. Provides clear GM guidance for execution

**Required JSON Response Format:**
\`\`\`json
{
  "name": "Brief, evocative event title (3-6 words)",
  "description": "Detailed 2-3 paragraph description including: setting details, NPCs present, immediate situation, player hooks, and atmospheric elements. Include specific dieselpunk details.",
  "suggestedNodes": [
    {
      "type": "event|npc|faction|location|item",
      "name": "Descriptive name",
      "description": "Detailed description with relevant properties",
      "properties": {
        "faction": "relevant faction or independent",
        "motivation": "clear goal or drive",
        "resources": ["item1", "item2"],
        "threat_level": "low|medium|high",
        "special_abilities": ["ability1", "ability2"]
      }
    }
  ],
  "suggestedConnections": [
    {
      "fromType": "type of existing element",
      "fromName": "exact name of existing element",
      "toType": "type of new element", 
      "toName": "exact name of new element",
      "connectionType": "temporal|spatial|factional|ownership",
      "reasoning": "Brief explanation of why this connection makes narrative sense"
    }
  ],
  "estimatedDuration": "Duration in minutes (15-60)",
  "pacingImpact": "accelerate|slow|tension|resolve",
  "gameplayTips": ["Tip 1 for running this event", "Tip 2 for potential complications"],
  "alternativeOutcomes": ["Outcome 1 if players choose path A", "Outcome 2 if players choose path B"],
  "requiredPreparation": ["What GM needs to prep", "Any maps or props needed"]
}
\`\`\`

**Important:** Respond ONLY with the JSON object. No additional text or formatting.`;

  return prompt;
}

/**
 * Comprehensive validation of AI-generated event responses
 * Ensures all required fields are present and valid
 */
function validateGeneratedEvent(result: any): GeneratedEvent {
  // Check basic structure
  if (!result || typeof result !== 'object') {
    throw new AIValidationError('Response is not a valid object');
  }

  // Validate required fields
  if (!result.name || typeof result.name !== 'string' || result.name.trim() === '') {
    throw new AIValidationError('Event name is required and must be a non-empty string');
  }

  if (!result.description || typeof result.description !== 'string' || result.description.trim() === '') {
    throw new AIValidationError('Event description is required and must be a non-empty string');
  }

  // Validate optional arrays
  const suggestedNodes = Array.isArray(result.suggestedNodes) ? result.suggestedNodes : [];
  const suggestedConnections = Array.isArray(result.suggestedConnections) ? result.suggestedConnections : [];
  const gameplayTips = Array.isArray(result.gameplayTips) ? result.gameplayTips : [];
  const alternativeOutcomes = Array.isArray(result.alternativeOutcomes) ? result.alternativeOutcomes : [];
  const requiredPreparation = Array.isArray(result.requiredPreparation) ? result.requiredPreparation : [];

  // Validate suggested nodes
  for (const node of suggestedNodes) {
    if (!node.type || !['event', 'npc', 'faction', 'location', 'item'].includes(node.type)) {
      throw new AIValidationError(`Invalid node type: ${node.type}`);
    }
    if (!node.name || typeof node.name !== 'string') {
      throw new AIValidationError('Node name is required');
    }
    if (!node.description || typeof node.description !== 'string') {
      throw new AIValidationError('Node description is required');
    }
  }

  // Validate suggested connections
  for (const connection of suggestedConnections) {
    if (!connection.connectionType || 
        !['temporal', 'spatial', 'factional', 'ownership'].includes(connection.connectionType)) {
      throw new AIValidationError(`Invalid connection type: ${connection.connectionType}`);
    }
    if (!connection.fromType || !connection.fromName || !connection.toType || !connection.toName) {
      throw new AIValidationError('Connection must have fromType, fromName, toType, and toName');
    }
  }

  // Validate numeric fields
  const estimatedDuration = typeof result.estimatedDuration === 'number' 
    ? Math.max(5, Math.min(300, result.estimatedDuration)) // Clamp between 5-300 minutes
    : 30;

  // Validate pacing impact
  const validPacingImpacts = ['accelerate', 'slow', 'tension', 'resolve'];
  const pacingImpact = validPacingImpacts.includes(result.pacingImpact) 
    ? result.pacingImpact 
    : 'slow';

  console.log(`[OpenAI] Validated event with ${suggestedNodes.length} nodes and ${suggestedConnections.length} connections`);

  return {
    name: result.name.trim(),
    description: result.description.trim(),
    suggestedNodes,
    suggestedConnections,
    estimatedDuration,
    pacingImpact,
    gameplayTips,
    alternativeOutcomes,
    requiredPreparation
  };
}

/**
 * Interface for NPC generation context
 */
export interface NPCGenerationContext {
  setting: 'road' | 'city';
  faction?: string;
  role?: string;
  threatLevel?: 'low' | 'medium' | 'high';
  relationship?: 'ally' | 'neutral' | 'enemy' | 'unknown';
  importance?: 'minor' | 'major' | 'critical';
}

/**
 * Generated NPC structure
 */
export interface GeneratedNPC {
  name: string;
  description: string;
  type: string;
  properties: {
    faction: string;
    motivation: string;
    equipment: string[];
    secrets: string[];
    stats?: Record<string, number>;
    relationships?: Record<string, string>;
    backstory?: string;
  };
}

/**
 * Generate AI-powered NPC with detailed backstory and motivations
 * 
 * @param context - NPC generation context and requirements
 * @returns Promise<GeneratedNPC> - Complete NPC with properties
 * @throws AIGenerationError - When generation fails
 * @throws AIValidationError - When response validation fails
 */
export async function generateNPC(context: NPCGenerationContext): Promise<GeneratedNPC> {
  // Input validation
  if (!context.setting || !['road', 'city'].includes(context.setting)) {
    throw new AIValidationError(`Invalid setting: ${context.setting}`);
  }

  console.log(`[OpenAI] Generating ${context.setting} NPC${context.faction ? ` for faction ${context.faction}` : ''}`);
  
  const prompt = createNPCPrompt(context);
  
  try {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: getNPCSystemPrompt(context)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const generationTime = Date.now() - startTime;
    console.log(`[OpenAI] NPC generated in ${generationTime}ms`);

    if (!response.choices[0]?.message?.content) {
      throw new AIGenerationError('OpenAI returned empty response for NPC generation');
    }

    const result = JSON.parse(response.choices[0].message.content);
    const validatedNPC = validateGeneratedNPC(result);
    
    console.log(`[OpenAI] Generated NPC: ${validatedNPC.name} (${validatedNPC.type})`);
    return validatedNPC;
    
  } catch (error) {
    console.error('[OpenAI] NPC generation failed:', error);
    
    if (error instanceof SyntaxError) {
      throw new AIValidationError(`Invalid JSON response from AI: ${error.message}`);
    }
    
    if (error instanceof AIServiceError) {
      throw error;
    }
    
    throw new AIGenerationError(
      `Failed to generate NPC: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create system prompt for NPC generation
 */
function getNPCSystemPrompt(context: NPCGenerationContext): string {
  const settingDescription = context.setting === 'road'
    ? 'dangerous wasteland roads with roving gangs, traders, and survivors'
    : 'settlements and cities with complex politics, resource control, and social hierarchies';

  return `You are an expert at creating memorable RPG NPCs for post-apocalyptic dieselpunk settings.

Setting: ${settingDescription}

Core Principles:
- Create distinctive, memorable characters with clear motivations
- Embed them naturally in the harsh post-apocalyptic world
- Give them realistic survival concerns and resource needs
- Make them potential allies, enemies, or complex neutral parties
- Include rich backstory elements that GMs can use for plot hooks
- Ensure they fit the dieselpunk aesthetic (scavenged tech, makeshift equipment, survival gear)

Always respond with valid JSON in the exact format specified.`;
}

/**
 * Create detailed NPC generation prompt
 */
function createNPCPrompt(context: NPCGenerationContext): string {
  const settingDesc = context.setting === 'road' ? 'road encounter' : 'settlement';
  
  let prompt = `Generate a wasteland NPC for a ${settingDesc} in a dieselpunk post-apocalyptic setting.\n\n**Context:**`;
  
  if (context.faction) {
    prompt += `\n- Faction: ${context.faction}`;
  }
  
  if (context.role) {
    prompt += `\n- Role: ${context.role}`;
  }
  
  if (context.threatLevel) {
    prompt += `\n- Threat Level: ${context.threatLevel}`;
  }
  
  if (context.relationship) {
    prompt += `\n- Relationship to Players: ${context.relationship}`;
  }
  
  if (context.importance) {
    prompt += `\n- Story Importance: ${context.importance}`;
  }

  prompt += `\n\n**Create a memorable character with:**
- Distinctive appearance reflecting their role and environment
- Clear personality traits and mannerisms
- Believable motivation/agenda for the post-apocalyptic world
- Potential plot hooks and story connections
- Wasteland-appropriate name and background
- Equipment and resources that make sense for their role

**Required JSON Response Format:**
\`\`\`json
{
  "name": "Character name (wasteland appropriate)",
  "description": "2-3 paragraph description including: physical appearance, personality, mannerisms, current situation, and how they present to the players. Include specific dieselpunk details.",
  "type": "NPC role/archetype (e.g., 'Scrap Trader', 'Road Warrior', 'Settlement Guard')",
  "properties": {
    "faction": "faction name or 'independent'",
    "motivation": "primary driving goal or concern",
    "equipment": ["item1", "item2", "item3"],
    "secrets": ["secret1", "secret2"],
    "stats": {
      "combat": "1-10 rating",
      "social": "1-10 rating",
      "technical": "1-10 rating",
      "survival": "1-10 rating"
    },
    "relationships": {
      "key_person_1": "relationship description",
      "key_person_2": "relationship description"
    },
    "backstory": "Brief background explaining how they ended up in their current situation"
  }
}
\`\`\`

**Important:** Respond ONLY with the JSON object. No additional text.`;

  return prompt;
}

/**
 * Validate generated NPC response
 */
function validateGeneratedNPC(result: any): GeneratedNPC {
  if (!result || typeof result !== 'object') {
    throw new AIValidationError('NPC response is not a valid object');
  }

  if (!result.name || typeof result.name !== 'string' || result.name.trim() === '') {
    throw new AIValidationError('NPC name is required and must be a non-empty string');
  }

  if (!result.description || typeof result.description !== 'string' || result.description.trim() === '') {
    throw new AIValidationError('NPC description is required and must be a non-empty string');
  }

  if (!result.type || typeof result.type !== 'string' || result.type.trim() === '') {
    throw new AIValidationError('NPC type is required and must be a non-empty string');
  }

  // Validate properties object
  const properties = result.properties || {};
  
  return {
    name: result.name.trim(),
    description: result.description.trim(),
    type: result.type.trim(),
    properties: {
      faction: properties.faction || 'independent',
      motivation: properties.motivation || 'survival',
      equipment: Array.isArray(properties.equipment) ? properties.equipment : [],
      secrets: Array.isArray(properties.secrets) ? properties.secrets : [],
      stats: typeof properties.stats === 'object' ? properties.stats : {},
      relationships: typeof properties.relationships === 'object' ? properties.relationships : {},
      backstory: properties.backstory || 'Unknown background'
    }
  };
}
