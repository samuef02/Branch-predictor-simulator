import type {
  PredictionTrace,
  PredictorState,
  UpdateTrace
} from "../predictors/BranchPredictor";
import type { BranchExecution } from "./BranchSequence";
import type { Outcome } from "../shared/Outcome";

export interface TraceStep<TState extends PredictorState = PredictorState> {
  readonly step: number;
  readonly branchExecution: BranchExecution;
  readonly prediction: Outcome;
  readonly actual: Outcome;
  readonly hit: boolean;
  readonly stateBefore: TState;
  readonly stateAfter: TState;
  readonly predictionTrace: PredictionTrace;
  readonly updateTrace: UpdateTrace;
}
