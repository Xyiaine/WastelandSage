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
  currentPhase?: string;
  aiMode?: 'chaos' | 'continuity';
  
  // Event generation parameters
  eventType?: string;         // e.g., "combat", "politics", "discovery", etc.
  
  // Session history for narrative continuity
  recentEvents?: Array<{
    name: string;
    description: string;
    phase: string;
  }>;
  
  // Connected story elements for integration
  connectedNodes?: Array<{
    type: string;
    name: string;
    description: string;
  }>;
  
  // Scenario context for world-aware generation
  scenarioContext?: {
    title: string;
    mainIdea: string;
    worldContext?: string;
    politicalSituation?: string;
    keyThemes?: string[];
    availableRegions?: Array<{
      name: string;
      type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub';
      controllingFaction?: string;
      threatLevel: number;
      politicalStance?: 'hostile' | 'neutral' | 'friendly' | 'allied';
      resources?: string[];
    }>;
  };
  
  // Environmental context
  environment?: string;        // e.g., "wasteland", "ruins", "settlement"
  threatLevel?: string;        // e.g., "low", "medium", "high"
  timeOfDay?: string;         // e.g., "dawn", "noon", "dusk", "night"
  weather?: string;           // e.g., "sandstorm", "acidrain", "clear"
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
/**
 * Generate rich fallback events when AI service is unavailable
 */
function generateFallbackEvent(context: EventGenerationContext): GeneratedEvent {
  const eventType = context.eventType || 'discovery';
  const environment = context.environment || 'wasteland';
  const threatLevel = context.threatLevel || 'medium';
  const timeOfDay = context.timeOfDay || 'noon';
  const weather = context.weather || 'clear';
  
  // Rich event templates organized by type and environment
  const roadEventTemplates = {
    combat: [
      { name: "Raider Ambush", description: `A pack of rust-painted raiders emerges from behind the skeletal remains of an overturned truck. Their vehicles, cobbled together from scavenged parts and adorned with spikes, circle the party's position. The leader, wearing a gas mask decorated with human teeth, revs his engine menacingly. The raiders seem to be after your supplies, but their erratic behavior suggests they might be high on combat stims.`, nodes: [{ type: 'npc', name: 'Spike, Raider Boss', description: 'Cybernetic eye, spiked leather armor, drives a weaponized buggy' }] },
      { name: "Tunnel Rats", description: `Feral humans who have lived underground emerge from subway tunnels. Their pale skin is mottled with radiation burns, and their unnaturally large eyes gleam in the darkness. They move with predatory grace through debris-strewn tunnels, using makeshift weapons crafted from rebar and broken glass.`, nodes: [{ type: 'location', name: 'Abandoned Subway Station', description: 'Dark tunnels with multiple escape routes and hidden caches' }] },
      { name: "Mutant Pack Attack", description: `A pack of radiation-twisted wolves, their fur patchy and eyes glowing an eerie green, stalks the party across the wasteland. These creatures are larger than normal wolves, with exposed bone spurs and acidic saliva that hisses when it hits the ground.`, nodes: [{ type: 'faction', name: 'Mutant Pack', description: 'Irradiated creatures that hunt in coordinated groups' }] },
      { name: "Scav Bandits", description: `A group of desperate scavengers has set up a roadblock using overturned cars and debris. They're armed with crude weapons but have the advantage of preparation and cover. Their leader waves a white flag, but his companions have weapons ready.`, nodes: [{ type: 'npc', name: 'Desperate Scav Leader', description: 'Hungry survivor willing to negotiate or fight' }] },
      { name: "Cannibal Tribe", description: `The remains of a recent campfire still smolder, surrounded by disturbing bone totems and human skulls arranged in ritualistic patterns. As you investigate, painted warriors emerge from hidden positions, their teeth filed to points and bodies covered in ritual scars.`, nodes: [{ type: 'faction', name: 'Bone Gnawer Tribe', description: 'Cannibalistic cult that sees outsiders as food' }] },
      { name: "Military Drones", description: `A high-pitched whining sound fills the air as automated military drones, still following pre-war patrol routes, identify your group as potential threats. Their red targeting lasers sweep across your position as they prepare to engage.`, nodes: [{ type: 'item', name: 'Military Drone Controller', description: 'Could reprogram drones if captured intact' }] },
      { name: "Slaver Patrol", description: `A convoy of slavers in armored vehicles approaches, their trucks fitted with cages containing captured wastelanders. The slavers are well-armed and organized, clearly part of a larger operation. They're scouting for new 'merchandise.'`, nodes: [{ type: 'faction', name: 'Iron Collar Slavers', description: 'Professional slave traders with established routes' }] },
      { name: "Territorial Gang", description: `The party has unknowingly crossed into gang territory, marked by graffiti tags and warning signs made from scrap metal. Gang members on improvised motorcycles circle menacingly, demanding tribute or passage rights.`, nodes: [{ type: 'faction', name: 'Chrome Skull Gang', description: 'Motorcycle gang that controls this stretch of highway' }] },
      { name: "Rad-Storm Bandits", description: `During a sudden radiation storm, bandits wearing improvised hazmat suits attack from the swirling radioactive winds. They've learned to use the deadly weather as cover, striking when their victims are blinded and weakened.`, nodes: [{ type: 'item', name: 'Rad-Suit Technology', description: 'Improvised radiation protection gear' }] },
      { name: "Cyber-Psycho", description: `A lone figure in pre-war power armor approaches erratically, his augmented body sparking and twitching. His cybernetic implants have malfunctioned, driving him into a berserk rage. He attacks anything that moves, friend or foe.`, nodes: [{ type: 'npc', name: 'Malfunctioning Cyborg', description: 'Pre-war soldier driven insane by failing implants' }] },
      { name: "Super Mutant Patrol", description: `A group of massive, green-skinned super mutants blocks the road with crude barricades. These hulking brutes carry heavy weapons and show no signs of backing down. Their leader roars challenges in broken English.`, nodes: [{ type: 'faction', name: 'Super Mutant Warband', description: 'Aggressive mutants seeking combat and dominance' }] },
      { name: "Feral Ghoul Horde", description: `Dozens of mindless feral ghouls shamble out of a ruined building, their radiation-ravaged flesh hanging in tatters. They move with surprising speed when they detect living prey, overwhelming enemies through sheer numbers.`, nodes: [{ type: 'location', name: 'Irradiated Ruins', description: 'Dangerous area where ghouls have made their nest' }] },
      { name: "Robot Uprising", description: `Malfunctioning pre-war robots have turned hostile, attacking anything that moves. Their programming has become corrupted, turning helpful service bots into deadly threats armed with industrial tools and welding equipment.`, nodes: [{ type: 'faction', name: 'Rogue Automatons', description: 'Malfunctioning robots with hostile programming' }] }
    ],
    discovery: [
      { name: "The Last Drop", description: `A rusted Petromax station with intact underground fuel tanks protected by pre-war locking mechanisms. The convenience store is a time capsule, and tire tracks suggest recent visitors.`, nodes: [{ type: 'item', name: 'Pre-War Fuel Reserve', description: 'High-grade gasoline worth a fortune in the wasteland' }] },
      { name: "Buried Vault", description: `Metal vents protruding from a hillside reveal an underground Vault-Tec facility. The entrance is partially buried, but the airlock door is still sealed. Strange sounds echo from within - could there be survivors after all these years?`, nodes: [{ type: 'location', name: 'Vault 117', description: 'Experimental vault with unknown purpose and potential survivors' }] },
      { name: "Crashed Vertibird", description: `The wreckage of a military aircraft lies scattered across the desert. Among the debris, you find sealed cargo containers and a flight recorder that might contain valuable intelligence about pre-war military operations.`, nodes: [{ type: 'item', name: 'Military Flight Recorder', description: 'Contains classified pre-war military intelligence' }] },
      { name: "Radio Tower", description: `An intact radio transmission tower broadcasts a repeating signal in an unknown code. The facility appears abandoned, but the equipment is still functional. Someone or something is maintaining this station.`, nodes: [{ type: 'location', name: 'Mysterious Radio Station', description: 'Automated facility broadcasting coded messages' }] },
      { name: "Nuka-Cola Factory", description: `The skeletal remains of a Nuka-Cola bottling plant stretch across several acres. While most of the facility is destroyed, the underground storage areas might contain intact bottles of the legendary pre-war beverage.`, nodes: [{ type: 'item', name: 'Nuka-Cola Quantum', description: 'Rare pre-war soft drink with mild radioactive properties' }] },
      { name: "Caravan Wreckage", description: `The remains of a large merchant caravan are scattered across the road. Broken wagons, dead brahmin, and scattered goods tell a story of ambush and massacre. But some valuable cargo might still be salvageable.`, nodes: [{ type: 'item', name: 'Trade Route Map', description: 'Shows safe passages and hidden caches along major trade routes' }] },
      { name: "Underground Bunker", description: `A concealed entrance leads to a private bunker built by a paranoid pre-war millionaire. The facility is fully stocked with supplies, weapons, and luxury items - if you can bypass the security systems.`, nodes: [{ type: 'location', name: 'Executive Bunker', description: 'Luxury fallout shelter with advanced security systems' }] },
      { name: "Alien Crash Site", description: `A crater in the desert contains the twisted remains of something clearly not of this world. Strange technology and alien artifacts are scattered among the debris, but approaching too close makes your Geiger counter click rapidly.`, nodes: [{ type: 'item', name: 'Alien Technology', description: 'Advanced alien device with unknown properties' }] },
      { name: "Time Capsule Vehicle", description: `A perfectly preserved pre-war automobile sits in an underground garage, protected from the elements. The vehicle appears to be in working condition, and its glove compartment contains fascinating glimpses into pre-war life.`, nodes: [{ type: 'item', name: 'Pre-War Vehicle', description: 'Functional automobile with historical artifacts' }] },
      { name: "Scientific Outpost", description: `A remote research station built into a cliff face contains abandoned experiments and valuable scientific equipment. The researchers fled quickly, leaving behind notes about their discoveries and warnings about dangerous test subjects.`, nodes: [{ type: 'location', name: 'Research Station Alpha', description: 'Abandoned scientific facility with dangerous experiments' }] },
      { name: "Hidden Cache", description: `A survivalist's hidden supply cache contains weapons, ammunition, and preserved food. The cache is well-concealed and booby-trapped, suggesting its owner was paranoid about discovery.`, nodes: [{ type: 'item', name: 'Survivalist Supplies', description: 'High-quality gear and provisions from a prepared survivor' }] },
      { name: "Ancient Library", description: `A surprisingly intact library building contains thousands of pre-war books and documents. Many texts contain valuable technical knowledge, but the building is also home to something that doesn't want visitors.`, nodes: [{ type: 'location', name: 'Knowledge Repository', description: 'Pre-war library with technical manuals and dangerous guardian' }] },
      { name: "Medical Facility", description: `An abandoned hospital or medical research facility contains valuable medical supplies and equipment. However, the building also shows signs of dangerous medical experiments that went wrong before the war.`, nodes: [{ type: 'item', name: 'Advanced Medical Supplies', description: 'Pre-war medical technology and pharmaceuticals' }] }
    ],
    survival: [
      { name: "Radiation Storm", description: `Dark clouds gather on the horizon, crackling with green lightning. A radiation storm approaches rapidly, and you need to find shelter before the deadly fallout arrives. Your Geiger counter's clicks are becoming more frequent.`, nodes: [{ type: 'location', name: 'Storm Shelter', description: 'Protected area to wait out radiation storms' }] },
      { name: "Water Crisis", description: `Your water supplies are running dangerously low, and the next known source is days away. You spot what might be a hidden well or spring, but approaching it means crossing territory marked with warning signs.`, nodes: [{ type: 'location', name: 'Hidden Spring', description: 'Fresh water source protected by unknown guardians' }] },
      { name: "Equipment Failure", description: `Critical equipment has malfunctioned at the worst possible moment. Your vehicle's engine has overheated, or your radiation suit has a dangerous tear. You need spare parts, and fast.`, nodes: [{ type: 'item', name: 'Salvage Parts', description: 'Components needed for crucial repairs' }] },
      { name: "Sandstorm Shelter", description: `A massive sandstorm approaches, threatening to strip flesh from bone. You need immediate shelter, but the only structure visible is a partially collapsed building that might not be stable.`, nodes: [{ type: 'location', name: 'Unstable Shelter', description: 'Dangerous but necessary protection from the storm' }] },
      { name: "Food Poisoning", description: `Someone in your group has eaten contaminated food and is seriously ill. You need medical supplies or someone with healing knowledge to prevent the condition from becoming fatal.`, nodes: [{ type: 'npc', name: 'Wasteland Medic', description: 'Traveling doctor who might help for a price' }] },
      { name: "Lost Navigation", description: `Your compass has been damaged by radiation, and familiar landmarks have been obliterated by recent storms. You're lost in hostile territory with limited supplies and no clear direction to safety.`, nodes: [{ type: 'item', name: 'Pre-War Map', description: 'Detailed cartographic information from before the war' }] },
      { name: "Extreme Heat", description: `The temperature has risen to dangerous levels, and your group is suffering from heat exhaustion. You need to find shade and water quickly, but the landscape offers little relief.`, nodes: [{ type: 'location', name: 'Cooling Caves', description: 'Underground chambers that provide relief from heat' }] },
      { name: "Contaminated Area", description: `You've entered a zone of intense radiation that threatens to overwhelm your protection. You need to find a safe route through or around the contaminated area before your rad levels become critical.`, nodes: [{ type: 'item', name: 'Rad-Away Supply', description: 'Medical treatment for radiation poisoning' }] },
      { name: "Vehicle Breakdown", description: `Your main mode of transportation has suffered a critical breakdown in the middle of nowhere. You need to decide whether to attempt repairs with limited tools or abandon the vehicle and continue on foot.`, nodes: [{ type: 'npc', name: 'Wasteland Mechanic', description: 'Skilled engineer who works for trade goods' }] },
      { name: "Predator Stalking", description: `Something large and dangerous has been following your group for hours. You catch glimpses of movement in your peripheral vision, and you find strange tracks near your campsite each morning.`, nodes: [{ type: 'npc', name: 'Deathclaw Alpha', description: 'Apex predator of the wasteland' }] }
    ],
    vehicle: [
      { name: "Road Warrior's Last Stand", description: `A massive armored truck sits motionless on the highway, its engine smoking. The vehicle is a masterpiece of wasteland engineering, but its driver is dying and might share valuable information.`, nodes: [{ type: 'npc', name: 'Magnus the Road Warrior', description: 'Dying wasteland legend with knowledge of hidden routes and caches' }] },
      { name: "Fuel Depot Raid", description: `A heavily fortified fuel depot blocks the main highway. The defenders are well-armed but might be willing to trade. Alternatively, the facility could be taken by force - if you can deal with the automated defenses.`, nodes: [{ type: 'location', name: 'Fortified Fuel Depot', description: 'Heavily defended source of precious gasoline' }] },
      { name: "Convoy Under Attack", description: `A merchant convoy is under attack by raiders ahead on the road. You could intervene to help the merchants, try to scavenge from the aftermath, or attempt to negotiate with the attackers.`, nodes: [{ type: 'faction', name: 'Desert Merchants', description: 'Trading company with valuable goods and information' }] },
      { name: "Speed Trap", description: `The road ahead is booby-trapped with hidden spikes and tripwires designed to disable vehicles. Someone is hunting travelers in this area, using their disabled vehicles as bait for larger prey.`, nodes: [{ type: 'npc', name: 'Highway Hunter', description: 'Wastelander who preys on disabled travelers' }] },
      { name: "Racing Challenge", description: `A group of wasteland racers blocks the road, challenging any passersby to a race through a dangerous course. The prize is valuable, but the track is littered with the wreckage of previous competitors.`, nodes: [{ type: 'faction', name: 'Death Race League', description: 'Competitive racers who bet their lives for glory' }] },
      { name: "Broken Bridge", description: `The highway bridge has collapsed, leaving a deep chasm that blocks all vehicle traffic. You need to find an alternate route, repair the bridge, or find a way to get your vehicles across the gap.`, nodes: [{ type: 'location', name: 'Collapsed Bridge', description: 'Major obstacle requiring creative solutions' }] },
      { name: "Checkpoint Control", description: `A military checkpoint controls access to the next region. The guards are suspicious of outsiders and demand bribes, proper documentation, or 'voluntary' service to their cause.`, nodes: [{ type: 'faction', name: 'Regional Authority', description: 'Militarized group controlling territory access' }] },
      { name: "Abandoned Garage", description: `A pre-war auto repair shop contains valuable vehicle parts and tools. The facility appears abandoned, but the quality of the equipment suggests it might be claimed by someone who doesn't appreciate visitors.`, nodes: [{ type: 'location', name: 'Auto Repair Shop', description: 'Source of vehicle parts and mechanical expertise' }] },
      { name: "Road Pirates", description: `A group of raiders has blocked the highway with their vehicles, creating a makeshift fortress. They demand tribute from all travelers, but their position could be flanked through rough terrain.`, nodes: [{ type: 'faction', name: 'Highway Bandits', description: 'Raiders who control key transportation routes' }] },
      { name: "Vehicle Graveyard", description: `Hundreds of destroyed vehicles from the Great War create a metallic maze. The area is rich in salvageable parts, but navigation is difficult and something large moves between the rusted hulks.`, nodes: [{ type: 'location', name: 'Vehicle Graveyard', description: 'Vast collection of pre-war automotive wreckage' }] }
    ],
    encounter: [
      { name: "Traveling Merchant", description: `A well-armed trader approaches with a pack brahmin loaded with goods. He's friendly but cautious, offering to trade supplies and information about the road ahead.`, nodes: [{ type: 'npc', name: 'Marcus the Trader', description: 'Experienced merchant with valuable goods and road knowledge' }] },
      { name: "Lone Wanderer", description: `A solitary figure watches your group from a distance. When approached, she proves to be a skilled survivor who might join your group or share valuable information about local dangers.`, nodes: [{ type: 'npc', name: 'Sarah the Scout', description: 'Expert tracker and survival specialist' }] },
      { name: "Refugee Family", description: `A desperate family begs for help, claiming their settlement was destroyed by raiders. They have little to offer but information, and helping them might slow your progress but provide future allies.`, nodes: [{ type: 'npc', name: 'Refugee Leader', description: 'Survivor who knows about recent raider activities' }] },
      { name: "Tech Scavenger", description: `An eccentric inventor has set up a temporary workshop in an abandoned building. She's willing to trade technological improvements for rare components or assistance with her current project.`, nodes: [{ type: 'npc', name: 'Techie Thompson', description: 'Brilliant inventor with jury-rigged equipment' }] },
      { name: "Injured Courier", description: `A badly wounded courier staggers toward your group, clutching a sealed package. She begs you to deliver the message to its destination, warning that powerful people are hunting for it.`, nodes: [{ type: 'item', name: 'Mysterious Package', description: 'Sealed courier delivery with unknown contents' }] },
      { name: "Former Vault Dweller", description: `A naive but intelligent vault dweller has recently emerged into the wasteland. He has valuable pre-war knowledge but needs protection and guidance to survive the harsh reality outside.`, nodes: [{ type: 'npc', name: 'Vault-Born Scholar', description: 'Pre-war technology expert unfamiliar with wasteland dangers' }] },
      { name: "Brotherhood Patrol", description: `A small patrol of Brotherhood of Steel members approaches in their distinctive power armor. They're investigating reports of advanced technology in the area and might view your group as potential threats or allies.`, nodes: [{ type: 'faction', name: 'Brotherhood of Steel', description: 'Military organization dedicated to preserving technology' }] },
      { name: "Ghoul Pilgrim", description: `An ancient ghoul shares stories of the world before the bombs fell. His radiation-ravaged appearance is unsettling, but his knowledge of pre-war locations and events could be invaluable.`, nodes: [{ type: 'npc', name: 'Old Pete the Ghoul', description: 'Pre-war survivor with centuries of experience' }] },
      { name: "Caravan Guard", description: `A professional guard offers employment protecting a valuable caravan through dangerous territory. The pay is good, but the cargo is mysterious and the route passes through hostile regions.`, nodes: [{ type: 'faction', name: 'Crimson Caravan Company', description: 'Major trading organization with extensive routes' }] },
      { name: "Settlement Recruiter", description: `A representative from a nearby settlement offers citizenship and jobs to skilled individuals. The community sounds too good to be true, which raises questions about what they're not telling you.`, nodes: [{ type: 'location', name: 'Prosperity Settlement', description: 'Thriving community with mysterious prosperity' }] }
    ]
  };
  
  const cityEventTemplates = {
    politics: [
      { name: "The Water Vote", description: `The settlement's council chamber buzzes with tension as representatives from three major factions debate control of the newly discovered aquifer. Each faction has brought armed supporters who eye each other warily. The player characters' influence could tip the balance of power in the settlement for generations.`, nodes: [{ type: 'faction', name: 'Steelworkers Union', description: 'Skilled technicians who maintain the settlement\'s infrastructure' }] },
      { name: "Election Fraud", description: `Evidence emerges that the recent mayoral election was rigged by corrupt officials working with outside interests. The legitimate winner demands justice, while the installed puppet mayor desperately tries to maintain control through bribes and threats.`, nodes: [{ type: 'npc', name: 'Corrupt Mayor Barnes', description: 'Puppet leader installed through election fraud' }] },
      { name: "Trade War Brewing", description: `Two powerful merchant families are locked in an escalating trade dispute that threatens to tear the settlement apart. Each side is recruiting allies and preparing for economic warfare that could easily turn violent.`, nodes: [{ type: 'faction', name: 'Morrison Trade House', description: 'Established merchants with old-world connections' }] },
      { name: "Constitutional Crisis", description: `The settlement's founding charter is being challenged by a charismatic populist who claims the current government is illegitimate. Mass rallies and counter-protests create a powder keg atmosphere ready to explode.`, nodes: [{ type: 'npc', name: 'Revolutionary Speaker Chen', description: 'Charismatic populist challenging the established order' }] },
      { name: "Diplomatic Incident", description: `An ambassador from a neighboring settlement has been found dead under suspicious circumstances. Both communities are blaming each other, and war seems inevitable unless the truth can be uncovered quickly.`, nodes: [{ type: 'location', name: 'Embassy Compound', description: 'Diplomatic facility now under heavy guard' }] },
      { name: "Resource Nationalization", description: `The city council is debating whether to seize control of all private water and food production. Business owners are panicking while the poor celebrate, creating deep divisions that threaten civil war.`, nodes: [{ type: 'faction', name: 'Business Council', description: 'Coalition of private enterprise owners' }] },
      { name: "Succession Movement", description: `A district of the settlement is threatening to break away and form its own independent community. They have their own militia and have begun blocking city officials from entering their territory.`, nodes: [{ type: 'faction', name: 'Independence Movement', description: 'Separatist group seeking autonomy' }] },
      { name: "Military Coup", description: `The settlement's defense force commander has arrested several council members on charges of corruption and treason. Whether this is a legitimate investigation or a power grab remains unclear.`, nodes: [{ type: 'npc', name: 'General Rodriguez', description: 'Military commander seizing political control' }] },
      { name: "Foreign Interference", description: `Spies from a distant city-state have been caught attempting to manipulate local politics. Their mission was to destabilize the settlement, but their capture might provoke a larger conflict.`, nodes: [{ type: 'faction', name: 'Enemy Infiltrators', description: 'Foreign agents working to undermine the settlement' }] },
      { name: "Religious Extremism", description: `A fundamentalist cult has gained significant political influence and is pushing for laws based on their interpretation of pre-war religious texts. Secular citizens are organizing resistance.`, nodes: [{ type: 'faction', name: 'Children of Atom', description: 'Religious extremist cult gaining political power' }] }
    ],
    crime: [
      { name: "The Memory Merchant", description: `In a shadowy corner of the scrap market, an unusual vendor trades in pre-war memories - digital recordings extracted from neural implants. Some memories contain technical knowledge, others traumatic experiences that can psychologically damage the viewer.`, nodes: [{ type: 'npc', name: 'Echo the Memory Merchant', description: 'Mysterious trader who deals in pre-war digital memories and forbidden knowledge' }] },
      { name: "Chem Lab Explosion", description: `A hidden drug laboratory has exploded, killing several people and releasing toxic fumes into a residential district. The blast reveals the extent of the settlement's underground drug trade.`, nodes: [{ type: 'location', name: 'Underground Chem Lab', description: 'Illegal drug manufacturing facility' }] },
      { name: "Slavery Ring", description: `Investigators have uncovered a slave trading operation operating out of seemingly legitimate businesses. The ring has connections throughout the settlement's government and business community.`, nodes: [{ type: 'faction', name: 'Iron Collar Syndicate', description: 'Criminal organization dealing in human trafficking' }] },
      { name: "Protection Racket", description: `A violent gang is extorting money from local businesses, promising 'protection' from dangers they themselves create. Shop owners are too frightened to report the crimes to authorities.`, nodes: [{ type: 'faction', name: 'Rust Devils Gang', description: 'Criminal gang running protection rackets' }] },
      { name: "Corporate Espionage", description: `Rival trading companies are engaging in industrial sabotage and theft of trade secrets. What started as economic competition has escalated to murder and terrorism.`, nodes: [{ type: 'npc', name: 'Corporate Spy Mitchell', description: 'Professional industrial saboteur' }] },
      { name: "Organ Harvesting", description: `A series of mysterious disappearances leads to the discovery of an illegal organ harvesting operation. The criminals are selling body parts to wealthy clients in distant settlements.`, nodes: [{ type: 'location', name: 'Black Market Clinic', description: 'Illegal medical facility harvesting organs' }] },
      { name: "Currency Counterfeiting", description: `Fake bottle caps are flooding the local economy, threatening to cause massive inflation. The counterfeiters are using sophisticated pre-war equipment to create nearly perfect replicas.`, nodes: [{ type: 'item', name: 'Counterfeiting Equipment', description: 'Pre-war printing technology adapted for fake currency' }] },
      { name: "Arms Smuggling", description: `Illegal weapons are being smuggled into the settlement through secret tunnels and hidden compartments. The smugglers have military-grade equipment that poses a serious threat to public safety.`, nodes: [{ type: 'faction', name: 'Gun Runner Cartel', description: 'Criminal organization smuggling military weapons' }] },
      { name: "Information Theft", description: `Hackers have broken into the settlement's computer systems and stolen sensitive information about residents, trade routes, and defensive capabilities. The data is being sold to hostile factions.`, nodes: [{ type: 'npc', name: 'Ghost Hacker', description: 'Computer criminal selling stolen information' }] },
      { name: "Murder Mystery", description: `A prominent citizen has been found dead under mysterious circumstances. The victim had many enemies, and the investigation reveals a web of corruption, blackmail, and hidden relationships.`, nodes: [{ type: 'npc', name: 'Detective Morgan', description: 'Cynical investigator with a drinking problem' }] }
    ],
    trade: [
      { name: "Market Manipulation", description: `A powerful merchant is artificially creating shortages of essential goods to drive up prices. Small traders are being driven out of business while citizens struggle to afford basic necessities.`, nodes: [{ type: 'npc', name: 'Merchant Prince Valdez', description: 'Wealthy trader manipulating market prices' }] },
      { name: "Caravan War", description: `Two major trading companies are locked in a vicious competition for control of profitable trade routes. Their conflict is disrupting commerce and threatening the settlement's economic stability.`, nodes: [{ type: 'faction', name: 'Crimson Caravan Company', description: 'Major trading organization with extensive routes' }] },
      { name: "Currency Crisis", description: `The settlement's bottle cap currency is losing value due to oversupply and counterfeiting. Citizens are demanding a new monetary system, but the transition threatens economic chaos.`, nodes: [{ type: 'item', name: 'Alternative Currency', description: 'New trade medium to replace unstable bottle caps' }] },
      { name: "Embargo Dispute", description: `A neighboring settlement has imposed a trade embargo over a political disagreement. Essential supplies are running low, and smugglers are demanding exorbitant prices for banned goods.`, nodes: [{ type: 'faction', name: 'Smuggler Network', description: 'Criminal organization profiting from trade restrictions' }] },
      { name: "Industrial Sabotage", description: `Someone is sabotaging the settlement's manufacturing facilities, causing production delays and safety hazards. The attacks seem coordinated and designed to cripple the local economy.`, nodes: [{ type: 'location', name: 'Manufacturing District', description: 'Industrial area under constant threat of sabotage' }] },
      { name: "Intellectual Property Theft", description: `A rival settlement has stolen the designs for the town's most profitable manufactured goods and is now undercutting local prices. Legal remedies are limited in the post-apocalyptic world.`, nodes: [{ type: 'item', name: 'Stolen Blueprints', description: 'Industrial designs taken by corporate espionage' }] },
      { name: "Labor Strike", description: `Workers at the settlement's largest employer have gone on strike, demanding better working conditions and higher pay. The work stoppage is crippling the local economy and tensions are rising.`, nodes: [{ type: 'faction', name: 'Workers Union', description: 'Organized labor movement fighting for better conditions' }] },
      { name: "Resource Depletion", description: `The settlement's primary resource extraction site is running dry, threatening the economic foundation of the community. New sources must be found or the town will face economic collapse.`, nodes: [{ type: 'location', name: 'Exhausted Quarry', description: 'Former resource site now economically unviable' }] },
      { name: "Tax Revolt", description: `Merchants are refusing to pay the settlement's new trade taxes, claiming they are excessive and discriminatory. Tax collectors are being met with threats and violence.`, nodes: [{ type: 'faction', name: 'Tax Resistance Movement', description: 'Merchants refusing to pay government levies' }] },
      { name: "Banking Scandal", description: `The settlement's largest financial institution is revealed to be engaging in fraudulent practices, threatening the savings of thousands of citizens and the stability of the local economy.`, nodes: [{ type: 'npc', name: 'Corrupt Banker Williams', description: 'Financial criminal who stole citizen savings' }] }
    ],
    social: [
      { name: "Cultural Festival", description: `The annual Founding Day celebration is marred by protests and violence between different cultural groups within the settlement. What should be a unifying event is revealing deep social divisions.`, nodes: [{ type: 'location', name: 'Festival Grounds', description: 'Cultural celebration site becoming a battleground' }] },
      { name: "Education Crisis", description: `The settlement's school system is in crisis due to lack of funding and qualified teachers. Parents are demanding action while the government struggles to find resources for education.`, nodes: [{ type: 'location', name: 'Underfunded School', description: 'Educational facility lacking basic resources' }] },
      { name: "Healthcare Shortage", description: `A outbreak of disease has overwhelmed the settlement's medical facilities. Doctors are making difficult decisions about who receives treatment, and social tensions are rising over healthcare rationing.`, nodes: [{ type: 'npc', name: 'Dr. Sarah Chen', description: 'Overworked physician making life-or-death decisions' }] },
      { name: "Housing Crisis", description: `Rapid population growth has created a severe housing shortage. Tent cities are springing up outside the settlement walls, and conflicts are erupting between established residents and newcomers.`, nodes: [{ type: 'location', name: 'Refugee Camp', description: 'Temporary settlement for displaced persons' }] },
      { name: "Generational Conflict", description: `Young people who grew up in the settlement are clashing with older residents who remember the world before the war. Different perspectives on technology, governance, and social values are creating deep divisions.`, nodes: [{ type: 'faction', name: 'Youth Movement', description: 'Young citizens demanding social change' }] },
      { name: "Religious Tensions", description: `Multiple religious groups are competing for influence and converts within the settlement. Religious differences are spilling over into politics and creating sectarian conflicts.`, nodes: [{ type: 'faction', name: 'Interfaith Council', description: 'Religious leaders trying to maintain peace' }] },
      { name: "Media Manipulation", description: `The settlement's radio station and newspaper are spreading propaganda and misinformation to influence public opinion. Citizens are losing trust in traditional sources of information.`, nodes: [{ type: 'location', name: 'Radio Station WPOP', description: 'Media outlet spreading propaganda' }] },
      { name: "Mental Health Crisis", description: `The stress of post-apocalyptic life is taking a severe toll on the settlement's mental health. Suicide rates are rising, and the community lacks adequate resources to address psychological trauma.`, nodes: [{ type: 'npc', name: 'Therapist Martinez', description: 'Mental health professional overwhelmed by demand' }] },
      { name: "Substance Abuse", description: `Alcohol and drug abuse are reaching epidemic proportions in the settlement. Families are being destroyed, and productivity is declining as more citizens struggle with addiction.`, nodes: [{ type: 'location', name: 'Recovery Center', description: 'Rehabilitation facility fighting addiction epidemic' }] },
      { name: "Gender Equality", description: `Traditional gender roles are being challenged by progressive citizens who demand equal rights and opportunities. Conservative groups are pushing back, creating social conflict and protests.`, nodes: [{ type: 'faction', name: 'Equal Rights Coalition', description: 'Progressive group fighting for gender equality' }] }
    ],
    infrastructure: [
      { name: "Power Grid Failure", description: `The settlement's electrical system has suffered a major breakdown, leaving large areas without power. The failure reveals how dependent the community has become on pre-war technology.`, nodes: [{ type: 'location', name: 'Power Plant', description: 'Failing electrical generation facility' }] },
      { name: "Water Contamination", description: `The settlement's water supply has been contaminated by industrial runoff or sabotage. Citizens are becoming sick, and alternative water sources must be found quickly.`, nodes: [{ type: 'location', name: 'Water Treatment Facility', description: 'Contaminated water processing plant' }] },
      { name: "Transportation Crisis", description: `The settlement's main roads and bridges are in desperate need of repair. Trade is being disrupted, and isolated districts are cut off from the rest of the community.`, nodes: [{ type: 'location', name: 'Collapsed Bridge', description: 'Major transportation infrastructure failure' }] },
      { name: "Communication Blackout", description: `The settlement's radio towers and communication equipment have failed, cutting off contact with the outside world. The isolation is causing panic and making trade negotiations impossible.`, nodes: [{ type: 'item', name: 'Communication Array', description: 'Advanced pre-war radio equipment' }] },
      { name: "Waste Management", description: `The settlement's waste disposal system is overloaded and failing. Toxic waste is accumulating in residential areas, creating health hazards and environmental contamination.`, nodes: [{ type: 'location', name: 'Waste Processing Center', description: 'Overloaded garbage and sewage facility' }] },
      { name: "Building Collapse", description: `A major building has collapsed due to poor maintenance or structural damage, killing several people and displacing dozens of families. The incident raises questions about building safety standards.`, nodes: [{ type: 'location', name: 'Collapsed Apartment Block', description: 'Residential building destroyed by structural failure' }] },
      { name: "Flooding Crisis", description: `Heavy rains or a dam failure has caused severe flooding in parts of the settlement. Emergency services are overwhelmed, and critical infrastructure is underwater.`, nodes: [{ type: 'location', name: 'Flooded District', description: 'Residential area devastated by water damage' }] },
      { name: "Fire Emergency", description: `A major fire is spreading through the settlement's commercial district. The fire department lacks adequate equipment to fight the blaze, and the flames threaten to consume vital infrastructure.`, nodes: [{ type: 'location', name: 'Burning Market District', description: 'Commercial area under threat from uncontrolled fire' }] },
      { name: "Technical Malfunction", description: `Critical automated systems that keep the settlement running have malfunctioned. Few people understand the pre-war technology well enough to fix it, and outside experts may be needed.`, nodes: [{ type: 'npc', name: 'Tech Specialist Roberts', description: 'Engineer who understands pre-war systems' }] },
      { name: "Security Breach", description: `The settlement's defensive systems have been compromised, leaving the community vulnerable to outside attack. The breach may be due to sabotage, equipment failure, or cyber intrusion.`, nodes: [{ type: 'location', name: 'Security Command Center', description: 'Compromised defensive control facility' }] }
    ]
  };
  
  // Get appropriate template based on mode and event type
  const templates = context.creatorMode === 'road' ? roadEventTemplates : cityEventTemplates;
  const eventGroup = (templates as any)[eventType] as any[];
  
  if (!eventGroup || !Array.isArray(eventGroup) || eventGroup.length === 0) {
    // Generic fallback
    return {
      name: "Unexpected Encounter",
      description: `Something unexpected happens in the ${environment} that requires the players' attention. The ${timeOfDay} timing and ${weather} conditions add complexity to the situation.`,
      suggestedNodes: [],
      suggestedConnections: [],
      estimatedDuration: 30,
      pacingImpact: 'tension',
      gameplayTips: ['Encourage player creativity', 'Focus on roleplay opportunities'],
      alternativeOutcomes: ['Peaceful resolution', 'Combat encounter', 'Information gathering'],
      requiredPreparation: ['Basic NPC stats', 'Environmental details']
    };
  }
  
  // Randomly select from available events in this category
  const randomIndex = Math.floor(Math.random() * eventGroup.length);
  const template = eventGroup[randomIndex];
  const duration = threatLevel === 'low' ? 20 : threatLevel === 'high' ? 45 : 30;
  
  return {
    name: template.name,
    description: `${template.description}\n\nThe weather is ${weather === 'clear' ? 'harsh and unforgiving' : weather === 'sandstorm' ? 'creating a brown haze that limits visibility' : weather === 'acidrain' ? 'causing the metal around you to hiss and steam' : 'charged with radiation that makes your dosimeter click ominously'}. The ${timeOfDay} ${timeOfDay === 'night' ? 'darkness provides cover but also conceals dangers' : 'lighting affects visibility and tactical options'}.`,
    suggestedNodes: (template.nodes || []).map((node: any) => ({ ...node, properties: {} })),
    suggestedConnections: [],
    estimatedDuration: duration,
    pacingImpact: threatLevel === 'high' ? 'accelerate' : threatLevel === 'low' ? 'slow' : 'tension',
    gameplayTips: [
      `Emphasize the ${environment} environment in descriptions`,
      `Consider the ${timeOfDay} timing for atmospheric effect`,
      `Use ${weather} conditions to add challenge or atmosphere`
    ],
    alternativeOutcomes: [
      `Peaceful negotiation leads to valuable information`,
      `Combat encounter tests the party's tactical skills`,
      `Stealth and cunning provide alternative solutions`
    ],
    requiredPreparation: [
      `Prepare stats for any NPCs involved`,
      `Consider environmental hazards and opportunities`,
      `Plan multiple resolution paths based on player choices`
    ]
  };
}

export async function generateEvent(context: EventGenerationContext): Promise<GeneratedEvent> {
  // Input validation with defaults
  if (!context.sessionId || !context.creatorMode) {
    throw new AIValidationError('Missing required context fields: sessionId and creatorMode');
  }
  
  // Set defaults for optional fields
  const currentPhase = context.currentPhase || 'exploration';
  const aiMode = context.aiMode || 'continuity';
  const recentEvents = context.recentEvents || [];
  const connectedNodes = context.connectedNodes || [];
  
  if (!['road', 'city'].includes(context.creatorMode)) {
    throw new AIValidationError(`Invalid creator mode: ${context.creatorMode}`);
  }
  
  if (context.aiMode && !['chaos', 'continuity'].includes(context.aiMode)) {
    throw new AIValidationError(`Invalid AI mode: ${context.aiMode}`);
  }

  console.log(`[OpenAI] Generating ${context.creatorMode} event for phase ${currentPhase} (${aiMode} mode)${context.eventType ? ` - ${context.eventType}` : ''}`);
  
  const enhancedContext = {
    ...context,
    currentPhase,
    aiMode,
    recentEvents,
    connectedNodes
  };
  
  const prompt = createEventPrompt(enhancedContext);
  
  try {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(enhancedContext)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: aiMode === 'chaos' ? 0.8 : 0.4,
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
    console.error('[OpenAI] Event generation failed, falling back to local generation:', error);
    
    // Instead of throwing errors, fall back to rich local event generation
    console.log('[OpenAI] API unavailable, using rich local event generation');
    const fallbackEvent = generateFallbackEvent(enhancedContext);
    console.log(`[Local] Generated fallback event: ${fallbackEvent.name}`);
    return fallbackEvent;
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
  
  // Enhanced context descriptions for different environments and event types
  const environmentDescriptions = {
    // Road environments
    wasteland: 'endless desolate wasteland with scattered debris and rusted vehicle hulks',
    ruins: 'crumbling urban ruins with collapsed skyscrapers and overgrown streets',
    highway: 'broken highway system with twisted overpasses and abandoned checkpoints',
    canyon: 'rocky canyon networks with hidden caves and ancient petroglyphs',
    gasstation: 'abandoned gas station with rusted pumps and scavenged parts',
    scrapyard: 'massive vehicle graveyard with towering heaps of twisted metal',
    outpost: 'remote military or trading outpost with defensive fortifications',
    bridge: 'collapsed or damaged bridge spanning dangerous terrain',
    // City environments
    settlement: 'makeshift trading settlement built from salvaged materials',
    bunker: 'underground bunker complex with reinforced corridors',
    market: 'bustling merchant hub with improvised stalls and traders',
    fortress: 'heavily fortified compound with armed guards and walls'
  };
  
  const eventTypeGuidelines = {
    // Road event types
    combat: 'hostile encounter requiring tactical decisions - raiders, mutants, or territorial gangs',
    hazard: 'environmental danger testing survival skills - radiation, storms, unstable terrain',
    discovery: 'uncovering something valuable or mysterious - ruins, caches, or hidden knowledge',
    resource: 'opportunity to acquire fuel, parts, supplies, or equipment through various means',
    vehicle: 'vehicle-related encounter - breakdowns, chases, salvage, or mechanical challenges',
    weather: 'extreme weather event affecting travel - sandstorms, acid rain, radiation clouds',
    stranger: 'encountering other wasteland travelers with unknown intentions and backstories',
    // City event types
    politics: 'factional maneuvering requiring diplomacy - power struggles, alliances, betrayals',
    trade: 'commercial opportunities or negotiations - rare goods, services, information exchange',
    conflict: 'settlement disputes requiring mediation - resource conflicts, territorial disputes',
    intrigue: 'hidden agendas and secrets surfacing - spy networks, conspiracies, hidden motives',
    rumors: 'information gathering and social interaction - gossip, legends, intelligence networks',
    festival: 'special celebration or gathering - markets, competitions, cultural events',
    crisis: 'urgent settlement emergency requiring immediate action - disasters, attacks, system failures'
  };
  
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
  const recentEvents = context.recentEvents || [];
  if (recentEvents.length > 0) {
    prompt += `\n\n**Recent Session Events (for continuity):**`;
    recentEvents.slice(-3).forEach((event, i) => { // Limit to last 3 events
      prompt += `\n${i + 1}. "${event.name}" (${event.phase}): ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}`;
    });
  }

  // Include connected story elements
  const connectedNodes = context.connectedNodes || [];
  if (connectedNodes.length > 0) {
    prompt += `\n\n**Existing Story Elements (consider connections):**`;
    connectedNodes.slice(0, 5).forEach(node => { // Limit to 5 nodes
      prompt += `\n- ${node.type.toUpperCase()}: "${node.name}" - ${node.description.substring(0, 150)}${node.description.length > 150 ? '...' : ''}`;
    });
  }

  // Generation requirements
  prompt += `\n\n**Generate a ${focusType} event that:**
1. Fits naturally into the current narrative context and chosen environment
2. Creates meaningful player choices with consequences and multiple resolution paths
3. Can connect to existing story elements when appropriate
4. Maintains strong dieselpunk aesthetic (rust, metal, scavenged tech, survival themes)
5. Is appropriate for the current session phase and threat level
6. Provides clear GM guidance for execution with specific details
7. Incorporates environmental details: ${context.environment ? (environmentDescriptions as any)[context.environment] || context.environment : 'appropriate setting'}
8. Follows event type guidelines: ${context.eventType ? (eventTypeGuidelines as any)[context.eventType] || 'general encounter' : 'contextual encounter'}
9. Considers time and weather: ${context.timeOfDay || 'any time'} with ${context.weather || 'normal'} conditions

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
