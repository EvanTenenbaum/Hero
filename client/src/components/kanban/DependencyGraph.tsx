/**
 * DependencyGraph Component
 * Phase 2 - Dependency Visualization
 * 
 * Visual graph showing card dependencies and blockers using SVG.
 */

import { useMemo, useState, useCallback } from "react";
import { AlertTriangle, Link2, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DependencyNode {
  id: number;
  title: string;
  columnId: number;
  columnName: string;
  status: string;
  isBlocked: boolean;
  cardType: string;
  priority: string;
}

export interface DependencyEdge {
  id: number;
  sourceId: number;
  targetId: number;
  dependencyType: string;
  description?: string | null;
}

export interface DependencyGraphData {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  blockedCards: number[];
  criticalPath: number[];
}

interface DependencyGraphProps {
  data: DependencyGraphData;
  onCardClick?: (cardId: number) => void;
  isLoading?: boolean;
}

const priorityColors: Record<string, string> = {
  critical: "#DC2626",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

const cardTypeColors: Record<string, string> = {
  epic: "#8B5CF6",
  feature: "#3B82F6",
  task: "#6B7280",
  bug: "#EF4444",
  spike: "#F59E0B",
  chore: "#64748B",
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;

export function DependencyGraph({
  data,
  onCardClick,
  isLoading,
}: DependencyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  // Calculate node positions using a simple layered layout
  const layout = useMemo(() => {
    if (!data.nodes.length) return { positions: new Map(), width: 0, height: 0 };

    // Build adjacency list
    const dependsOn = new Map<number, number[]>(); // card -> cards it depends on
    const dependedBy = new Map<number, number[]>(); // card -> cards that depend on it

    for (const node of data.nodes) {
      dependsOn.set(node.id, []);
      dependedBy.set(node.id, []);
    }

    for (const edge of data.edges) {
      dependsOn.get(edge.targetId)?.push(edge.sourceId);
      dependedBy.get(edge.sourceId)?.push(edge.targetId);
    }

    // Calculate layers using topological sort
    const layers: number[][] = [];
    const assigned = new Set<number>();
    const nodeIds = data.nodes.map(n => n.id);

    // Start with nodes that have no dependencies
    let currentLayer = nodeIds.filter(id => dependsOn.get(id)?.length === 0);
    
    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      currentLayer.forEach(id => assigned.add(id));

      // Next layer: nodes whose dependencies are all assigned
      currentLayer = nodeIds.filter(id => {
        if (assigned.has(id)) return false;
        const deps = dependsOn.get(id) || [];
        return deps.every(depId => assigned.has(depId));
      });
    }

    // Add remaining nodes (cycles) to the last layer
    const remaining = nodeIds.filter(id => !assigned.has(id));
    if (remaining.length > 0) {
      layers.push(remaining);
    }

    // Calculate positions
    const positions = new Map<number, { x: number; y: number }>();
    let maxX = 0;
    let maxY = 0;

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      const x = layerIdx * (NODE_WIDTH + HORIZONTAL_GAP) + 50;

      for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
        const y = nodeIdx * (NODE_HEIGHT + VERTICAL_GAP) + 50;
        positions.set(layer[nodeIdx], { x, y });
        maxX = Math.max(maxX, x + NODE_WIDTH);
        maxY = Math.max(maxY, y + NODE_HEIGHT);
      }
    }

    return { positions, width: maxX + 50, height: maxY + 50 };
  }, [data]);

  const handleNodeClick = useCallback((nodeId: number) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
    onCardClick?.(nodeId);
  }, [selectedNode, onCardClick]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading dependency graph...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Link2 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No dependencies</p>
          <p className="text-sm">Add dependencies between cards to see the graph</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Dependency Graph
        </CardTitle>
        <div className="flex items-center gap-2">
          {data.blockedCards.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.blockedCards.length} blocked
            </Badge>
          )}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-auto" style={{ maxHeight: "500px" }}>
        <TooltipProvider>
          <svg
            width={layout.width * zoom}
            height={layout.height * zoom}
            style={{ minWidth: "100%" }}
          >
            <g transform={`scale(${zoom})`}>
              {/* Draw edges */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6B7280"
                  />
                </marker>
                <marker
                  id="arrowhead-blocked"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#DC2626"
                  />
                </marker>
              </defs>
              
              {data.edges.map(edge => {
                const sourcePos = layout.positions.get(edge.sourceId);
                const targetPos = layout.positions.get(edge.targetId);
                if (!sourcePos || !targetPos) return null;

                const isBlocking = data.blockedCards.includes(edge.targetId);
                const x1 = sourcePos.x + NODE_WIDTH;
                const y1 = sourcePos.y + NODE_HEIGHT / 2;
                const x2 = targetPos.x;
                const y2 = targetPos.y + NODE_HEIGHT / 2;

                // Bezier curve control points
                const cx1 = x1 + (x2 - x1) / 3;
                const cx2 = x2 - (x2 - x1) / 3;

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={isBlocking ? "#DC2626" : "#6B7280"}
                      strokeWidth={isBlocking ? 2 : 1.5}
                      strokeDasharray={edge.dependencyType === "relates_to" ? "5,5" : undefined}
                      markerEnd={isBlocking ? "url(#arrowhead-blocked)" : "url(#arrowhead)"}
                      opacity={0.7}
                    />
                  </g>
                );
              })}

              {/* Draw nodes */}
              {data.nodes.map(node => {
                const pos = layout.positions.get(node.id);
                if (!pos) return null;

                const isBlocked = data.blockedCards.includes(node.id);
                const isCritical = data.criticalPath.includes(node.id);
                const isSelected = selectedNode === node.id;

                return (
                  <Tooltip key={node.id}>
                    <TooltipTrigger asChild>
                      <g
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => handleNodeClick(node.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Node background */}
                        <rect
                          width={NODE_WIDTH}
                          height={NODE_HEIGHT}
                          rx={8}
                          fill={isBlocked ? "#1F1315" : "#1E293B"}
                          stroke={
                            isSelected
                              ? "#3B82F6"
                              : isBlocked
                              ? "#DC2626"
                              : isCritical
                              ? "#F59E0B"
                              : "#334155"
                          }
                          strokeWidth={isSelected ? 2 : 1}
                        />
                        
                        {/* Priority indicator */}
                        <rect
                          x={0}
                          y={0}
                          width={4}
                          height={NODE_HEIGHT}
                          rx={2}
                          fill={priorityColors[node.priority] || "#6B7280"}
                        />

                        {/* Card type badge */}
                        <rect
                          x={12}
                          y={8}
                          width={50}
                          height={16}
                          rx={4}
                          fill={cardTypeColors[node.cardType] || "#6B7280"}
                          opacity={0.3}
                        />
                        <text
                          x={37}
                          y={19}
                          textAnchor="middle"
                          fontSize={9}
                          fill={cardTypeColors[node.cardType] || "#6B7280"}
                          fontWeight="500"
                        >
                          {node.cardType.toUpperCase()}
                        </text>

                        {/* Title */}
                        <text
                          x={12}
                          y={40}
                          fontSize={11}
                          fill="#E2E8F0"
                          fontWeight="500"
                        >
                          {node.title.length > 20
                            ? node.title.substring(0, 20) + "..."
                            : node.title}
                        </text>

                        {/* Column name */}
                        <text
                          x={12}
                          y={52}
                          fontSize={9}
                          fill="#64748B"
                        >
                          {node.columnName}
                        </text>

                        {/* Blocked indicator */}
                        {isBlocked && (
                          <g transform={`translate(${NODE_WIDTH - 20}, 8)`}>
                            <circle r={8} fill="#DC2626" opacity={0.2} />
                            <text
                              textAnchor="middle"
                              y={4}
                              fontSize={10}
                              fill="#DC2626"
                            >
                              !
                            </text>
                          </g>
                        )}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{node.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {node.columnName} • {node.cardType} • {node.priority}
                        </p>
                        {isBlocked && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Blocked by dependencies
                          </p>
                        )}
                        {isCritical && (
                          <p className="text-xs text-yellow-500">
                            On critical path
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </g>
          </svg>
        </TooltipProvider>
      </CardContent>

      {/* Legend */}
      <div className="flex items-center gap-4 p-3 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-yellow-500" />
          <span>Critical Path</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          <span>Depends on</span>
        </div>
      </div>
    </Card>
  );
}
