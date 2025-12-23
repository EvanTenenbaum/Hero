/**
 * Rule Presets Component - Sprint 2 Agent Gamma
 * 
 * Pre-built rule sets that users can import with one click.
 * Makes agent configuration discoverable and easy.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  Zap, 
  Code, 
  FileCheck, 
  Lock, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Check
} from 'lucide-react';

export type AgentType = 'pm' | 'developer' | 'qa' | 'devops' | 'research' | 'all';

export interface RulePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'safety' | 'productivity' | 'quality' | 'style';
  applicableAgents: AgentType[];
  rules: Array<{
    content: string;
    type: 'instruction' | 'constraint' | 'preference';
  }>;
}

const PRESET_LIBRARY: RulePreset[] = [
  {
    id: 'strict-safety',
    name: 'Strict Safety',
    description: 'Maximum safety controls for production environments',
    icon: <Shield className="h-5 w-5 text-red-500" />,
    category: 'safety',
    applicableAgents: ['all'],
    rules: [
      { content: 'Always ask for confirmation before modifying any file', type: 'constraint' },
      { content: 'Never execute shell commands without explicit approval', type: 'constraint' },
      { content: 'Create a backup checkpoint before any destructive operation', type: 'instruction' },
      { content: 'Stop and ask if you are uncertain about any action', type: 'instruction' },
      { content: 'Never access files outside the project directory', type: 'constraint' },
    ],
  },
  {
    id: 'fast-development',
    name: 'Fast Development',
    description: 'Streamlined workflow for rapid prototyping',
    icon: <Zap className="h-5 w-5 text-yellow-500" />,
    category: 'productivity',
    applicableAgents: ['developer'],
    rules: [
      { content: 'Auto-approve file reads without confirmation', type: 'preference' },
      { content: 'Auto-approve test execution without confirmation', type: 'preference' },
      { content: 'Prefer quick solutions over perfect solutions for prototypes', type: 'preference' },
      { content: 'Skip detailed explanations unless asked', type: 'preference' },
    ],
  },
  {
    id: 'typescript-strict',
    name: 'TypeScript Strict',
    description: 'Enforce TypeScript best practices',
    icon: <Code className="h-5 w-5 text-blue-500" />,
    category: 'style',
    applicableAgents: ['developer'],
    rules: [
      { content: 'Always use TypeScript, never plain JavaScript', type: 'constraint' },
      { content: 'Use strict type annotations, avoid any type', type: 'instruction' },
      { content: 'Prefer interfaces over type aliases for objects', type: 'preference' },
      { content: 'Use const assertions where applicable', type: 'preference' },
      { content: 'Always handle null and undefined explicitly', type: 'instruction' },
    ],
  },
  {
    id: 'code-quality',
    name: 'Code Quality',
    description: 'Enforce clean code standards',
    icon: <FileCheck className="h-5 w-5 text-green-500" />,
    category: 'quality',
    applicableAgents: ['developer', 'qa'],
    rules: [
      { content: 'Write unit tests for all new functions', type: 'instruction' },
      { content: 'Add JSDoc comments to exported functions', type: 'instruction' },
      { content: 'Keep functions under 50 lines', type: 'preference' },
      { content: 'Use meaningful variable and function names', type: 'instruction' },
      { content: 'Follow existing code style in the project', type: 'instruction' },
    ],
  },
  {
    id: 'security-focused',
    name: 'Security Focused',
    description: 'Security-first development practices',
    icon: <Lock className="h-5 w-5 text-purple-500" />,
    category: 'safety',
    applicableAgents: ['developer', 'devops'],
    rules: [
      { content: 'Never hardcode secrets or credentials', type: 'constraint' },
      { content: 'Always validate and sanitize user input', type: 'instruction' },
      { content: 'Use parameterized queries for database operations', type: 'instruction' },
      { content: 'Review for common vulnerabilities (XSS, CSRF, injection)', type: 'instruction' },
      { content: 'Use HTTPS for all external API calls', type: 'constraint' },
    ],
  },
  {
    id: 'ai-enhanced',
    name: 'AI Enhanced',
    description: 'Leverage AI capabilities fully',
    icon: <Sparkles className="h-5 w-5 text-indigo-500" />,
    category: 'productivity',
    applicableAgents: ['all'],
    rules: [
      { content: 'Proactively suggest improvements when you see issues', type: 'preference' },
      { content: 'Explain your reasoning for non-obvious decisions', type: 'instruction' },
      { content: 'Offer alternative approaches when multiple solutions exist', type: 'preference' },
      { content: 'Learn from corrections and apply them to future responses', type: 'instruction' },
    ],
  },
];

interface RulePresetsProps {
  onApplyPreset: (preset: RulePreset) => void;
  appliedPresets?: string[];
  agentFilter?: AgentType;
}

export function RulePresets({ 
  onApplyPreset, 
  appliedPresets = [],
  agentFilter = 'all',
}: RulePresetsProps) {
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [selectedRules, setSelectedRules] = useState<Record<string, Set<number>>>({});

  // Filter presets based on agent type
  const filteredPresets = PRESET_LIBRARY.filter(preset => 
    agentFilter === 'all' || 
    preset.applicableAgents.includes('all') || 
    preset.applicableAgents.includes(agentFilter)
  );

  const toggleExpand = (presetId: string) => {
    setExpandedPreset(expandedPreset === presetId ? null : presetId);
  };

  const toggleRuleSelection = (presetId: string, ruleIndex: number) => {
    setSelectedRules(prev => {
      const presetRules = new Set(prev[presetId] || []);
      if (presetRules.has(ruleIndex)) {
        presetRules.delete(ruleIndex);
      } else {
        presetRules.add(ruleIndex);
      }
      return { ...prev, [presetId]: presetRules };
    });
  };

  const selectAllRules = (presetId: string, rules: RulePreset['rules']) => {
    setSelectedRules(prev => ({
      ...prev,
      [presetId]: new Set(rules.map((_, i) => i)),
    }));
  };

  const handleApply = (preset: RulePreset) => {
    const selected = selectedRules[preset.id];
    if (selected && selected.size > 0) {
      // Apply only selected rules
      const filteredPreset = {
        ...preset,
        rules: preset.rules.filter((_, i) => selected.has(i)),
      };
      onApplyPreset(filteredPreset);
    } else {
      // Apply all rules
      onApplyPreset(preset);
    }
    // Clear selection after applying
    setSelectedRules(prev => {
      const newState = { ...prev };
      delete newState[preset.id];
      return newState;
    });
  };

  const getCategoryColor = (category: RulePreset['category']) => {
    switch (category) {
      case 'safety': return 'bg-red-100 text-red-700';
      case 'productivity': return 'bg-yellow-100 text-yellow-700';
      case 'quality': return 'bg-green-100 text-green-700';
      case 'style': return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeColor = (type: RulePreset['rules'][0]['type']) => {
    switch (type) {
      case 'constraint': return 'text-red-600';
      case 'instruction': return 'text-blue-600';
      case 'preference': return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rule Presets</h3>
        <Badge variant="outline">{filteredPresets.length} available</Badge>
      </div>

      <div className="grid gap-3">
        {filteredPresets.map(preset => {
          const isExpanded = expandedPreset === preset.id;
          const isApplied = appliedPresets.includes(preset.id);
          const selectedCount = selectedRules[preset.id]?.size || 0;

          return (
            <Card key={preset.id} className={isApplied ? 'border-green-500 bg-green-50/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {preset.icon}
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {preset.name}
                        {isApplied && <Check className="h-4 w-4 text-green-500" />}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {preset.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(preset.category)}>
                      {preset.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(preset.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {preset.rules.length} rules
                        {selectedCount > 0 && ` (${selectedCount} selected)`}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => selectAllRules(preset.id, preset.rules)}
                      >
                        Select all
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {preset.rules.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedRules[preset.id]?.has(index) || false}
                            onCheckedChange={() => toggleRuleSelection(preset.id, index)}
                          />
                          <div className="flex-1">
                            <p className="text-sm">{rule.content}</p>
                            <span className={`text-xs ${getTypeColor(rule.type)}`}>
                              {rule.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Badge variant="outline" className="text-xs">
                        {preset.applicableAgents.includes('all') 
                          ? 'All agents' 
                          : preset.applicableAgents.join(', ')}
                      </Badge>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={() => handleApply(preset)}
                      disabled={isApplied}
                    >
                      <Plus className="h-4 w-4" />
                      {isApplied ? 'Already Applied' : selectedCount > 0 ? `Apply ${selectedCount} Rules` : 'Apply All Rules'}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { PRESET_LIBRARY };
export default RulePresets;
