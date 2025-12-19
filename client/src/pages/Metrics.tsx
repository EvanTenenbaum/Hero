import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  DollarSign, 
  MessageSquare, 
  Bot, 
  FileCode, 
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";

// Simple bar chart component
function SimpleBarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12 text-right">{item.label}</span>
          <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
            <div 
              className="h-full bg-primary/60 rounded-sm transition-all duration-300"
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-medium w-12">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// Metric card component
function MetricCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  loading 
}: { 
  title: string; 
  value: string | number; 
  description?: string; 
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend && (
              <span className={trend.positive ? "text-green-500" : "text-red-500"}>
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Metrics() {
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });

  const { data: metricsData, isLoading, refetch } = trpc.metrics.recentActivity.useQuery();
  
  const { data: dailyData } = trpc.metrics.daily.useQuery(dateRange);

  // Process daily data for chart
  const chartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      // Generate empty data for last 7 days
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: 0,
        });
      }
      return data;
    }

    return dailyData.map(d => ({
      label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: d.messagesCount || 0,
    }));
  }, [dailyData]);

  const tokensChartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: 0,
        });
      }
      return data;
    }

    return dailyData.map(d => ({
      label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: d.tokensUsed || 0,
    }));
  }, [dailyData]);

  const maxMessages = Math.max(...chartData.map(d => d.value), 1);
  const maxTokens = Math.max(...tokensChartData.map(d => d.value), 1);

  // Navigate date range
  const navigateDateRange = (direction: 'prev' | 'next') => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const days = direction === 'prev' ? -7 : 7;
    
    start.setDate(start.getDate() + days);
    end.setDate(end.getDate() + days);
    
    // Don't allow future dates
    const today = new Date();
    if (end > today) return;
    
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const summary = metricsData?.summary;
  const formatCost = (cost: string | number | undefined) => {
    if (!cost) return "$0.00";
    const num = typeof cost === 'string' ? parseFloat(cost) : cost;
    return `$${num.toFixed(4)}`;
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return "0s";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metrics Dashboard</h1>
            <p className="text-muted-foreground">
              Track your AI usage and productivity metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDateRange('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDateRange('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Messages"
            value={summary?.totalMessages?.toLocaleString() || "0"}
            description="messages sent this week"
            icon={MessageSquare}
            loading={isLoading}
          />
          <MetricCard
            title="Tokens Used"
            value={summary?.totalTokens?.toLocaleString() || "0"}
            description="total tokens consumed"
            icon={Zap}
            loading={isLoading}
          />
          <MetricCard
            title="Total Cost"
            value={formatCost(summary?.totalCost)}
            description="estimated API cost"
            icon={DollarSign}
            loading={isLoading}
          />
          <MetricCard
            title="Agent Executions"
            value={summary?.totalExecutions?.toLocaleString() || "0"}
            description={`${summary?.totalTasksCompleted || 0} completed, ${summary?.totalTasksFailed || 0} failed`}
            icon={Bot}
            loading={isLoading}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Lines Generated"
            value={summary?.totalLinesGenerated?.toLocaleString() || "0"}
            description="lines of code generated"
            icon={FileCode}
            loading={isLoading}
          />
          <MetricCard
            title="Files Modified"
            value={summary?.totalFilesModified?.toLocaleString() || "0"}
            description="files changed by AI"
            icon={BarChart3}
            loading={isLoading}
          />
          <MetricCard
            title="Execution Time"
            value={formatDuration(summary?.totalExecutionTime)}
            description="total processing time"
            icon={Clock}
            loading={isLoading}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages per Day
              </CardTitle>
              <CardDescription>
                Daily message activity over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <SimpleBarChart data={chartData} maxValue={maxMessages} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Tokens per Day
              </CardTitle>
              <CardDescription>
                Daily token consumption over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <SimpleBarChart data={tokensChartData} maxValue={maxTokens} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Usage Insights
            </CardTitle>
            <CardDescription>
              AI-generated insights based on your usage patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </>
              ) : (
                <>
                  {(summary?.totalMessages || 0) === 0 ? (
                    <p className="text-muted-foreground">
                      No activity recorded yet. Start chatting with the AI or running agents to see your metrics here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Chat Activity</p>
                          <p className="text-sm text-muted-foreground">
                            You've sent {summary?.totalMessages?.toLocaleString()} messages this week, 
                            using approximately {summary?.totalTokens?.toLocaleString()} tokens.
                          </p>
                        </div>
                      </div>
                      
                      {(summary?.totalExecutions || 0) > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="p-2 bg-green-500/10 rounded-full">
                            <Bot className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Agent Performance</p>
                            <p className="text-sm text-muted-foreground">
                              {summary?.totalTasksCompleted} of {summary?.totalExecutions} agent tasks completed successfully 
                              ({Math.round(((summary?.totalTasksCompleted || 0) / (summary?.totalExecutions || 1)) * 100)}% success rate).
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {(summary?.totalLinesGenerated || 0) > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="p-2 bg-blue-500/10 rounded-full">
                            <FileCode className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Code Generation</p>
                            <p className="text-sm text-muted-foreground">
                              AI has generated {summary?.totalLinesGenerated?.toLocaleString()} lines of code 
                              across {summary?.totalFilesModified} files.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
