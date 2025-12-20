/**
 * Cost Dashboard Component - Sprint 3 Agent Alpha
 * 
 * Visual dashboard for tracking token usage and costs.
 * Shows budget status, usage history, and alerts.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

export interface UsageSummary {
  today: { tokens: number; cost: number; executions: number };
  thisWeek: { tokens: number; cost: number; executions: number };
  thisMonth: { tokens: number; cost: number; executions: number };
  allTime: { tokens: number; cost: number; executions: number };
}

export interface BudgetStatus {
  dailyLimit: number | null;
  monthlyLimit: number | null;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number | null;
  monthlyRemaining: number | null;
  isOverDailyLimit: boolean;
  isOverMonthlyLimit: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded';
}

interface CostDashboardProps {
  usage: UsageSummary;
  budget: BudgetStatus;
  isLoading?: boolean;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function getWarningColor(level: BudgetStatus['warningLevel']): string {
  switch (level) {
    case 'exceeded': return 'text-red-600 bg-red-50';
    case 'high': return 'text-orange-600 bg-orange-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-blue-600 bg-blue-50';
    default: return 'text-green-600 bg-green-50';
  }
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-red-500';
  if (percent >= 90) return 'bg-orange-500';
  if (percent >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function CostDashboard({ usage, budget, isLoading = false }: CostDashboardProps) {
  const dailyPercent = useMemo(() => {
    if (!budget.dailyLimit) return 0;
    return Math.min(100, (budget.dailyUsed / budget.dailyLimit) * 100);
  }, [budget.dailyUsed, budget.dailyLimit]);

  const monthlyPercent = useMemo(() => {
    if (!budget.monthlyLimit) return 0;
    return Math.min(100, (budget.monthlyUsed / budget.monthlyLimit) * 100);
  }, [budget.monthlyUsed, budget.monthlyLimit]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Status Alert */}
      {budget.warningLevel !== 'none' && (
        <div className={`p-4 rounded-lg border ${getWarningColor(budget.warningLevel)}`}>
          <div className="flex items-center gap-2">
            {budget.warningLevel === 'exceeded' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )}
            <span className="font-medium">
              {budget.warningLevel === 'exceeded'
                ? 'Budget limit exceeded!'
                : `Budget usage at ${Math.max(dailyPercent, monthlyPercent).toFixed(0)}%`}
            </span>
          </div>
          {budget.isOverDailyLimit && (
            <p className="text-sm mt-1">
              Daily limit ({formatCost(budget.dailyLimit!)}) exceeded. 
              Used: {formatCost(budget.dailyUsed)}
            </p>
          )}
          {budget.isOverMonthlyLimit && (
            <p className="text-sm mt-1">
              Monthly limit ({formatCost(budget.monthlyLimit!)}) exceeded. 
              Used: {formatCost(budget.monthlyUsed)}
            </p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(usage.today.cost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(usage.today.tokens)} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(usage.thisMonth.cost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(usage.thisMonth.tokens)} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.today.executions}</div>
            <p className="text-xs text-muted-foreground">
              {usage.thisMonth.executions} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(usage.allTime.cost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(usage.allTime.tokens)} tokens total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <div className="grid gap-4 md:grid-cols-2">
        {budget.dailyLimit !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Daily Budget
                <Badge variant={budget.isOverDailyLimit ? 'destructive' : 'secondary'}>
                  {formatCost(budget.dailyUsed)} / {formatCost(budget.dailyLimit)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {budget.dailyRemaining !== null && !budget.isOverDailyLimit
                  ? `${formatCost(budget.dailyRemaining)} remaining`
                  : budget.isOverDailyLimit
                  ? 'Limit exceeded'
                  : 'No limit set'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={dailyPercent} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyPercent.toFixed(0)}% used
              </p>
            </CardContent>
          </Card>
        )}

        {budget.monthlyLimit !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Monthly Budget
                <Badge variant={budget.isOverMonthlyLimit ? 'destructive' : 'secondary'}>
                  {formatCost(budget.monthlyUsed)} / {formatCost(budget.monthlyLimit)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {budget.monthlyRemaining !== null && !budget.isOverMonthlyLimit
                  ? `${formatCost(budget.monthlyRemaining)} remaining`
                  : budget.isOverMonthlyLimit
                  ? 'Limit exceeded'
                  : 'No limit set'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress 
                value={monthlyPercent} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {monthlyPercent.toFixed(0)}% used
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {budget.warningLevel === 'none' || budget.warningLevel === 'low' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-600">Budget healthy</span>
              </>
            ) : budget.warningLevel === 'exceeded' ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-red-600">Budget exceeded - executions may be blocked</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-600">
                  Approaching budget limit ({Math.max(dailyPercent, monthlyPercent).toFixed(0)}%)
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostDashboard;
