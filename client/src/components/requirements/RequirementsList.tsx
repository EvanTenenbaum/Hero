/**
 * RequirementsList Component
 * Phase 2 - Spec-Driven Development
 * 
 * Displays a list of requirements with filtering and status management.
 */

import { useState } from "react";
import { 
  FileText, Plus, Search, Filter, CheckCircle2, 
  Circle, AlertCircle, ChevronRight, Link2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RequirementSummary {
  id: number;
  title: string;
  description?: string | null;
  status: "draft" | "pending_review" | "approved" | "rejected" | "implemented";
  userStoriesCount: number;
  linkedCardsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RequirementsListProps {
  requirements: RequirementSummary[];
  isLoading?: boolean;
  onSelect: (requirement: RequirementSummary) => void;
  onCreate: () => void;
}

const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Circle },
  pending_review: { label: "Review", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertCircle },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertCircle },
  implemented: { label: "Done", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
};

export function RequirementsList({
  requirements,
  isLoading,
  onSelect,
  onCreate,
}: RequirementsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredRequirements = requirements.filter((req) => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = requirements.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Requirements</h2>
          <Badge variant="secondary">{requirements.length}</Badge>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Requirement
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft ({statusCounts.draft || 0})</SelectItem>
            <SelectItem value="pending_review">Review ({statusCounts.pending_review || 0})</SelectItem>
            <SelectItem value="approved">Approved ({statusCounts.approved || 0})</SelectItem>
            <SelectItem value="rejected">Rejected ({statusCounts.rejected || 0})</SelectItem>
            <SelectItem value="implemented">Done ({statusCounts.implemented || 0})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Summary */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const Icon = config.icon;
          return (
            <Badge
              key={status}
              variant="outline"
              className={cn("cursor-pointer", config.color)}
              onClick={() => setStatusFilter(status)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Requirements List */}
      {filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No requirements found</p>
            <p className="text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first requirement to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button className="mt-4" onClick={onCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Create Requirement
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredRequirements.map((req) => {
            const StatusIcon = statusConfig[req.status].icon;
            return (
              <Card
                key={req.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelect(req)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusConfig[req.status].color)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[req.status].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          REQ-{req.id}
                        </span>
                      </div>
                      <h3 className="font-medium truncate">{req.title}</h3>
                      {req.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {req.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{req.userStoriesCount} user stories</span>
                        {req.linkedCardsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {req.linkedCardsCount} cards linked
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
