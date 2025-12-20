import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, isWithinInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface TimelineCard {
  id: number;
  title: string;
  type: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: string | null;
  estimateHours: number | null;
  columnId: number;
  columnName?: string;
}

interface TimelineViewProps {
  cards: TimelineCard[];
  columns: { id: number; name: string }[];
  onCardClick?: (cardId: number) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

const AGENT_COLORS: Record<string, string> = {
  pm: 'bg-purple-500',
  dev: 'bg-blue-500',
  qa: 'bg-green-500',
  devops: 'bg-orange-500',
  research: 'bg-pink-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

export function TimelineView({ cards, columns, onCardClick }: TimelineViewProps) {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date()));
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');

  // Calculate date range based on zoom level
  const dateRange = useMemo(() => {
    const daysToShow = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    return eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, daysToShow - 1),
    });
  }, [startDate, zoomLevel]);

  // Group cards by agent for swimlanes
  const cardsByAgent = useMemo(() => {
    const grouped: Record<string, TimelineCard[]> = {
      unassigned: [],
      pm: [],
      dev: [],
      qa: [],
      devops: [],
      research: [],
    };

    cards.forEach((card) => {
      const agent = card.assignedAgent?.toLowerCase() || 'unassigned';
      if (grouped[agent]) {
        grouped[agent].push(card);
      } else {
        grouped.unassigned.push(card);
      }
    });

    // Only return agents that have cards
    return Object.entries(grouped).filter(([_, cards]) => cards.length > 0);
  }, [cards]);

  // Calculate card position on timeline
  const getCardPosition = (card: TimelineCard) => {
    if (!card.dueDate) return null;

    const dueDate = new Date(card.dueDate);
    const estimateDays = Math.ceil((card.estimateHours || 8) / 8); // Convert hours to days
    const cardStart = addDays(dueDate, -estimateDays);

    const startIndex = differenceInDays(cardStart, startDate);
    const endIndex = differenceInDays(dueDate, startDate);

    // Check if card is visible in current range
    if (endIndex < 0 || startIndex >= dateRange.length) return null;

    const visibleStart = Math.max(0, startIndex);
    const visibleEnd = Math.min(dateRange.length - 1, endIndex);

    return {
      left: `${(visibleStart / dateRange.length) * 100}%`,
      width: `${((visibleEnd - visibleStart + 1) / dateRange.length) * 100}%`,
    };
  };

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const days = zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 14 : 30;
    setStartDate((prev) => addDays(prev, direction === 'next' ? days : -days));
  };

  const goToToday = () => {
    setStartDate(startOfWeek(new Date()));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateTimeline('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateTimeline('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 text-sm font-medium">
            {format(startDate, 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={zoomLevel === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('day')}
          >
            Day
          </Button>
          <Button
            variant={zoomLevel === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('week')}
          >
            Week
          </Button>
          <Button
            variant={zoomLevel === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel('month')}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Date Headers */}
      <div className="flex border-b bg-muted/30">
        <div className="w-32 shrink-0 p-2 border-r font-medium text-sm">Agent</div>
        <div className="flex-1 flex">
          {dateRange.map((date, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 p-2 text-center text-xs border-r',
                isSameDay(date, new Date()) && 'bg-primary/10 font-bold'
              )}
            >
              <div className="font-medium">{format(date, 'EEE')}</div>
              <div className="text-muted-foreground">{format(date, 'd')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 overflow-auto">
        {cardsByAgent.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No cards with due dates to display
          </div>
        ) : (
          cardsByAgent.map(([agent, agentCards]) => (
            <div key={agent} className="flex border-b min-h-[80px]">
              {/* Agent Label */}
              <div className="w-32 shrink-0 p-2 border-r bg-muted/20 flex items-center gap-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    AGENT_COLORS[agent] || 'bg-gray-400'
                  )}
                />
                <span className="text-sm font-medium capitalize">{agent}</span>
                <Badge variant="secondary" className="ml-auto">
                  {agentCards.length}
                </Badge>
              </div>

              {/* Timeline Grid */}
              <div className="flex-1 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {dateRange.map((date, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 border-r',
                        isSameDay(date, new Date()) && 'bg-primary/5'
                      )}
                    />
                  ))}
                </div>

                {/* Cards */}
                <div className="relative p-2">
                  {agentCards.map((card, cardIndex) => {
                    const position = getCardPosition(card);
                    if (!position) {
                      // Card without due date - show at start
                      return (
                        <TooltipProvider key={card.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute h-8 rounded px-2 py-1 text-xs truncate cursor-pointer',
                                  'bg-muted border border-dashed border-muted-foreground/50',
                                  'hover:bg-muted/80 transition-colors',
                                  PRIORITY_COLORS[card.priority] || '',
                                  'border-l-4'
                                )}
                                style={{
                                  top: `${cardIndex * 36}px`,
                                  left: '4px',
                                  width: '120px',
                                }}
                                onClick={() => onCardClick?.(card.id)}
                              >
                                {card.title}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{card.title}</p>
                              <p className="text-xs text-muted-foreground">No due date set</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return (
                      <TooltipProvider key={card.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute h-8 rounded px-2 py-1 text-xs truncate cursor-pointer',
                                'bg-card border shadow-sm',
                                'hover:shadow-md transition-shadow',
                                PRIORITY_COLORS[card.priority] || '',
                                'border-l-4'
                              )}
                              style={{
                                top: `${cardIndex * 36}px`,
                                left: position.left,
                                width: position.width,
                                minWidth: '60px',
                              }}
                              onClick={() => onCardClick?.(card.id)}
                            >
                              {card.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">{card.title}</p>
                              <p className="text-xs">Due: {format(new Date(card.dueDate!), 'MMM d, yyyy')}</p>
                              {card.estimateHours && (
                                <p className="text-xs">Estimate: {card.estimateHours}h</p>
                              )}
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">{card.type}</Badge>
                                <Badge variant="outline" className="text-xs">{card.priority}</Badge>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-2 border-t bg-muted/20 text-xs">
        <span className="font-medium">Priority:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-l-4 border-l-red-500" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-l-4 border-l-orange-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-l-4 border-l-yellow-500" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-l-4 border-l-green-500" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}

export default TimelineView;
