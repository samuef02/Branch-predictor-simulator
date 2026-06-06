import type { BranchPredictor, MemoryMeasurable, PredictorState } from "./BranchPredictor";
import { GlobalCorrelatedPredictor } from "./GlobalCorrelatedPredictor";
import { GselectPredictor } from "./GselectPredictor";
import { GsharePredictor } from "./GsharePredictor";
import { LocalCorrelatedPredictor } from "./LocalCorrelatedPredictor";
import { OneLevelPredictor } from "./OneLevelPredictor";
import { TwoLevelPredictor } from "./TwoLevelPredictor";

export type ExecutablePredictor = BranchPredictor<unknown, PredictorState> &
  Partial<MemoryMeasurable<unknown>>;

export class PredictorFactory {
  create(config: unknown): ExecutablePredictor | undefined {
    if (!config || typeof config !== "object" || !("type" in config)) {
      return undefined;
    }

    switch ((config as { type: string }).type) {
      case "one-level":
        return new OneLevelPredictor() as ExecutablePredictor;
      case "two-level":
        return new TwoLevelPredictor() as ExecutablePredictor;
      case "global-correlated":
        return new GlobalCorrelatedPredictor() as ExecutablePredictor;
      case "gshare":
        return new GsharePredictor() as ExecutablePredictor;
      case "gselect":
        return new GselectPredictor() as ExecutablePredictor;
      case "local-correlated":
        return new LocalCorrelatedPredictor() as ExecutablePredictor;
      default:
        return undefined;
    }
  }
}
