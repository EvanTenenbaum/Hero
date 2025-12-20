import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarCard {
  id: number;
  title: string;
  type: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: string | null;
  columnId: number;
  columnName?: string;
}

interface CalendarViewProps {
  cards: CalendarCard[];
  columns: { id: number; name: string }[];
  onCardClick?: (cardId: number) => void;
  onDateClick?: (date: Date) => void;
}

const AGENT_COLORS: Record<string, string> = {
  pm: 'bg-purple-500',
  dev: 'bg-blue-500',
  qa: 'bg-green-500',
  devops: 'bg-orange-500',
  research: 'bg-pink-500',
};

const TYPE_COLORS: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  feature: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  task: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  bug: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  spike: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  chore: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const PRIORITY_INDICATORS: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

export function CalendarView({ cards, columns, onCardClick, onDateClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get all days to display (including days from prev/next months to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const grouped: Record<string, CalendarCard[]> = {};

    cards.forEach((card) => {
      if (card.dueDate) {
        const dateKey = format(new Date(card.dueDate), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(card);
      }
    });

    return grouped;
  }, [cards]);

  // Count cards without due dates
  const unscheduledCount = useMemo(() => {
    return cards.filter((card) => !card.dueDate).length;
  }, [cards]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) =>
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-4 text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{cards.length} total tasks</span>
          </div>
          {unscheduledCount > 0 && (
            <Badge variant="secondary">
              {unscheduledCount} unscheduled
            </Badge>
          )}
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] p-1 border-r border-b cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/30',
                isToday && 'bg-primary/5',
                'hover:bg-muted/50'
              )}
              onClick={() => onDateClick?.(day)}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    !isCurrentMonth && 'text-muted-foreground',
                    isToday && 'bg-primary text-primary-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayCards.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {dayCards.length}
                  </Badge>
                )}
              </div>

              {/* Cards for this day */}
              <div className="space-y-1 overflow-hidden">
                {dayCards.slice(0, 3).map((card) => (
                  <TooltipProvider key={card.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'text-xs p-1 rounded truncate cursor-pointer',
                            TYPE_COLORS[card.type] || 'bg-gray-100 dark:bg-gray-800',
                            'hover:opacity-80 transition-opacity'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCardClick?.(card.id);
                          }}
                        >
                          <span className="mr-1">
                            {PRIORITY_INDICATORS[card.priority] || '⚪'}
                          </span>
                          {card.title}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="space-y-1">
                          <p className="font-medium">{card.title}</p>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">{card.type}</Badge>
                            <Badge variant="outline" className="text-xs">{card.priority}</Badge>
                          </div>
                          {card.assignedAgent && (
                            <p className="text-xs text-muted-foreground">
                              Assigned to: {card.assignedAgent}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {dayCards.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayCards.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-2 border-t bg-muted/20 text-xs flex-wrap">
        <span className="font-medium">Types:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn('w-3 h-3 rounded', color.split(' ')[0])} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
        <span className="ml-4 font-medium">Priority:</span>
        {Object.entries(PRIORITY_INDICATORS).map(([priority, indicator]) => (
          <div key={priority} className="flex items-center gap-1">
            <span>{indicator}</span>
            <span className="capitalize">{priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarView;
