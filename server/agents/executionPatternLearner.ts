/**
 * Execution Pattern Learner
 * 
 * Records successful execution sequences, identifies common patterns,
 * suggests optimized tool sequences, and learns from failures.
 */

import { logger } from '../_core/logger';

// --- Type Definitions ---

/**
 * Represents a single tool call in an execution sequence.
 */
export interface ToolCall {
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    success: boolean;
    durationMs: number;
    timestamp: Date;
}

/**
 * Represents a complete execution record.
 */
export interface ExecutionRecord {
    id: string;
    userQuery: string;
    toolSequence: string[];
    toolCalls: ToolCall[];
    success: boolean;
    totalDurationMs: number;
    timestamp: Date;
}

/**
 * Represents a learned execution pattern.
 */
export interface ExecutionPattern {
    patternId: string;
    userQuerySignature: string;
    toolSequence: string[];
    successCount: number;
    failureCount: number;
    avgDurationMs: number;
    confidence: number;
    lastUpdated: Date;
}

/**
 * Represents a failure record for analysis.
 */
export interface FailureRecord {
    id: string;
    userQuery: string;
    toolSequence: string[];
    errorType: string;
    errorMessage: string;
    timestamp: Date;
}

// --- Execution Recorder ---

/**
 * Records tool call sequences for pattern extraction.
 */
export class ExecutionRecorder {
    private records: ExecutionRecord[] = [];
    private maxRecords: number = 1000;

    /**
     * Records a new execution.
     */
    public record(record: ExecutionRecord): void {
        this.records.push(record);
        
        // Maintain max size
        if (this.records.length > this.maxRecords) {
            this.records = this.records.slice(-this.maxRecords);
        }

        logger.debug(`Recorded execution: ${record.id}, Success: ${record.success}`);
    }

    /**
     * Gets all recorded executions.
     */
    public getRecords(): ExecutionRecord[] {
        return [...this.records];
    }

    /**
     * Gets successful executions only.
     */
    public getSuccessfulRecords(): ExecutionRecord[] {
        return this.records.filter(r => r.success);
    }

    /**
     * Gets failed executions only.
     */
    public getFailedRecords(): ExecutionRecord[] {
        return this.records.filter(r => !r.success);
    }

    /**
     * Clears all records.
     */
    public clear(): void {
        this.records = [];
    }
}

// --- Pattern Extractor ---

/**
 * Extracts patterns from execution records.
 */
export class PatternExtractor {
    private patterns: Map<string, ExecutionPattern> = new Map();

    /**
     * Normalizes a user query to create a signature for pattern matching.
     */
    private normalizeQuery(query: string): string {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .sort()
            .join(' ');
    }

    /**
     * Generates a pattern ID from a query signature and tool sequence.
     */
    private generatePatternId(signature: string, sequence: string[]): string {
        return `${signature}::${sequence.join('->')}`;
    }

    /**
     * Extracts patterns from a batch of execution records.
     */
    public extractPatterns(records: ExecutionRecord[]): void {
        for (const record of records) {
            const signature = this.normalizeQuery(record.userQuery);
            const patternId = this.generatePatternId(signature, record.toolSequence);

            const existing = this.patterns.get(patternId);

            if (existing) {
                // Update existing pattern
                if (record.success) {
                    existing.successCount++;
                } else {
                    existing.failureCount++;
                }
                
                // Update average duration
                const totalExecutions = existing.successCount + existing.failureCount;
                existing.avgDurationMs = (
                    (existing.avgDurationMs * (totalExecutions - 1)) + record.totalDurationMs
                ) / totalExecutions;
                
                // Recalculate confidence
                existing.confidence = existing.successCount / totalExecutions;
                existing.lastUpdated = new Date();
            } else {
                // Create new pattern
                const newPattern: ExecutionPattern = {
                    patternId,
                    userQuerySignature: signature,
                    toolSequence: record.toolSequence,
                    successCount: record.success ? 1 : 0,
                    failureCount: record.success ? 0 : 1,
                    avgDurationMs: record.totalDurationMs,
                    confidence: record.success ? 1.0 : 0.0,
                    lastUpdated: new Date(),
                };
                this.patterns.set(patternId, newPattern);
            }
        }

        logger.info(`Extracted/updated patterns. Total patterns: ${this.patterns.size}`);
    }

    /**
     * Finds the best matching pattern for a user query.
     */
    public findBestPattern(userQuery: string, minConfidence: number = 0.7): ExecutionPattern | null {
        const querySignature = this.normalizeQuery(userQuery);
        let bestMatch: ExecutionPattern | null = null;
        let highestScore = -1;

        const patternArray = Array.from(this.patterns.values());

        for (const pattern of patternArray) {
            if (pattern.confidence < minConfidence) continue;

            let score = 0;
            
            // Exact signature match
            if (pattern.userQuerySignature === querySignature) {
                score = 1.0;
            }
            // Substring match
            else if (querySignature.includes(pattern.userQuerySignature) || 
                     pattern.userQuerySignature.includes(querySignature)) {
                score = 0.8;
            }
            // Token overlap
            else {
                const queryTokens = querySignature.split(/\s+/);
                const patternTokens = pattern.userQuerySignature.split(/\s+/);
                const querySet = new Set(queryTokens);
                const patternSet = new Set(patternTokens);
                
                let intersection = 0;
                for (const token of queryTokens) {
                    if (patternSet.has(token)) intersection++;
                }
                
                const union = querySet.size + patternSet.size - intersection;
                score = union > 0 ? (intersection / union) * 0.5 : 0;
            }

            const finalScore = score * pattern.confidence;

            if (finalScore > highestScore) {
                highestScore = finalScore;
                bestMatch = pattern;
            }
        }

        if (bestMatch) {
            logger.debug(`Found pattern match with score ${highestScore.toFixed(2)}`);
        }

        return highestScore >= minConfidence ? bestMatch : null;
    }

    /**
     * Gets all patterns sorted by confidence.
     */
    public getAllPatterns(): ExecutionPattern[] {
        return Array.from(this.patterns.values())
            .sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Gets high-confidence patterns.
     */
    public getHighConfidencePatterns(minConfidence: number = 0.8): ExecutionPattern[] {
        return this.getAllPatterns().filter(p => p.confidence >= minConfidence);
    }
}

// --- Sequence Optimizer ---

/**
 * Suggests optimized tool sequences based on learned patterns.
 */
export class SequenceOptimizer {
    private patternExtractor: PatternExtractor;
    private minConfidenceThreshold: number = 0.7;

    constructor(patternExtractor: PatternExtractor) {
        this.patternExtractor = patternExtractor;
    }

    /**
     * Suggests an optimized tool sequence for a user query.
     */
    public suggestSequence(userQuery: string): string[] | null {
        try {
            const bestPattern = this.patternExtractor.findBestPattern(
                userQuery, 
                this.minConfidenceThreshold
            );

            if (!bestPattern) {
                logger.debug('No suitable pattern found for query');
                return null;
            }

            // Check if pattern is reliable enough
            const totalExecutions = bestPattern.successCount + bestPattern.failureCount;
            if (totalExecutions < 3) {
                logger.debug('Pattern has insufficient execution history');
                return null;
            }

            logger.info(`Suggesting sequence from pattern ${bestPattern.patternId}`);
            return bestPattern.toolSequence;

        } catch (error) {
            logger.error({ error }, 'Error during sequence suggestion');
            return null;
        }
    }

    /**
     * Ranks multiple possible sequences by expected success.
     */
    public rankSequences(sequences: string[][]): Array<{ sequence: string[]; score: number }> {
        const patterns = this.patternExtractor.getAllPatterns();
        
        return sequences.map(sequence => {
            const sequenceKey = sequence.join('->');
            const matchingPattern = patterns.find(p => p.toolSequence.join('->') === sequenceKey);
            
            return {
                sequence,
                score: matchingPattern ? matchingPattern.confidence : 0.5,
            };
        }).sort((a, b) => b.score - a.score);
    }
}

// --- Failure Analyzer ---

/**
 * Analyzes failures to prevent repeated mistakes.
 */
export class FailureAnalyzer {
    private failureRules: Map<string, string> = new Map();
    private failureCounts: Map<string, number> = new Map();

    /**
     * Analyzes failure records to generate avoidance rules.
     */
    public analyzeFailures(failureRecords: FailureRecord[]): void {
        for (const record of failureRecords) {
            const sequenceKey = record.toolSequence.join('->');
            const key = `${sequenceKey}::${record.errorType}`;

            const count = (this.failureCounts.get(key) || 0) + 1;
            this.failureCounts.set(key, count);

            // Generate avoidance rule if failure is recurring
            if (count >= 3 && !this.failureRules.has(sequenceKey)) {
                this.failureRules.set(
                    sequenceKey,
                    `Avoid sequence "${sequenceKey}" - recurring error: ${record.errorType}`
                );
                logger.warn(`Generated avoidance rule for sequence: ${sequenceKey}`);
            }
        }
    }

    /**
     * Checks if a sequence should be avoided.
     */
    public shouldAvoid(sequence: string[]): { avoid: boolean; reason?: string } {
        const sequenceKey = sequence.join('->');
        const rule = this.failureRules.get(sequenceKey);

        if (rule) {
            return { avoid: true, reason: rule };
        }

        return { avoid: false };
    }

    /**
     * Gets all avoidance rules.
     */
    public getAvoidanceRules(): Map<string, string> {
        return new Map(this.failureRules);
    }

    /**
     * Clears a specific avoidance rule (e.g., after a fix).
     */
    public clearRule(sequenceKey: string): boolean {
        return this.failureRules.delete(sequenceKey);
    }
}

// --- Execution Pattern Learner Service ---

/**
 * Main service that coordinates pattern learning from executions.
 */
export class ExecutionPatternLearner {
    private recorder: ExecutionRecorder;
    private extractor: PatternExtractor;
    private optimizer: SequenceOptimizer;
    private failureAnalyzer: FailureAnalyzer;

    constructor() {
        this.recorder = new ExecutionRecorder();
        this.extractor = new PatternExtractor();
        this.optimizer = new SequenceOptimizer(this.extractor);
        this.failureAnalyzer = new FailureAnalyzer();
    }

    /**
     * Records an execution and updates patterns.
     */
    public recordExecution(record: ExecutionRecord): void {
        this.recorder.record(record);
        this.extractor.extractPatterns([record]);

        if (!record.success) {
            const failureRecord: FailureRecord = {
                id: record.id,
                userQuery: record.userQuery,
                toolSequence: record.toolSequence,
                errorType: 'execution_failure',
                errorMessage: 'Task failed',
                timestamp: record.timestamp,
            };
            this.failureAnalyzer.analyzeFailures([failureRecord]);
        }
    }

    /**
     * Suggests an optimized tool sequence for a query.
     */
    public suggestSequence(userQuery: string): string[] | null {
        // Check for avoidance rules first
        const suggestion = this.optimizer.suggestSequence(userQuery);
        
        if (suggestion) {
            const avoidance = this.failureAnalyzer.shouldAvoid(suggestion);
            if (avoidance.avoid) {
                logger.warn(`Suggested sequence should be avoided: ${avoidance.reason}`);
                return null;
            }
        }

        return suggestion;
    }

    /**
     * Gets learning statistics.
     */
    public getStatistics(): {
        totalRecords: number;
        successRate: number;
        patternCount: number;
        highConfidencePatterns: number;
        avoidanceRules: number;
    } {
        const records = this.recorder.getRecords();
        const successfulRecords = this.recorder.getSuccessfulRecords();
        const patterns = this.extractor.getAllPatterns();
        const highConfidence = this.extractor.getHighConfidencePatterns();
        const rules = this.failureAnalyzer.getAvoidanceRules();

        return {
            totalRecords: records.length,
            successRate: records.length > 0 ? successfulRecords.length / records.length : 0,
            patternCount: patterns.length,
            highConfidencePatterns: highConfidence.length,
            avoidanceRules: rules.size,
        };
    }
}

// Export singleton instance
export const executionPatternLearner = new ExecutionPatternLearner();
