import type { MemoryUsage, PredictorState } from "../predictors/BranchPredictor";
import type { TraceStep } from "../simulation/TraceStep";

export interface Ratio {
  readonly numerator: number;
  readonly denominator: number;
  readonly value: number;
}

export interface StatisticsSet {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: Ratio;
  readonly missRate: Ratio;
  readonly memoryBits?: number;
  readonly usedEntries: number;
  readonly usedPredictors: number;
  readonly aliasingEvents: number;
  readonly finalState?: PredictorState;
}

export interface LoopSummary<TState extends PredictorState = PredictorState> {
  readonly stepsExecuted: number;
  readonly hits: number;
  readonly misses: number;
  readonly stateBefore?: TState;
  readonly stateAfter?: TState;
}

export class StatsCalculator {
  calculate(
    trace: readonly TraceStep[],
    memoryUsage?: MemoryUsage,
    usedPredictors = 1
  ): StatisticsSet {
    const hits = trace.filter((step) => step.hit).length;
    const misses = trace.length - hits;
    const usedEntries = new Set(trace.map((step) => step.predictionTrace.selectedEntry)).size;
    const aliasingEvents = trace.filter((step) => step.updateTrace.aliasingEvent).length;

    return {
      hits,
      misses,
      hitRate: this.ratio(hits, trace.length),
      missRate: this.ratio(misses, trace.length),
      memoryBits: memoryUsage?.bits,
      usedEntries,
      usedPredictors,
      aliasingEvents,
      finalState: trace.length > 0 ? trace[trace.length - 1].stateAfter : undefined
    };
  }

  summarizeRange<TState extends PredictorState>(
    trace: readonly TraceStep<TState>[]
  ): LoopSummary<TState> {
    return {
      stepsExecuted: trace.length,
      hits: trace.filter((step) => step.hit).length,
      misses: trace.filter((step) => !step.hit).length,
      stateBefore: trace.length > 0 ? trace[0].stateBefore : undefined,
      stateAfter: trace.length > 0 ? trace[trace.length - 1].stateAfter : undefined
    };
  }

  private ratio(numerator: number, denominator: number): Ratio {
    return {
      numerator,
      denominator,
      value: denominator === 0 ? 0 : numerator / denominator
    };
  }
}
