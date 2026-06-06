import { describe, expect, it } from "vitest";
import { OneLevelPredictor, type OneLevelConfig } from "../predictors/OneLevelPredictor";
import type { BranchSequence } from "./BranchSequence";
import { SimulationEngine } from "./SimulationEngine";

const config: OneLevelConfig = {
  type: "one-level",
  counterBits: 2,
  entries: 2,
  initialCounterValue: 1,
  indexPolicy: { type: "manual", entries: 2 }
};

const sequence: BranchSequence = {
  executions: [
    { order: 0, branchId: "B1", actual: "T", manualIndex: 0 },
    { order: 1, branchId: "B2", actual: "NT", manualIndex: 1 },
    { order: 2, branchId: "B1", actual: "T", manualIndex: 0 }
  ],
  loops: []
};

describe("SimulationEngine", () => {
  it("runs one step and emits canonical trace data", () => {
    const engine = new SimulationEngine();
    const predictor = new OneLevelPredictor();
    const initialRun = engine.initialise(sequence, predictor, config);

    const run = engine.advanceOne(initialRun, predictor);

    expect(run.currentStep).toBe(1);
    expect(run.status).toBe("running");
    expect(run.trace[0]).toMatchObject({
      step: 1,
      prediction: "NT",
      actual: "T",
      hit: false
    });
    expect(run.trace[0].predictionTrace).toMatchObject({
      selectedEntry: "0",
      counterBefore: "01"
    });
    expect(run.trace[0].updateTrace).toMatchObject({ counterAfter: "10" });
  });

  it("runs to completion and can reset", () => {
    const engine = new SimulationEngine();
    const predictor = new OneLevelPredictor();
    const completed = engine.runToCompletion(engine.initialise(sequence, predictor, config), predictor);

    expect(completed.status).toBe("completed");
    expect(completed.trace).toHaveLength(3);
    expect(completed.trace.map((step) => step.hit)).toEqual([false, true, true]);

    const reset = engine.reset(completed);
    expect(reset.status).toBe("idle");
    expect(reset.currentStep).toBe(0);
    expect(reset.trace).toHaveLength(0);
    expect(reset.predictorState.counters.map((counter) => counter.toBits())).toEqual(["01", "01"]);
  });

  it("steps back using the previous state snapshot", () => {
    const engine = new SimulationEngine();
    const predictor = new OneLevelPredictor();
    const run = engine.runToCompletion(engine.initialise(sequence, predictor, config), predictor);

    const previous = engine.stepBack(run);

    expect(previous.currentStep).toBe(2);
    expect(previous.trace).toHaveLength(2);
    expect(previous.predictorState.counters.map((counter) => counter.toBits())).toEqual(["10", "00"]);
  });

  it("produces the same final state when a loop is expanded or stepped manually", () => {
    const engine = new SimulationEngine();
    const predictor = new OneLevelPredictor();
    const loopSequence: BranchSequence = {
      executions: [
        { order: 0, branchId: "B1", actual: "T", manualIndex: 0 },
        { order: 1, branchId: "B1", actual: "NT", manualIndex: 0 }
      ],
      loops: [{ startOrder: 0, endOrder: 1, repetitions: 2 }]
    };
    const expandedRun = engine.runToCompletion(
      engine.initialise(loopSequence, predictor, config),
      predictor
    );
    const manualRun = engine.runToCompletion(
      engine.initialise(
        {
          executions: [
            { order: 0, branchId: "B1", actual: "T", manualIndex: 0 },
            { order: 1, branchId: "B1", actual: "NT", manualIndex: 0 },
            { order: 2, branchId: "B1", actual: "T", manualIndex: 0 },
            { order: 3, branchId: "B1", actual: "NT", manualIndex: 0 }
          ],
          loops: []
        },
        predictor,
        config
      ),
      predictor
    );

    expect(expandedRun.predictorState.counters.map((counter) => counter.toBits())).toEqual(
      manualRun.predictorState.counters.map((counter) => counter.toBits())
    );
  });
});
