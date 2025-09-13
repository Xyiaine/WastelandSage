import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Network, List, Edit3 } from "lucide-react";
import type { NodeData, ConnectionData, NodeType } from "@/lib/types";

interface NodeGraphProps {
  sessionId: string;
  nodes: NodeData[];
  connections: ConnectionData[];
}

interface SelectedNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  connections: number;
  createdAt: Date;
}

export function NodeGraph({ sessionId, nodes, connections }: NodeGraphProps) {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNode, setNewNode] = useState({
    type: 'event' as NodeType,
    name: '',
    description: ''
  });

  const createNodeMutation = useMutation({
    mutationFn: async (nodeData: { type: NodeType; name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/nodes', {
        sessionId,
        ...nodeData,
        properties: {},
        x: Math.random() * 400,
        y: Math.random() * 350
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'nodes'] });
      setIsAddingNode(false);
      setNewNode({ type: 'event', name: '', description: '' });
      toast({
        title: "Node Created",
        description: "New node has been added to your scenario library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Node",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getNodeColor = useCallback((type: NodeType) => {
    switch (type) {
      case 'event': return '#D4722B'; // rust
      case 'npc': return '#C9A96E'; // brass
      case 'faction': return '#DC2626'; // red
      case 'location': return '#7CB342'; // toxic green
      case 'item': return '#3B82F6'; // blue
      default: return '#525252'; // steel
    }
  }, []);

  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach(conn => {
      counts[conn.fromNodeId] = (counts[conn.fromNodeId] || 0) + 1;
      counts[conn.toNodeId] = (counts[conn.toNodeId] || 0) + 1;
    });
    return counts;
  }, [connections]);

  const getNodeConnections = useCallback((nodeId: string) => {
    return connectionCounts[nodeId] || 0;
  }, [connectionCounts]);

  const handleNodeClick = useCallback((node: NodeData) => {
    setSelectedNode({
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      connections: getNodeConnections(node.id),
      createdAt: node.createdAt
    });
  }, [getNodeConnections]);

  // Create immutable node positions to avoid mutating props
  const nodePositions = useMemo(() => {
    if (nodes.length === 0) return {};
    
    const width = 400;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2;
    const positions: Record<string, { x: number; y: number }> = {};

    // Position nodes in a circular layout for now
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
    
    return positions;
  }, [nodes]);

  // Create node lookup map for O(1) access
  const nodeById = useMemo(() => {
    const map: Record<string, NodeData> = {};
    nodes.forEach(node => {
      map[node.id] = node;
    });
    return map;
  }, [nodes]);

  const handleCreateNode = () => {
    if (!newNode.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the node.",
        variant: "destructive",
      });
      return;
    }
    createNodeMutation.mutate(newNode);
  };

  if (viewMode === 'timeline') {
    return (
      <div className="metal-panel rounded-lg p-6 h-full min-h-[800px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-rust-400">Scenario Library</h2>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setViewMode('graph')}
              size="sm"
              className="industrial-button"
              data-testid="button-graph-view"
            >
              <Network className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => setViewMode('timeline')}
              size="sm"
              className="industrial-button bg-rust-500 border-rust-600"
              data-testid="button-timeline-view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-center text-gray-400 py-8">
          <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Timeline view coming soon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metal-panel rounded-lg p-6 h-full min-h-[800px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rust-400">Scenario Library</h2>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setViewMode('graph')}
            size="sm"
            className="industrial-button bg-rust-500 border-rust-600"
            data-testid="button-graph-view"
          >
            <Network className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setViewMode('timeline')}
            size="sm"
            className="industrial-button"
            data-testid="button-timeline-view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Graph Container */}
      <div className="bg-black/30 border border-steel-600 rounded-lg p-4 h-96 relative overflow-hidden">
        <svg 
          ref={svgRef}
          className="w-full h-full" 
          viewBox="0 0 400 350"
          data-testid="node-graph-svg"
          role="group"
          aria-labelledby="node-graph-title"
        >
          <title id="node-graph-title">Interactive node graph showing relationships between scenario elements</title>
          {/* Connections */}
          <g className="connections">
            {connections.map(connection => {
              const fromNode = nodeById[connection.fromNodeId];
              const toNode = nodeById[connection.toNodeId];
              const fromPos = nodePositions[connection.fromNodeId];
              const toPos = nodePositions[connection.toNodeId];
              
              if (!fromNode || !toNode || !fromPos || !toPos) return null;
              
              return (
                <line
                  key={connection.id}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  className="connection-line"
                  strokeWidth={connection.strength}
                />
              );
            })}
          </g>
          
          {/* Nodes */}
          <g className="nodes">
            {nodes.map(node => {
              const color = getNodeColor(node.type);
              const position = nodePositions[node.id];
              
              if (!position) return null;
              
              if (node.type === 'event') {
                return (
                  <g key={node.id}>
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r="12"
                      fill={color}
                      stroke={color}
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-400 focus-visible:ring-offset-2"
                      onClick={() => handleNodeClick(node)}
                      data-testid={`node-${node.type}-${node.id}`}
                      role="button"
                      aria-label={`${node.type} node: ${node.name} - ${node.description || 'No description'}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNodeClick(node);
                        }
                      }}
                    />
                    <text
                      x={position.x}
                      y={position.y + 4}
                      textAnchor="middle"
                      className="text-xs fill-white font-mono pointer-events-none"
                    >
                      E
                    </text>
                  </g>
                );
              } else if (node.type === 'npc') {
                return (
                  <g key={node.id}>
                    <rect
                      x={position.x - 6}
                      y={position.y - 6}
                      width="12"
                      height="12"
                      fill={color}
                      stroke={color}
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleNodeClick(node)}
                      data-testid={`node-${node.type}-${node.id}`}
                    />
                    <text
                      x={position.x}
                      y={position.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-mono pointer-events-none"
                    >
                      N
                    </text>
                  </g>
                );
              } else {
                // Triangle for factions, locations, items
                const points = `${position.x},${position.y - 8} ${position.x - 7},${position.y + 6} ${position.x + 7},${position.y + 6}`;
                return (
                  <g key={node.id}>
                    <polygon
                      points={points}
                      fill={color}
                      stroke={color}
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleNodeClick(node)}
                      data-testid={`node-${node.type}-${node.id}`}
                    />
                    <text
                      x={position.x}
                      y={position.y + 2}
                      textAnchor="middle"
                      className="text-xs fill-white font-mono pointer-events-none"
                    >
                      {node.type.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              }
            })}
          </g>
        </svg>
        
        {/* Node Legend */}
        <div className="absolute top-2 right-2 bg-steel-800/90 p-3 rounded-lg text-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getNodeColor('event') }}></div>
              <span>Events</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3" style={{ backgroundColor: getNodeColor('npc') }}></div>
              <span>NPCs</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 triangle" style={{ backgroundColor: getNodeColor('faction') }}></div>
              <span>Factions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 triangle" style={{ backgroundColor: getNodeColor('location') }}></div>
              <span>Locations</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 triangle" style={{ backgroundColor: getNodeColor('item') }}></div>
              <span>Items</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Node Management */}
      <div className="mt-4 flex items-center justify-between">
        <Dialog open={isAddingNode} onOpenChange={setIsAddingNode}>
          <DialogTrigger asChild>
            <Button 
              className="industrial-button px-4 py-2 rounded-lg text-sm"
              data-testid="button-add-node"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Node
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-steel-800 border-steel-600">
            <DialogHeader>
              <DialogTitle className="text-rust-400">Create New Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select value={newNode.type} onValueChange={(value: NodeType) => setNewNode(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="bg-steel-700 border-steel-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="npc">NPC</SelectItem>
                    <SelectItem value="faction">Faction</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={newNode.name}
                  onChange={(e) => setNewNode(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-steel-700 border-steel-500"
                  placeholder="Enter node name..."
                  data-testid="input-node-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newNode.description}
                  onChange={(e) => setNewNode(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-steel-700 border-steel-500"
                  placeholder="Enter description..."
                  data-testid="textarea-node-description"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  onClick={() => setIsAddingNode(false)}
                  variant="outline"
                  className="border-steel-500"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateNode}
                  disabled={createNodeMutation.isPending}
                  className="btn-rust"
                  data-testid="button-create-node"
                >
                  {createNodeMutation.isPending ? 'Creating...' : 'Create Node'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="text-sm text-gray-400 font-mono" data-testid="text-node-count">
          {nodes.length} nodes, {connections.length} connections
        </div>
      </div>
      
      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 bg-steel-700 border border-steel-600 rounded-lg p-4 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getNodeColor(selectedNode.type) }}
              ></div>
              <span className="font-medium">{selectedNode.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 font-mono">
                {selectedNode.type.toUpperCase()} #{selectedNode.id.slice(-4)}
              </span>
              <Button size="sm" variant="ghost" className="p-1 h-auto">
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {selectedNode.description && (
            <p className="text-gray-300 text-xs mb-2">{selectedNode.description}</p>
          )}
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>{selectedNode.connections} connections</span>
            <span>Created: {new Date(selectedNode.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
