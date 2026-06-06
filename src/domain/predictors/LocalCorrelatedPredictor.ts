import type {
  BranchPredictor,
  MemoryMeasurable,
  PredictionResult,
  PredictorState,
  UpdateResult
} from "./BranchPredictor";
import { HistoryRegister } from "./HistoryRegister";
import { SaturatingCounter } from "./SaturatingCounter";
import type { OneLevelIndexPolicy } from "./OneLevelPredictor";
import type { BranchExecution } from "../simulation/BranchSequence";
import type { Outcome } from "../shared/Outcome";
import { LsbIndexer } from "../indexing/LsbIndexer";
import { ManualIndexer } from "../indexing/ManualIndexer";
import { assertPositiveInteger } from "../shared/BitString";

export interface LocalCorrelatedConfig {
  readonly type: "local-correlated";
  readonly localHistoryBits: number;
  readonly localHistoryTableEntries: number;
  readonly localPredictionTableEntries: number;
  readonly counterBits: number;
  readonly initialLocalHistoryValue: number;
  readonly initialCounterValue: number;
  readonly indexPolicy: OneLevelIndexPolicy;
}

export interface LocalCorrelatedState extends PredictorState {
  readonly type: "local-correlated";
  readonly histories: readonly HistoryRegister[];
  readonly counters: readonly SaturatingCounter[];
  readonly indexPolicy: OneLevelIndexPolicy;
}

export class LocalCorrelatedPredictor
  implements
    BranchPredictor<LocalCorrelatedConfig, LocalCorrelatedState>,
    MemoryMeasurable<LocalCorrelatedConfig>
{
  initialise(config: LocalCorrelatedConfig): LocalCorrelatedState {
    this.validateConfig(config);

    return {
      type: "local-correlated",
      indexPolicy: config.indexPolicy,
      histories: Array.from(
        { length: config.localHistoryTableEntries },
        () => new HistoryRegister(config.localHistoryBits, config.initialLocalHistoryValue)
      ),
      counters: Array.from(
        { length: config.localPredictionTableEntries },
        () => new SaturatingCounter(config.counterBits, config.initialCounterValue)
      )
    };
  }

  predict(
    execution: BranchExecution,
    state: LocalCorrelatedState
  ): PredictionResult<LocalCorrelatedState> {
    const { historyIndex, counterIndex } = this.resolveIndexes(execution, state);
    const counter = state.counters[counterIndex];

    return {
      prediction: counter.predict(),
      stateBefore: state,
      trace: {
        selectedEntry: `${historyIndex}:${counterIndex}`,
        counterBefore: counter.toBits(),
        indexCalculation: {
          policy: "local-correlated",
          historyBits: state.histories[historyIndex].toBits(),
          operation: "local history table -> local prediction table",
          resultIndex: `${historyIndex}:${counterIndex}`
        },
        compactExplanation: `Local history ${historyIndex} selects predictor ${counterIndex}.`
      }
    };
  }

  update(
    execution: BranchExecution,
    actualOutcome: Outcome,
    state: LocalCorrelatedState
  ): UpdateResult<LocalCorrelatedState> {
    const { historyIndex, counterIndex } = this.resolveIndexes(execution, state);
    const before = state.counters[counterIndex];
    const after = before.update(actualOutcome);

    return {
      stateAfter: {
        ...state,
        histories: state.histories.map((history, index) =>
          index === historyIndex ? history.shiftIn(actualOutcome) : history
        ),
        counters: state.counters.map((counter, index) => (index === counterIndex ? after : counter))
      },
      trace: { counterAfter: after.toBits(), saturationApplied: before.value === after.value }
    };
  }

  memoryUsage(config: LocalCorrelatedConfig) {
    this.validateConfig(config);

    return {
      bits:
        config.localHistoryTableEntries * config.localHistoryBits +
        config.localPredictionTableEntries * config.counterBits,
      entries: config.localPredictionTableEntries
    };
  }

  private resolveIndexes(execution: BranchExecution, state: LocalCorrelatedState) {
    const historyIndex =
      state.indexPolicy.type === "manual"
        ? new ManualIndexer().resolveIndex(execution, state.indexPolicy).index
        : new LsbIndexer().resolveIndex(execution, state.indexPolicy).index;
    const counterIndex = state.histories[historyIndex].value % state.counters.length;

    return { historyIndex, counterIndex };
  }

  private validateConfig(config: LocalCorrelatedConfig): void {
    assertPositiveInteger(config.localHistoryBits, "localHistoryBits");
    assertPositiveInteger(config.localHistoryTableEntries, "localHistoryTableEntries");
    assertPositiveInteger(config.localPredictionTableEntries, "localPredictionTableEntries");
    assertPositiveInteger(config.counterBits, "counterBits");
    if (config.indexPolicy.entries !== config.localHistoryTableEntries) {
      throw new Error("indexPolicy.entries must match localHistoryTableEntries");
    }
    new HistoryRegister(config.localHistoryBits, config.initialLocalHistoryValue);
    new SaturatingCounter(config.counterBits, config.initialCounterValue);
  }
}
