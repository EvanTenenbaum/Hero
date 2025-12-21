import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Activity,
  Zap
} from "lucide-react";

interface SprintDashboardProps {
  projectId: number;
  onCreateSprint?: () => void;
  onExecuteSprint?: (sprintId: string) => void;
}

export function SprintDashboard({ projectId, onCreateSprint, onExecuteSprint }: SprintDashboardProps) {
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  // Fetch sprints for this project
  const { data: sprints, isLoading: sprintsLoading } = trpc.sprints.list.useQuery({ projectId });
  
  // Fetch velocity data
  const { data: velocityData } = trpc.sprints.getVelocity.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Fetch burndown for selected sprint
  const { data: burndownData } = trpc.sprints.getBurndown.useQuery(
    { sprintId: selectedSprintId! },
    { enabled: !!selectedSprintId }
  );

  // Fetch forecast for selected sprint
  const { data: forecastData } = trpc.sprints.getForecast.useQuery(
    { sprintId: selectedSprintId! },
    { enabled: !!selectedSprintId }
  );

  // Auto-select current sprint
  const currentSprint = useMemo(() => {
    if (!sprints?.length) return null;
    const active = sprints.find((s: { status: string }) => s.status === 'active');
    return active || sprints[0];
  }, [sprints]);

  // Set selected sprint when current sprint changes
  useMemo(() => {
    if (currentSprint && !selectedSprintId) {
      setSelectedSprintId(currentSprint.id);
    }
  }, [currentSprint, selectedSprintId]);

  const selectedSprint = sprints?.find(s => s.id === selectedSprintId);

  // Calculate sprint progress
  const sprintProgress = useMemo(() => {
    if (!selectedSprint) return 0;
    const start = selectedSprint.startDate ? new Date(selectedSprint.startDate).getTime() : Date.now();
    const end = selectedSprint.endDate ? new Date(selectedSprint.endDate).getTime() : Date.now();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [selectedSprint]);

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!selectedSprint) return 0;
    const end = selectedSprint.endDate ? new Date(selectedSprint.endDate).getTime() : Date.now();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [selectedSprint]);

  if (sprintsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sprint Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sprint Dashboard</h2>
          <p className="text-muted-foreground">Track velocity, burndown, and sprint progress</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSprintId ? String(selectedSprintId) : ""} onValueChange={(val) => setSelectedSprintId(Number(val))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints?.map((sprint: { id: number; name: string; status: string }) => (
                <SelectItem key={sprint.id} value={String(sprint.id)}>
                  <div className="flex items-center gap-2">
                    <span>{sprint.name}</span>
                    {sprint.status === 'active' && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {onCreateSprint && (
            <Button onClick={onCreateSprint} size="sm">
              <Zap className="h-4 w-4 mr-1" />
              New Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Overview Cards */}
      {selectedSprint && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sprint Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sprint Progress
              </CardDescription>
              <CardTitle className="text-2xl">{sprintProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={sprintProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {daysRemaining} days remaining
              </p>
            </CardContent>
          </Card>

          {/* Points Completed */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Points Completed
              </CardDescription>
              <CardTitle className="text-2xl">
                {selectedSprint.completedPoints || 0} / {selectedSprint.plannedPoints || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={selectedSprint.plannedPoints ? ((selectedSprint.completedPoints || 0) / selectedSprint.plannedPoints) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-2">
                {selectedSprint.plannedPoints ? Math.round(((selectedSprint.completedPoints || 0) / selectedSprint.plannedPoints) * 100) : 0}% complete
              </p>
            </CardContent>
          </Card>

          {/* Velocity */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Current Velocity
              </CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {velocityData?.current?.toFixed(1) || "0"}
                {velocityData?.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                {velocityData?.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                3-sprint avg: {velocityData?.average3?.toFixed(1) || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                5-sprint avg: {velocityData?.average5?.toFixed(1) || "N/A"}
              </p>
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Forecast
              </CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                {forecastData?.confidenceLevel === 'high' ? (
                  <>
                    <span className="text-green-500">On Track</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </>
                ) : (
                  <>
                    <span className="text-amber-500">At Risk</span>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {forecastData?.estimatedCompletionDate 
                  ? `Est. completion: ${new Date(forecastData.estimatedCompletionDate).toLocaleDateString()}`
                  : "Calculating..."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Burndown Chart
            </CardTitle>
            <CardDescription>
              Track remaining work over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {burndownData?.length ? (
              <BurndownChart data={burndownData.map(d => ({ date: d.date, ideal: d.idealRemaining, actual: d.actualRemaining }))} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No burndown data yet</p>
                  <p className="text-xs">Start completing tasks to see progress</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Velocity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Velocity Trend
            </CardTitle>
            <CardDescription>
              Historical velocity across sprints
            </CardDescription>
          </CardHeader>
          <CardContent>
            {velocityData ? (
              <VelocityChart data={[{ sprintName: 'Current', velocity: velocityData.current || 0 }]} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No velocity history yet</p>
                  <p className="text-xs">Complete sprints to build velocity data</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint Timeline */}
      {sprints && sprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sprint Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sprints.slice(0, 5).map((sprint: { id: number; name: string; status: string; startDate: Date | null; endDate: Date | null; completedPoints?: number | null }) => (
                <div 
                  key={sprint.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer ${
                    sprint.id === selectedSprintId 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedSprintId(sprint.id)}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    sprint.status === 'completed' ? 'bg-green-500' :
                    sprint.status === 'active' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sprint.name}</span>
                      <Badge variant={
                        sprint.status === 'completed' ? 'default' :
                        sprint.status === 'active' ? 'secondary' :
                        'outline'
                      }>
                        {sprint.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'TBD'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{sprint.completedPoints || 0} pts</p>
                    <p className="text-xs text-muted-foreground">completed</p>
                  </div>
                  {onExecuteSprint && sprint.status === 'active' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecuteSprint(String(sprint.id));
                      }}
                    >
                      Execute
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!sprints || sprints.length === 0) && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Sprints Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first sprint to start tracking velocity and progress
              </p>
              {onCreateSprint && (
                <Button onClick={onCreateSprint}>
                  <Zap className="h-4 w-4 mr-2" />
                  Create First Sprint
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Simple SVG Burndown Chart
function BurndownChart({ data }: { data: Array<{ date: string; ideal: number; actual: number }> }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.ideal, d.actual)));
  const width = 100;
  const height = 60;
  const padding = 5;

  const xScale = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
  const yScale = (value: number) => height - padding - (value / maxValue) * (height - 2 * padding);

  const idealPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.ideal)}`).join(' ');
  const actualPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.actual)}`).join(' ');

  return (
    <div className="h-64">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <line
            key={pct}
            x1={padding}
            y1={yScale((pct / 100) * maxValue)}
            x2={width - padding}
            y2={yScale((pct / 100) * maxValue)}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Ideal line */}
        <path
          d={idealPath}
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
        
        {/* Actual line */}
        <path
          d={actualPath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
        />
        
        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.actual)}
            r={1}
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-primary" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-muted-foreground opacity-50" style={{ borderStyle: 'dashed' }} />
          <span>Ideal</span>
        </div>
      </div>
    </div>
  );
}

// Simple SVG Velocity Chart
function VelocityChart({ data }: { data: Array<{ sprintName: string; velocity: number }> }) {
  const maxValue = Math.max(...data.map(d => d.velocity), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="h-64">
      <svg viewBox="0 0 100 70" className="w-full h-full">
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.velocity / maxValue) * 50;
          return (
            <g key={i}>
              <rect
                x={i * barWidth + barWidth * 0.1}
                y={55 - barHeight}
                width={barWidth * 0.8}
                height={barHeight}
                fill="hsl(var(--primary))"
                rx={1}
                className="opacity-80 hover:opacity-100 transition-opacity"
              />
              <text
                x={i * barWidth + barWidth / 2}
                y={62}
                textAnchor="middle"
                fontSize={3}
                fill="currentColor"
                className="opacity-60"
              >
                {d.sprintName.slice(0, 6)}
              </text>
              <text
                x={i * barWidth + barWidth / 2}
                y={52 - barHeight}
                textAnchor="middle"
                fontSize={3}
                fill="currentColor"
              >
                {d.velocity.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default SprintDashboard;
