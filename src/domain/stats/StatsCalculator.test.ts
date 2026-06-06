import { describe, expect, it } from "vitest";
import { OneLevelPredictor, type OneLevelConfig } from "../predictors/OneLevelPredictor";
import { SimulationEngine } from "../simulation/SimulationEngine";
import { StatsCalculator } from "./StatsCalculator";

const config: OneLevelConfig = {
  type: "one-level",
  counterBits: 2,
  entries: 2,
  initialCounterValue: 1,
  indexPolicy: { type: "manual", entries: 2 }
};

describe("StatsCalculator", () => {
  it("calculates hits, misses, rates, memory and final state from trace", () => {
    const predictor = new OneLevelPredictor();
    const run = new SimulationEngine().runToCompletion(
      new SimulationEngine().initialise(
        {
          executions: [
            { order: 0, branchId: "B1", actual: "T", manualIndex: 0 },
            { order: 1, branchId: "B2", actual: "NT", manualIndex: 1 },
            { order: 2, branchId: "B1", actual: "T", manualIndex: 0 }
          ],
          loops: []
        },
        predictor,
        config
      ),
      predictor
    );

    expect(new StatsCalculator().calculate(run.trace, predictor.memoryUsage(config))).toMatchObject({
      hits: 2,
      misses: 1,
      hitRate: { numerator: 2, denominator: 3, value: 2 / 3 },
      missRate: { numerator: 1, denominator: 3, value: 1 / 3 },
      memoryBits: 4,
      usedEntries: 2,
      usedPredictors: 1,
      aliasingEvents: 0
    });
  });

  it("counts aliasing events and summarizes ranges", () => {
    const predictor = new OneLevelPredictor();
    const engine = new SimulationEngine();
    const run = engine.runToCompletion(
      engine.initialise(
        {
          executions: [
            { order: 0, branchId: "B1", actual: "T", manualIndex: 0 },
            { order: 1, branchId: "B2", actual: "NT", manualIndex: 0 }
          ],
          loops: []
        },
        predictor,
        config
      ),
      predictor
    );
    const calculator = new StatsCalculator();

    expect(calculator.calculate(run.trace).aliasingEvents).toBe(1);
    expect(calculator.summarizeRange(run.trace)).toMatchObject({
      stepsExecuted: 2,
      hits: 0,
      misses: 2
    });
  });
});
