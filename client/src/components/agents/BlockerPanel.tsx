/**
 * Blocker Detection Panel Component
 * 
 * Displays detected blockers with:
 * - Severity-based categorization
 * - Suggested actions
 * - Quick resolution options
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Clock,
  Link2,
  User,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface Blocker {
  cardId: number;
  cardTitle: string;
  blockerType: "dependency" | "stale" | "overdue" | "resource";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedAction: string;
}

interface BlockerPanelProps {
  blockers: Blocker[];
  onRefresh?: () => void;
  onBlockerClick?: (cardId: number) => void;
  onResolve?: (cardId: number, blockerType: string) => void;
  isLoading?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function BlockerIcon({ type }: { type: Blocker["blockerType"] }) {
  const icons = {
    dependency: Link2,
    stale: Clock,
    overdue: AlertCircle,
    resource: User,
  };
  
  const Icon = icons[type];
  return <Icon className="h-4 w-4" />;
}

function SeverityBadge({ severity }: { severity: Blocker["severity"] }) {
  const variants = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-gray-100 text-gray-800 border-gray-200",
  };
  
  return (
    <Badge variant="outline" className={variants[severity]}>
      {severity}
    </Badge>
  );
}

function BlockerTypeBadge({ type }: { type: Blocker["blockerType"] }) {
  const labels = {
    dependency: "Dependency",
    stale: "Stale",
    overdue: "Overdue",
    resource: "Resource",
  };
  
  const colors = {
    dependency: "bg-purple-100 text-purple-800",
    stale: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    resource: "bg-green-100 text-green-800",
  };
  
  return (
    <Badge variant="outline" className={colors[type]}>
      <BlockerIcon type={type} />
      <span className="ml-1">{labels[type]}</span>
    </Badge>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCKER ITEM COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface BlockerItemProps {
  blocker: Blocker;
  onCardClick?: () => void;
  onResolve?: () => void;
}

function BlockerItem({ blocker, onCardClick, onResolve }: BlockerItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const severityIcon = {
    critical: <AlertTriangle className="h-5 w-5 text-red-500" />,
    high: <AlertCircle className="h-5 w-5 text-orange-500" />,
    medium: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    low: <Info className="h-5 w-5 text-gray-400" />,
  };
  
  return (
    <div className={`border rounded-lg p-3 ${
      blocker.severity === "critical" ? "border-red-200 bg-red-50" :
      blocker.severity === "high" ? "border-orange-200 bg-orange-50" :
      "border-gray-200 bg-white"
    }`}>
      <div 
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {severityIcon[blocker.severity]}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {blocker.cardTitle}
            </span>
            <SeverityBadge severity={blocker.severity} />
            <BlockerTypeBadge type={blocker.blockerType} />
          </div>
          
          <p className="text-sm text-muted-foreground mt-1">
            {blocker.description}
          </p>
        </div>
        
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
            <p className="text-sm text-blue-800">
              <strong>Suggested Action:</strong> {blocker.suggestedAction}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCardClick?.();
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Task
            </Button>
            
            {blocker.blockerType !== "dependency" && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve?.();
                }}
              >
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function BlockerPanel({ 
  blockers, 
  onRefresh, 
  onBlockerClick,
  onResolve,
  isLoading = false 
}: BlockerPanelProps) {
  // Group blockers by severity
  const groupedBlockers = {
    critical: blockers.filter(b => b.severity === "critical"),
    high: blockers.filter(b => b.severity === "high"),
    medium: blockers.filter(b => b.severity === "medium"),
    low: blockers.filter(b => b.severity === "low"),
  };
  
  const totalBlockers = blockers.length;
  const criticalCount = groupedBlockers.critical.length;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Blockers</CardTitle>
            {totalBlockers > 0 && (
              <Badge variant={criticalCount > 0 ? "destructive" : "secondary"}>
                {totalBlockers}
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        {/* Summary */}
        {totalBlockers > 0 && (
          <div className="flex items-center gap-4 text-sm mt-2">
            {criticalCount > 0 && (
              <span className="text-red-600 font-medium">
                {criticalCount} critical
              </span>
            )}
            {groupedBlockers.high.length > 0 && (
              <span className="text-orange-600">
                {groupedBlockers.high.length} high
              </span>
            )}
            {groupedBlockers.medium.length > 0 && (
              <span className="text-yellow-600">
                {groupedBlockers.medium.length} medium
              </span>
            )}
            {groupedBlockers.low.length > 0 && (
              <span className="text-gray-500">
                {groupedBlockers.low.length} low
              </span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        {totalBlockers === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="font-medium text-green-800">No Blockers Detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              All tasks are progressing smoothly
            </p>
          </div>
        ) : (
          <>
            {/* Critical blockers first */}
            {groupedBlockers.critical.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  Critical
                </h4>
                {groupedBlockers.critical.map((blocker, i) => (
                  <BlockerItem
                    key={`critical-${i}`}
                    blocker={blocker}
                    onCardClick={() => onBlockerClick?.(blocker.cardId)}
                    onResolve={() => onResolve?.(blocker.cardId, blocker.blockerType)}
                  />
                ))}
              </div>
            )}
            
            {/* High priority */}
            {groupedBlockers.high.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                  High Priority
                </h4>
                {groupedBlockers.high.map((blocker, i) => (
                  <BlockerItem
                    key={`high-${i}`}
                    blocker={blocker}
                    onCardClick={() => onBlockerClick?.(blocker.cardId)}
                    onResolve={() => onResolve?.(blocker.cardId, blocker.blockerType)}
                  />
                ))}
              </div>
            )}
            
            {/* Medium priority */}
            {groupedBlockers.medium.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">
                  Medium Priority
                </h4>
                {groupedBlockers.medium.map((blocker, i) => (
                  <BlockerItem
                    key={`medium-${i}`}
                    blocker={blocker}
                    onCardClick={() => onBlockerClick?.(blocker.cardId)}
                    onResolve={() => onResolve?.(blocker.cardId, blocker.blockerType)}
                  />
                ))}
              </div>
            )}
            
            {/* Low priority */}
            {groupedBlockers.low.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Low Priority
                </h4>
                {groupedBlockers.low.map((blocker, i) => (
                  <BlockerItem
                    key={`low-${i}`}
                    blocker={blocker}
                    onCardClick={() => onBlockerClick?.(blocker.cardId)}
                    onResolve={() => onResolve?.(blocker.cardId, blocker.blockerType)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default BlockerPanel;
