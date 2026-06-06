import { describe, expect, it } from "vitest";
import { GselectPredictor, type GselectConfig } from "./GselectPredictor";
import { GsharePredictor, type GshareConfig } from "./GsharePredictor";
import {
  GlobalCorrelatedPredictor,
  type GlobalCorrelatedConfig
} from "./GlobalCorrelatedPredictor";
import {
  LocalCorrelatedPredictor,
  type LocalCorrelatedConfig
} from "./LocalCorrelatedPredictor";
import { TwoLevelPredictor, type TwoLevelConfig } from "./TwoLevelPredictor";

describe("advanced predictors", () => {
  it("predicts and updates a two-level (n,m) predictor", () => {
    const config: TwoLevelConfig = {
      type: "two-level",
      historyBits: 1,
      counterBits: 2,
      firstLevelEntries: 1,
      countersPerEntry: 2,
      initialHistoryValue: 0,
      initialCounterValue: 1,
      indexPolicy: { type: "manual", entries: 1 }
    };
    const predictor = new TwoLevelPredictor();
    const initial = predictor.initialise(config);
    const execution = { order: 0, branchId: "B1", actual: "T" as const, manualIndex: 0 };
    const updated = predictor.update(execution, "T", initial).stateAfter;

    expect(predictor.predict(execution, initial).trace.selectedEntry).toBe("0:0");
    expect(updated.histories[0].toBits()).toBe("1");
    expect(predictor.memoryUsage(config)).toEqual({ bits: 5, entries: 2 });
  });

  it("uses global history for correlated prediction", () => {
    const config: GlobalCorrelatedConfig = {
      type: "global-correlated",
      ghrBits: 2,
      phtEntries: 4,
      counterBits: 2,
      initialGhrValue: 0,
      initialCounterValue: 1
    };
    const predictor = new GlobalCorrelatedPredictor();
    const initial = predictor.initialise(config);
    const execution = { order: 0, branchId: "B1", actual: "T" as const };

    expect(predictor.predict(execution, initial).trace.selectedEntry).toBe("0");
    expect(predictor.update(execution, "T", initial).stateAfter.ghr.toBits()).toBe("01");
  });

  it("uses XOR indexing for gshare", () => {
    const config: GshareConfig = {
      type: "gshare",
      ghrBits: 2,
      ghrBitsUsed: 2,
      pcBits: 2,
      phtEntries: 4,
      counterBits: 2,
      initialGhrValue: 1,
      initialCounterValue: 2
    };
    const predictor = new GsharePredictor();
    const state = predictor.initialise(config);

    expect(
      predictor.predict({ order: 0, branchId: "B1", actual: "T", address: 0b11 }, state).trace
        .indexCalculation
    ).toMatchObject({ policy: "xor", resultIndex: "2" });
  });

  it("uses concatenating indexing for gselect", () => {
    const config: GselectConfig = {
      type: "gselect",
      ghrBits: 2,
      ghrBitsUsed: 2,
      pcBits: 2,
      phtEntries: 16,
      counterBits: 2,
      initialGhrValue: 1,
      initialCounterValue: 2
    };
    const predictor = new GselectPredictor();
    const state = predictor.initialise(config);

    expect(
      predictor.predict({ order: 0, branchId: "B1", actual: "T", address: 0b10 }, state).trace
        .indexCalculation
    ).toMatchObject({ policy: "concat", resultIndex: "9" });
  });

  it("uses local history to select a local prediction table entry", () => {
    const config: LocalCorrelatedConfig = {
      type: "local-correlated",
      localHistoryBits: 2,
      localHistoryTableEntries: 2,
      localPredictionTableEntries: 4,
      counterBits: 2,
      initialLocalHistoryValue: 0,
      initialCounterValue: 1,
      indexPolicy: { type: "manual", entries: 2 }
    };
    const predictor = new LocalCorrelatedPredictor();
    const initial = predictor.initialise(config);
    const execution = { order: 0, branchId: "B1", actual: "T" as const, manualIndex: 1 };
    const updated = predictor.update(execution, "T", initial).stateAfter;

    expect(predictor.predict(execution, initial).trace.selectedEntry).toBe("1:0");
    expect(updated.histories[1].toBits()).toBe("01");
    expect(predictor.memoryUsage(config)).toEqual({ bits: 12, entries: 4 });
  });
});
