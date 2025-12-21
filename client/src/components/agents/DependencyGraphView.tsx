/**
 * Dependency Graph Visualization Component
 * 
 * Displays task dependencies as an interactive graph with:
 * - Node-based task visualization
 * - Edge connections for dependencies
 * - Critical path highlighting
 * - Blocker indicators
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface TaskNode {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  agentType?: string;
  estimatedHours?: number;
  dependencies: number[];
  isCriticalPath?: boolean;
}

interface DependencyGraphViewProps {
  tasks: TaskNode[];
  criticalPath?: number[];
  onTaskClick?: (taskId: number) => void;
}

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT CALCULATION
// ════════════════════════════════════════════════════════════════════════════

interface NodePosition {
  x: number;
  y: number;
  level: number;
}

function calculateLayout(tasks: TaskNode[]): Map<number, NodePosition> {
  const positions = new Map<number, NodePosition>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // Calculate levels using topological sort
  const levels = new Map<number, number>();
  const inDegree = new Map<number, number>();
  
  // Initialize
  for (const task of tasks) {
    inDegree.set(task.id, 0);
  }
  
  // Count incoming edges
  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (taskMap.has(depId)) {
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }
  }
  
  // BFS to assign levels
  const queue: number[] = [];
  for (const task of tasks) {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
      levels.set(task.id, 0);
    }
  }
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;
    
    // Find tasks that depend on this one
    for (const task of tasks) {
      if (task.dependencies.includes(current)) {
        const newLevel = Math.max(levels.get(task.id) || 0, currentLevel + 1);
        levels.set(task.id, newLevel);
        
        const remaining = (inDegree.get(task.id) || 1) - 1;
        inDegree.set(task.id, remaining);
        
        if (remaining === 0) {
          queue.push(task.id);
        }
      }
    }
  }
  
  // Group tasks by level
  const levelGroups = new Map<number, number[]>();
  for (const task of tasks) {
    const level = levels.get(task.id) || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(task.id);
  }
  
  // Calculate positions
  const nodeWidth = 180;
  const nodeHeight = 80;
  const horizontalGap = 60;
  const verticalGap = 40;
  
  for (const [level, taskIds] of Array.from(levelGroups.entries())) {
    const totalHeight = taskIds.length * nodeHeight + (taskIds.length - 1) * verticalGap;
    const startY = -totalHeight / 2;
    
    taskIds.forEach((taskId, index) => {
      positions.set(taskId, {
        x: level * (nodeWidth + horizontalGap),
        y: startY + index * (nodeHeight + verticalGap),
        level,
      });
    });
  }
  
  return positions;
}

// ════════════════════════════════════════════════════════════════════════════
// TASK NODE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface TaskNodeComponentProps {
  task: TaskNode;
  position: NodePosition;
  isSelected: boolean;
  onClick: () => void;
}

function TaskNodeComponent({ task, position, isSelected, onClick }: TaskNodeComponentProps) {
  const statusColors = {
    todo: "bg-gray-100 border-gray-300",
    in_progress: "bg-blue-50 border-blue-300",
    done: "bg-green-50 border-green-300",
    blocked: "bg-red-50 border-red-300",
  };
  
  const priorityColors = {
    low: "bg-gray-200",
    medium: "bg-yellow-200",
    high: "bg-orange-200",
    critical: "bg-red-200",
  };
  
  const StatusIcon = {
    todo: Circle,
    in_progress: ArrowRight,
    done: CheckCircle2,
    blocked: AlertTriangle,
  }[task.status];
  
  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      {/* Node background */}
      <rect
        width={170}
        height={70}
        rx={8}
        className={`${statusColors[task.status]} ${
          isSelected ? "stroke-blue-500 stroke-2" : "stroke-gray-400"
        } ${task.isCriticalPath ? "stroke-orange-500 stroke-2" : ""}`}
        fill="white"
        strokeWidth={isSelected ? 2 : 1}
      />
      
      {/* Critical path indicator */}
      {task.isCriticalPath && (
        <rect
          x={-4}
          y={-4}
          width={178}
          height={78}
          rx={10}
          fill="none"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
      
      {/* Status icon */}
      <foreignObject x={8} y={8} width={20} height={20}>
        <StatusIcon className={`w-4 h-4 ${
          task.status === "blocked" ? "text-red-500" :
          task.status === "done" ? "text-green-500" :
          task.status === "in_progress" ? "text-blue-500" :
          "text-gray-400"
        }`} />
      </foreignObject>
      
      {/* Title */}
      <text
        x={32}
        y={22}
        className="text-sm font-medium fill-gray-900"
        style={{ fontSize: "12px" }}
      >
        {task.title.length > 18 ? task.title.slice(0, 18) + "..." : task.title}
      </text>
      
      {/* Priority badge */}
      <rect
        x={8}
        y={32}
        width={50}
        height={18}
        rx={4}
        className={priorityColors[task.priority]}
      />
      <text
        x={33}
        y={44}
        textAnchor="middle"
        className="text-xs fill-gray-700"
        style={{ fontSize: "10px" }}
      >
        {task.priority}
      </text>
      
      {/* Agent type */}
      {task.agentType && (
        <>
          <rect
            x={62}
            y={32}
            width={40}
            height={18}
            rx={4}
            fill="#e0e7ff"
          />
          <text
            x={82}
            y={44}
            textAnchor="middle"
            className="text-xs fill-indigo-700"
            style={{ fontSize: "10px" }}
          >
            {task.agentType}
          </text>
        </>
      )}
      
      {/* Estimated hours */}
      {task.estimatedHours && (
        <text
          x={155}
          y={44}
          textAnchor="end"
          className="text-xs fill-gray-500"
          style={{ fontSize: "10px" }}
        >
          {task.estimatedHours}h
        </text>
      )}
    </g>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EDGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface EdgeProps {
  from: NodePosition;
  to: NodePosition;
  isCriticalPath: boolean;
}

function Edge({ from, to, isCriticalPath }: EdgeProps) {
  const nodeWidth = 170;
  const nodeHeight = 70;
  
  const startX = from.x + nodeWidth;
  const startY = from.y + nodeHeight / 2;
  const endX = to.x;
  const endY = to.y + nodeHeight / 2;
  
  // Calculate control points for bezier curve
  const midX = (startX + endX) / 2;
  
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isCriticalPath ? "#f97316" : "#9ca3af"}
        strokeWidth={isCriticalPath ? 2 : 1}
        markerEnd="url(#arrowhead)"
      />
    </g>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DependencyGraphView({ 
  tasks, 
  criticalPath = [],
  onTaskClick 
}: DependencyGraphViewProps) {
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 200 });
  
  // Mark critical path tasks
  const tasksWithCriticalPath = useMemo(() => {
    const criticalSet = new Set(criticalPath);
    return tasks.map(t => ({
      ...t,
      isCriticalPath: criticalSet.has(t.id),
    }));
  }, [tasks, criticalPath]);
  
  // Calculate layout
  const positions = useMemo(() => 
    calculateLayout(tasksWithCriticalPath),
    [tasksWithCriticalPath]
  );
  
  // Generate edges
  const edges = useMemo(() => {
    const result: { from: number; to: number; isCriticalPath: boolean }[] = [];
    const criticalSet = new Set(criticalPath);
    
    for (const task of tasksWithCriticalPath) {
      for (const depId of task.dependencies) {
        if (positions.has(depId)) {
          result.push({
            from: depId,
            to: task.id,
            isCriticalPath: criticalSet.has(depId) && criticalSet.has(task.id),
          });
        }
      }
    }
    
    return result;
  }, [tasksWithCriticalPath, positions, criticalPath]);
  
  const handleTaskClick = useCallback((taskId: number) => {
    setSelectedTask(taskId);
    onTaskClick?.(taskId);
  }, [onTaskClick]);
  
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 100, y: 200 });
  };
  
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No tasks to display
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Dependency Graph</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-orange-500 border-dashed" />
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 text-gray-400" />
            <span>Todo</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="w-3 h-3 text-blue-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span>Blocked</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <svg
          width="100%"
          height="400"
          className="bg-gray-50"
        >
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
                fill="#9ca3af"
              />
            </marker>
          </defs>
          
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const fromPos = positions.get(edge.from);
              const toPos = positions.get(edge.to);
              if (!fromPos || !toPos) return null;
              
              return (
                <Edge
                  key={i}
                  from={fromPos}
                  to={toPos}
                  isCriticalPath={edge.isCriticalPath}
                />
              );
            })}
            
            {/* Nodes */}
            {tasksWithCriticalPath.map(task => {
              const pos = positions.get(task.id);
              if (!pos) return null;
              
              return (
                <TaskNodeComponent
                  key={task.id}
                  task={task}
                  position={pos}
                  isSelected={selectedTask === task.id}
                  onClick={() => handleTaskClick(task.id)}
                />
              );
            })}
          </g>
        </svg>
      </CardContent>
    </Card>
  );
}

export default DependencyGraphView;
