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
import { ConcatenatingIndexer } from "../indexing/ConcatenatingIndexer";
import { assertPositiveInteger } from "../shared/BitString";

export interface GselectConfig {
  readonly type: "gselect";
  readonly ghrBits: number;
  readonly phtEntries: number;
  readonly counterBits: number;
  readonly initialGhrValue: number;
  readonly initialCounterValue: number;
  readonly pcBits: number;
  readonly ghrBitsUsed: number;
  readonly ignoreLowBits?: number;
}

export interface GselectState extends PredictorState {
  readonly type: "gselect";
  readonly ghr: HistoryRegister;
  readonly counters: readonly SaturatingCounter[];
  readonly pcBits: number;
  readonly ghrBitsUsed: number;
  readonly ignoreLowBits?: number;
}

export class GselectPredictor
  implements BranchPredictor<GselectConfig, GselectState>, MemoryMeasurable<GselectConfig>
{
  initialise(config: GselectConfig): GselectState {
    this.validateConfig(config);

    return {
      type: "gselect",
      ghr: new HistoryRegister(config.ghrBits, config.initialGhrValue),
      counters: Array.from(
        { length: config.phtEntries },
        () => new SaturatingCounter(config.counterBits, config.initialCounterValue)
      ),
      pcBits: config.pcBits,
      ghrBitsUsed: config.ghrBitsUsed,
      ignoreLowBits: config.ignoreLowBits
    };
  }

  predict(execution: BranchExecution, state: GselectState): PredictionResult<GselectState> {
    const { index, calculation } = new ConcatenatingIndexer().resolveIndex(execution, {
      entries: state.counters.length,
      pcBits: state.pcBits,
      historyBits: state.ghrBitsUsed,
      historyValue: state.ghr.value,
      ignoreLowBits: state.ignoreLowBits
    });
    const counter = state.counters[index];

    return {
      prediction: counter.predict(),
      stateBefore: state,
      trace: {
        selectedEntry: String(index),
        counterBefore: counter.toBits(),
        indexCalculation: calculation,
        compactExplanation: `gselect selects counter ${index}.`
      }
    };
  }

  update(
    execution: BranchExecution,
    actualOutcome: Outcome,
    state: GselectState
  ): UpdateResult<GselectState> {
    const prediction = this.predict(execution, state);
    const index = Number(prediction.trace.selectedEntry);
    const before = state.counters[index];
    const after = before.update(actualOutcome);

    return {
      stateAfter: {
        type: "gselect",
        ghr: state.ghr.shiftIn(actualOutcome),
        pcBits: state.pcBits,
        ghrBitsUsed: state.ghrBitsUsed,
        ignoreLowBits: state.ignoreLowBits,
        counters: state.counters.map((counter, counterIndex) =>
          counterIndex === index ? after : counter
        )
      },
      trace: { counterAfter: after.toBits(), saturationApplied: before.value === after.value }
    };
  }

  memoryUsage(config: GselectConfig) {
    this.validateConfig(config);

    return {
      bits: config.ghrBits + config.phtEntries * config.counterBits,
      entries: config.phtEntries
    };
  }

  private validateConfig(config: GselectConfig): void {
    assertPositiveInteger(config.ghrBits, "ghrBits");
    assertPositiveInteger(config.phtEntries, "phtEntries");
    assertPositiveInteger(config.counterBits, "counterBits");
    assertPositiveInteger(config.pcBits, "pcBits");
    assertPositiveInteger(config.ghrBitsUsed, "ghrBitsUsed");
    new HistoryRegister(config.ghrBits, config.initialGhrValue);
    new SaturatingCounter(config.counterBits, config.initialCounterValue);
  }
}
