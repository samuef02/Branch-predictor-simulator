import type {
  BranchPredictor,
  MemoryMeasurable,
  PredictionResult,
  PredictorState,
  UpdateResult
} from "./BranchPredictor";
import { HistoryRegister } from "./HistoryRegister";
import { SaturatingCounter } from "./SaturatingCounter";
import type { BranchExecution } from "../simulation/BranchSequence";
import type { Outcome } from "../shared/Outcome";
import { assertPositiveInteger } from "../shared/BitString";

export interface GlobalCorrelatedConfig {
  readonly type: "global-correlated";
  readonly ghrBits: number;
  readonly phtEntries: number;
  readonly counterBits: number;
  readonly initialGhrValue: number;
  readonly initialCounterValue: number;
}

export interface GlobalCorrelatedState extends PredictorState {
  readonly type: "global-correlated";
  readonly ghr: HistoryRegister;
  readonly counters: readonly SaturatingCounter[];
}

export class GlobalCorrelatedPredictor
  implements
    BranchPredictor<GlobalCorrelatedConfig, GlobalCorrelatedState>,
    MemoryMeasurable<GlobalCorrelatedConfig>
{
  initialise(config: GlobalCorrelatedConfig): GlobalCorrelatedState {
    this.validateConfig(config);

    return {
      type: "global-correlated",
      ghr: new HistoryRegister(config.ghrBits, config.initialGhrValue),
      counters: Array.from(
        { length: config.phtEntries },
        () => new SaturatingCounter(config.counterBits, config.initialCounterValue)
      )
    };
  }

  predict(
    _execution: BranchExecution,
    state: GlobalCorrelatedState
  ): PredictionResult<GlobalCorrelatedState> {
    const index = state.ghr.value % state.counters.length;
    const counter = state.counters[index];

    return {
      prediction: counter.predict(),
      stateBefore: state,
      trace: {
        selectedEntry: String(index),
        counterBefore: counter.toBits(),
        indexCalculation: {
          policy: "global-history",
          historyBits: state.ghr.toBits(),
          operation: "GHR",
          resultIndex: String(index)
        },
        compactExplanation: `GHR ${state.ghr.toBits()} selects counter ${index}.`
      }
    };
  }

  update(
    _execution: BranchExecution,
    actualOutcome: Outcome,
    state: GlobalCorrelatedState
  ): UpdateResult<GlobalCorrelatedState> {
    const index = state.ghr.value % state.counters.length;
    const before = state.counters[index];
    const after = before.update(actualOutcome);

    return {
      stateAfter: {
        type: "global-correlated",
        ghr: state.ghr.shiftIn(actualOutcome),
        counters: state.counters.map((counter, counterIndex) =>
          counterIndex === index ? after : counter
        )
      },
      trace: { counterAfter: after.toBits(), saturationApplied: before.value === after.value }
    };
  }

  memoryUsage(config: GlobalCorrelatedConfig) {
    this.validateConfig(config);

    return {
      bits: config.ghrBits + config.phtEntries * config.counterBits,
      entries: config.phtEntries
    };
  }

  private validateConfig(config: GlobalCorrelatedConfig): void {
    assertPositiveInteger(config.ghrBits, "ghrBits");
    assertPositiveInteger(config.phtEntries, "phtEntries");
    assertPositiveInteger(config.counterBits, "counterBits");
    new HistoryRegister(config.ghrBits, config.initialGhrValue);
    new SaturatingCounter(config.counterBits, config.initialCounterValue);
  }
}
