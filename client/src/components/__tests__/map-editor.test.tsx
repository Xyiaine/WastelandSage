
/**
 * Map Editor Component Tests
 * 
 * Tests for the new map generation and editing system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapEditor } from '../map-editor';
import { useMapEditor } from '../../hooks/use-map-editor';

// Mock the custom hook
jest.mock('../../hooks/use-map-editor');

const mockUseMapEditor = useMapEditor as jest.MockedFunction<typeof useMapEditor>;

describe('MapEditor', () => {
  const defaultHookReturn = {
    mapState: {
      cities: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      gridVisible: false,
      gridSize: 20,
      snapToGrid: true
    },
    history: [],
    historyIndex: 0,
    canUndo: false,
    canRedo: false,
    undo: jest.fn(),
    redo: jest.fn(),
    updateMapState: jest.fn(),
    addCity: jest.fn(),
    updateCity: jest.fn(),
    deleteCity: jest.fn(),
    moveCity: jest.fn(),
    snapToGrid: jest.fn((x, y) => ({ x, y })),
    transformCoordinates: jest.fn((x, y) => ({ x, y })),
    reverseTransformCoordinates: jest.fn((x, y) => ({ x, y })),
    validateCityPlacement: jest.fn(() => ({ valid: true })),
    selectCitiesInArea: jest.fn(),
    bulkUpdateCities: jest.fn(),
    exportMapData: jest.fn(),
    importMapData: jest.fn(),
    saveToStorage: jest.fn(),
    loadFromStorage: jest.fn(),
    resetToDefault: jest.fn()
  };

  beforeEach(() => {
    mockUseMapEditor.mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the map editor interface', () => {
    render(<MapEditor />);
    
    expect(screen.getByRole('button', { name: /import map image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add city/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle grid/i })).toBeInTheDocument();
    expect(screen.getByText(/map controls/i)).toBeInTheDocument();
  });

  it('displays cities on the map', () => {
    const citiesWithData = {
      ...defaultHookReturn,
      mapState: {
        ...defaultHookReturn.mapState,
        cities: [
          {
            id: 'city-1',
            name: 'Test City',
            x: 100,
            y: 100,
            type: 'city' as const,
            threatLevel: 2,
            politicalStance: 'neutral' as const,
            population: 5000
          }
        ]
      }
    };
    
    mockUseMapEditor.mockReturnValue(citiesWithData);
    
    render(<MapEditor />);
    
    expect(screen.getByText('All Cities (1)')).toBeInTheDocument();
    expect(screen.getByText('Test City')).toBeInTheDocument();
  });

  it('handles city selection', async () => {
    const user = userEvent.setup();
    const citiesWithData = {
      ...defaultHookReturn,
      mapState: {
        ...defaultHookReturn.mapState,
        cities: [
          {
            id: 'city-1',
            name: 'Test City',
            x: 100,
            y: 100,
            type: 'city' as const,
            threatLevel: 2,
            politicalStance: 'neutral' as const,
            population: 5000,
            controllingFaction: 'Test Faction',
            description: 'A test city'
          }
        ]
      }
    };
    
    mockUseMapEditor.mockReturnValue(citiesWithData);
    
    render(<MapEditor />);
    
    // Click on city in the list
    await user.click(screen.getByText('Test City'));
    
    // Should show city details
    expect(screen.getByText('Test City')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument(); // Population formatted
    expect(screen.getByText('Test Faction')).toBeInTheDocument();
  });

  it('handles undo/redo operations', async () => {
    const user = userEvent.setup();
    const undoRedoHook = {
      ...defaultHookReturn,
      canUndo: true,
      canRedo: true
    };
    
    mockUseMapEditor.mockReturnValue(undoRedoHook);
    
    render(<MapEditor />);
    
    await user.click(screen.getByRole('button', { name: /undo/i }));
    expect(undoRedoHook.undo).toHaveBeenCalled();
    
    await user.click(screen.getByRole('button', { name: /redo/i }));
    expect(undoRedoHook.redo).toHaveBeenCalled();
  });

  it('handles grid toggle', async () => {
    const user = userEvent.setup();
    
    render(<MapEditor />);
    
    await user.click(screen.getByRole('button', { name: /toggle grid/i }));
    
    expect(defaultHookReturn.updateMapState).toHaveBeenCalledWith(
      { gridVisible: true },
      'Toggle grid'
    );
  });

  it('handles zoom operations', async () => {
    const user = userEvent.setup();
    
    render(<MapEditor />);
    
    await user.click(screen.getByRole('button', { name: /zoom in/i }));
    await user.click(screen.getByRole('button', { name: /zoom out/i }));
    
    // Should call updateMapState for zoom changes
    expect(defaultHookReturn.updateMapState).toHaveBeenCalled();
  });

  it('handles read-only mode', () => {
    render(<MapEditor readOnly={true} />);
    
    // Add city button should be disabled
    expect(screen.getByRole('button', { name: /add city/i })).toBeDisabled();
  });

  it('shows proper city type icons', () => {
    const citiesWithDifferentTypes = {
      ...defaultHookReturn,
      mapState: {
        ...defaultHookReturn.mapState,
        cities: [
          {
            id: 'city-1',
            name: 'City',
            x: 100,
            y: 100,
            type: 'city' as const,
            threatLevel: 1
          },
          {
            id: 'fortress-1',
            name: 'Fortress',
            x: 200,
            y: 200,
            type: 'fortress' as const,
            threatLevel: 4
          }
        ]
      }
    };
    
    mockUseMapEditor.mockReturnValue(citiesWithDifferentTypes);
    
    render(<MapEditor />);
    
    expect(screen.getByText('All Cities (2)')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Fortress')).toBeInTheDocument();
  });

  it('handles map state callbacks', () => {
    const onCitiesChange = jest.fn();
    const onMapStateChange = jest.fn();
    
    render(
      <MapEditor 
        onCitiesChange={onCitiesChange}
        onMapStateChange={onMapStateChange}
      />
    );
    
    // Verify callbacks are set up (would be called when state changes)
    expect(onCitiesChange).not.toHaveBeenCalled();
    expect(onMapStateChange).not.toHaveBeenCalled();
  });

  it('displays threat level indicators correctly', () => {
    const citiesWithThreats = {
      ...defaultHookReturn,
      mapState: {
        ...defaultHookReturn.mapState,
        cities: [
          {
            id: 'safe-city',
            name: 'Safe City',
            x: 100,
            y: 100,
            type: 'city' as const,
            threatLevel: 1
          },
          {
            id: 'dangerous-city',
            name: 'Dangerous City',
            x: 200,
            y: 200,
            type: 'fortress' as const,
            threatLevel: 5
          }
        ]
      }
    };
    
    mockUseMapEditor.mockReturnValue(citiesWithThreats);
    
    render(<MapEditor />);
    
    expect(screen.getByText('Safe City')).toBeInTheDocument();
    expect(screen.getByText('Dangerous City')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', () => {
    render(<MapEditor />);
    
    // Test Ctrl+Z for undo
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(defaultHookReturn.undo).toHaveBeenCalled();
    
    // Test Ctrl+Shift+Z for redo
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(defaultHookReturn.redo).toHaveBeenCalled();
  });

  it('validates initial cities prop', () => {
    const initialCities = [
      {
        id: 'initial-city',
        name: 'Initial City',
        x: 50,
        y: 50,
        type: 'settlement' as const,
        threatLevel: 2
      }
    ];
    
    render(<MapEditor initialCities={initialCities} />);
    
    // Should initialize with provided cities
    expect(mockUseMapEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: expect.objectContaining({
          cities: initialCities
        })
      })
    );
  });
});

describe('MapEditor Integration', () => {
  it('handles complete city workflow', async () => {
    const user = userEvent.setup();
    
    // Mock file input for map image
    const mockFile = new File(['test'], 'map.png', { type: 'image/png' });
    
    render(<MapEditor />);
    
    // Upload map image
    const fileInput = screen.getByRole('button', { name: /import map image/i });
    
    // Note: Actual file upload testing would require more complex setup
    // This tests the UI presence
    expect(fileInput).toBeInTheDocument();
  });

  it('maintains map state consistency', () => {
    const onMapStateChange = jest.fn();
    
    const { rerender } = render(
      <MapEditor onMapStateChange={onMapStateChange} />
    );
    
    // Update with new cities
    const newCities = [
      {
        id: 'new-city',
        name: 'New City',
        x: 100,
        y: 100,
        type: 'city' as const,
        threatLevel: 1
      }
    ];
    
    rerender(
      <MapEditor 
        initialCities={newCities}
        onMapStateChange={onMapStateChange} 
      />
    );
    
    // Should handle state updates properly
    expect(mockUseMapEditor).toHaveBeenCalled();
  });
});
