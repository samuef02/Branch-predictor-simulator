import type {
  BranchPredictor,
  PredictorState
} from "../predictors/BranchPredictor";
import type { BranchExecution, BranchSequence } from "./BranchSequence";
import { SequenceExpander } from "./SequenceExpander";
import type { TraceStep } from "./TraceStep";

export type RunStatus = "idle" | "running" | "completed";

export interface SimulationRun<TState extends PredictorState> {
  readonly status: RunStatus;
  readonly currentStep: number;
  readonly predictorState: TState;
  readonly initialState: TState;
  readonly executions: readonly BranchExecution[];
  readonly trace: readonly TraceStep<TState>[];
}

export class SimulationEngine {
  constructor(private readonly sequenceExpander = new SequenceExpander()) {}

  initialise<TConfig, TState extends PredictorState>(
    sequence: BranchSequence,
    predictor: BranchPredictor<TConfig, TState>,
    config: TConfig
  ): SimulationRun<TState> {
    const initialState = predictor.initialise(config);

    return {
      status: "idle",
      currentStep: 0,
      predictorState: initialState,
      initialState,
      executions: this.sequenceExpander.expand(sequence),
      trace: []
    };
  }

  advanceOne<TConfig, TState extends PredictorState>(
    run: SimulationRun<TState>,
    predictor: BranchPredictor<TConfig, TState>
  ): SimulationRun<TState> {
    if (run.currentStep >= run.executions.length) {
      return { ...run, status: "completed" };
    }

    const execution = run.executions[run.currentStep];
    const prediction = predictor.predict(execution, run.predictorState);
    const update = predictor.update(execution, execution.actual, run.predictorState);
    const traceStep: TraceStep<TState> = {
      step: run.currentStep + 1,
      branchExecution: execution,
      prediction: prediction.prediction,
      actual: execution.actual,
      hit: prediction.prediction === execution.actual,
      stateBefore: run.predictorState,
      stateAfter: update.stateAfter,
      predictionTrace: prediction.trace,
      updateTrace: update.trace
    };

    const currentStep = run.currentStep + 1;
    return {
      ...run,
      status: currentStep >= run.executions.length ? "completed" : "running",
      currentStep,
      predictorState: update.stateAfter,
      trace: [...run.trace, traceStep]
    };
  }

  runToCompletion<TConfig, TState extends PredictorState>(
    run: SimulationRun<TState>,
    predictor: BranchPredictor<TConfig, TState>
  ): SimulationRun<TState> {
    let currentRun = run;
    while (currentRun.status !== "completed") {
      currentRun = this.advanceOne(currentRun, predictor);
    }

    return currentRun;
  }

  runRange<TConfig, TState extends PredictorState>(
    run: SimulationRun<TState>,
    executions: readonly BranchExecution[],
    predictor: BranchPredictor<TConfig, TState>
  ): readonly TraceStep<TState>[] {
    const rangeRun: SimulationRun<TState> = {
      ...run,
      status: executions.length === 0 ? "completed" : "idle",
      currentStep: 0,
      executions,
      trace: []
    };

    return this.runToCompletion(rangeRun, predictor).trace;
  }

  reset<TState extends PredictorState>(run: SimulationRun<TState>): SimulationRun<TState> {
    return {
      ...run,
      status: "idle",
      currentStep: 0,
      predictorState: run.initialState,
      trace: []
    };
  }

  stepBack<TState extends PredictorState>(run: SimulationRun<TState>): SimulationRun<TState> {
    if (run.trace.length === 0) {
      return run;
    }

    const previousTrace = run.trace.slice(0, -1);
    const previousState = run.trace[run.trace.length - 1].stateBefore;
    return {
      ...run,
      status: previousTrace.length === 0 ? "idle" : "running",
      currentStep: run.currentStep - 1,
      predictorState: previousState,
      trace: previousTrace
    };
  }
}
