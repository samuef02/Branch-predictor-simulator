import type { BranchExecution } from "../simulation/BranchSequence";
import type { Outcome } from "../shared/Outcome";

export interface PredictorState {
  readonly type: string;
}

export interface PredictionResult<TState extends PredictorState = PredictorState> {
  readonly prediction: Outcome;
  readonly stateBefore: TState;
  readonly trace: PredictionTrace;
}

export interface UpdateResult<TState extends PredictorState = PredictorState> {
  readonly stateAfter: TState;
  readonly trace: UpdateTrace;
}

export interface PredictionTrace {
  readonly selectedEntry: string;
  readonly counterBefore?: string;
  readonly indexCalculation?: IndexCalculation;
  readonly compactExplanation: string;
}

export interface UpdateTrace {
  readonly counterAfter?: string;
  readonly saturationApplied: boolean;
  readonly aliasingEvent?: AliasingEvent;
}

export interface AliasingEvent {
  readonly entry: string;
  readonly branchIds: readonly string[];
  readonly description: string;
}

export interface IndexCalculation {
  readonly policy: string;
  readonly pcBits?: string;
  readonly historyBits?: string;
  readonly operation: string;
  readonly resultIndex: string;
}

export interface BranchPredictor<TConfig, TState extends PredictorState> {
  initialise(config: TConfig): TState;
  predict(execution: BranchExecution, state: TState): PredictionResult<TState>;
  update(execution: BranchExecution, actualOutcome: Outcome, state: TState): UpdateResult<TState>;
}

export interface MemoryUsage {
  readonly bits: number;
  readonly entries: number;
}

export interface MemoryMeasurable<TConfig> {
  memoryUsage(config: TConfig): MemoryUsage;
}
