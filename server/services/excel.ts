/**
 * Excel Import/Export Service
 * 
 * Handles importing and exporting scenarios and regions as Excel files
 * for backup, sharing, and bulk data management operations.
 */

import XLSX from 'xlsx';
import { Scenario, Region } from '../../shared/schema';

/**
 * Export scenarios and their regions to Excel format
 */
export function exportScenariosToExcel(scenarios: Scenario[], regions: Region[]): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Prepare scenarios data for export
  const scenariosData = scenarios.map(scenario => ({
    ID: scenario.id,
    Title: scenario.title,
    'Main Idea': scenario.mainIdea,
    'World Context': scenario.worldContext || '',
    'Political Situation': scenario.politicalSituation || '',
    'Key Themes': Array.isArray(scenario.keyThemes) ? scenario.keyThemes.join(', ') : '',
    Status: scenario.status,
    'User ID': scenario.userId || '',
    'Created At': scenario.createdAt ? new Date(scenario.createdAt).toISOString() : '',
    'Updated At': scenario.updatedAt ? new Date(scenario.updatedAt).toISOString() : ''
  }));

  // Prepare regions data for export
  const regionsData = regions.map(region => ({
    ID: region.id,
    'Scenario ID': region.scenarioId || '',
    Name: region.name,
    Type: region.type,
    Description: region.description || '',
    'Controlling Faction': region.controllingFaction || '',
    Population: region.population || '',
    Resources: Array.isArray(region.resources) ? region.resources.join(', ') : '',
    'Threat Level': region.threatLevel,
    'Political Stance': region.politicalStance || '',
    'Trade Routes': Array.isArray(region.tradeRoutes) ? region.tradeRoutes.join(', ') : '',
    'Created At': region.createdAt ? new Date(region.createdAt).toISOString() : ''
  }));

  // Create worksheets
  const scenariosWorksheet = XLSX.utils.json_to_sheet(scenariosData);
  const regionsWorksheet = XLSX.utils.json_to_sheet(regionsData);

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(workbook, scenariosWorksheet, 'Scenarios');
  XLSX.utils.book_append_sheet(workbook, regionsWorksheet, 'Regions');

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}

/**
 * Import scenarios and regions from Excel file
 */
export function importScenariosFromExcel(fileBuffer: Buffer): {
  scenarios: Array<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>;
  regions: Array<Omit<Region, 'id' | 'createdAt'>>;
} {
  // Read the Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  const result = {
    scenarios: [] as Array<Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>>,
    regions: [] as Array<Omit<Region, 'id' | 'createdAt'>>
  };

  // Process scenarios sheet
  if (workbook.SheetNames.includes('Scenarios')) {
    const scenariosSheet = workbook.Sheets['Scenarios'];
    const scenariosRawData = XLSX.utils.sheet_to_json(scenariosSheet);

    result.scenarios = scenariosRawData.map((row: any) => ({
      title: row['Title'] || '',
      mainIdea: row['Main Idea'] || '',
      worldContext: row['World Context'] || null,
      politicalSituation: row['Political Situation'] || null,
      keyThemes: row['Key Themes'] ? row['Key Themes'].split(', ').filter((t: string) => t.trim()) : [],
      status: (['draft', 'active', 'completed', 'archived'].includes(row['Status']) ? row['Status'] : 'draft') as 'draft' | 'active' | 'completed' | 'archived',
      userId: row['User ID'] || null
    }));
  }

  // Process regions sheet
  if (workbook.SheetNames.includes('Regions')) {
    const regionsSheet = workbook.Sheets['Regions'];
    const regionsRawData = XLSX.utils.sheet_to_json(regionsSheet);

    result.regions = regionsRawData.map((row: any) => ({
      scenarioId: row['Scenario ID'] || null,
      name: row['Name'] || '',
      type: (['city', 'settlement', 'wasteland', 'fortress', 'trade_hub'].includes(row['Type']) ? row['Type'] : 'city') as 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub',
      description: row['Description'] || null,
      controllingFaction: row['Controlling Faction'] || null,
      population: row['Population'] ? parseInt(row['Population']) || null : null,
      resources: row['Resources'] ? row['Resources'].split(', ').filter((r: string) => r.trim()) : [],
      threatLevel: row['Threat Level'] ? parseInt(row['Threat Level']) || 1 : 1,
      politicalStance: (['hostile', 'neutral', 'friendly', 'allied'].includes(row['Political Stance']) ? row['Political Stance'] : null) as 'hostile' | 'neutral' | 'friendly' | 'allied' | null,
      tradeRoutes: row['Trade Routes'] ? row['Trade Routes'].split(', ').filter((r: string) => r.trim()) : []
    }));
  }

  return result;
}

/**
 * Validate imported data before processing
 */
export function validateImportedData(data: ReturnType<typeof importScenariosFromExcel>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate scenarios
  data.scenarios.forEach((scenario, index) => {
    if (!scenario.title || scenario.title.trim().length === 0) {
      errors.push(`Scenario row ${index + 2}: Title is required`);
    }
    if (!scenario.mainIdea || scenario.mainIdea.trim().length < 10) {
      errors.push(`Scenario row ${index + 2}: Main idea must be at least 10 characters`);
    }
  });

  // Validate regions
  data.regions.forEach((region, index) => {
    if (!region.name || region.name.trim().length === 0) {
      errors.push(`Region row ${index + 2}: Name is required`);
    }
    if (region.threatLevel != null && (region.threatLevel < 1 || region.threatLevel > 5)) {
      errors.push(`Region row ${index + 2}: Threat level must be between 1 and 5`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}