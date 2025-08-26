import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface EventGenerationContext {
  sessionId: string;
  creatorMode: 'road' | 'city';
  currentPhase: string;
  aiMode: 'chaos' | 'continuity';
  recentEvents: Array<{
    name: string;
    description: string;
    phase: string;
  }>;
  connectedNodes: Array<{
    type: string;
    name: string;
    description: string;
  }>;
  environment?: string;
  threatLevel?: string;
}

export interface GeneratedEvent {
  name: string;
  description: string;
  suggestedNodes: Array<{
    type: 'event' | 'npc' | 'faction' | 'location' | 'item';
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
  estimatedDuration: number; // in minutes
  pacingImpact: 'accelerate' | 'slow' | 'tension' | 'resolve';
}

export async function generateEvent(context: EventGenerationContext): Promise<GeneratedEvent> {
  const prompt = createEventPrompt(context);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert RPG Game Master assistant specializing in dieselpunk/Mad Max/Fallout settings. Generate contextually appropriate events that maintain narrative continuity and create engaging gameplay moments. Always respond with valid JSON in the specified format.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: context.aiMode === 'chaos' ? 0.8 : 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return validateGeneratedEvent(result);
  } catch (error) {
    throw new Error(`Failed to generate event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createEventPrompt(context: EventGenerationContext): string {
  let prompt = `Generate an RPG event for a ${context.creatorMode === 'road' ? 'wasteland road' : 'settlement/city'} scenario in a dieselpunk setting.

Context:
- Current phase: ${context.currentPhase}
- AI Mode: ${context.aiMode} (${context.aiMode === 'chaos' ? 'unpredictable, high-action' : 'logical, story-consistent'})
- Session ID: ${context.sessionId}
`;

  if (context.environment) {
    prompt += `- Environment: ${context.environment}\n`;
  }

  if (context.threatLevel) {
    prompt += `- Threat Level: ${context.threatLevel}\n`;
  }

  if (context.recentEvents.length > 0) {
    prompt += `\nRecent Events:\n`;
    context.recentEvents.forEach((event, i) => {
      prompt += `${i + 1}. ${event.name}: ${event.description} (${event.phase})\n`;
    });
  }

  if (context.connectedNodes.length > 0) {
    prompt += `\nExisting Story Elements:\n`;
    context.connectedNodes.forEach(node => {
      prompt += `- ${node.type}: ${node.name} - ${node.description}\n`;
    });
  }

  prompt += `\nGenerate a ${context.creatorMode === 'road' ? 'survival/action-focused' : 'intrigue/social-focused'} event that:
1. Fits the current narrative context
2. Creates meaningful player choices
3. Can connect to existing story elements
4. Maintains the dieselpunk aesthetic (rust, metal, survival, technology vs nature)

Respond with JSON in this exact format:
{
  "name": "Event Name",
  "description": "Detailed event description with setting, NPCs, and situation",
  "suggestedNodes": [
    {
      "type": "event|npc|faction|location|item",
      "name": "Node Name",
      "description": "Node description",
      "properties": {"key": "value"}
    }
  ],
  "suggestedConnections": [
    {
      "fromType": "existing node type",
      "fromName": "existing node name",
      "toType": "new node type", 
      "toName": "new node name",
      "connectionType": "temporal|spatial|factional|ownership"
    }
  ],
  "estimatedDuration": 30,
  "pacingImpact": "accelerate|slow|tension|resolve"
}`;

  return prompt;
}

function validateGeneratedEvent(result: any): GeneratedEvent {
  // Basic validation
  if (!result.name || !result.description) {
    throw new Error('Generated event missing required fields');
  }

  return {
    name: result.name,
    description: result.description,
    suggestedNodes: result.suggestedNodes || [],
    suggestedConnections: result.suggestedConnections || [],
    estimatedDuration: result.estimatedDuration || 30,
    pacingImpact: result.pacingImpact || 'slow'
  };
}

export async function generateNPC(context: { 
  setting: 'road' | 'city';
  faction?: string;
  role?: string;
}): Promise<{
  name: string;
  description: string;
  type: string;
  properties: Record<string, any>;
}> {
  const prompt = `Generate a wasteland NPC for a ${context.setting === 'road' ? 'road encounter' : 'settlement'} in a dieselpunk setting.
${context.faction ? `Faction: ${context.faction}` : ''}
${context.role ? `Role: ${context.role}` : ''}

Create a memorable character with:
- Distinctive appearance and personality
- Clear motivation/agenda
- Potential plot hooks
- Wasteland-appropriate name

Respond with JSON:
{
  "name": "Character Name",
  "description": "Detailed description including appearance, personality, and background",
  "type": "NPC role/archetype",
  "properties": {
    "faction": "faction name or 'independent'",
    "motivation": "character motivation",
    "equipment": ["item1", "item2"],
    "secrets": ["secret1", "secret2"]
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating memorable RPG NPCs for post-apocalyptic dieselpunk settings. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    throw new Error(`Failed to generate NPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
