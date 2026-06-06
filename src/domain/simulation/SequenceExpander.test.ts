import { describe, expect, it } from "vitest";
import { SequenceExpander } from "./SequenceExpander";
import type { BranchSequence } from "./BranchSequence";

describe("SequenceExpander", () => {
  it("expands a visual loop as repeated canonical executions", () => {
    const sequence: BranchSequence = {
      executions: [
        { order: 0, branchId: "B0", actual: "NT", manualIndex: 0 },
        { order: 1, branchId: "B1", actual: "T", manualIndex: 1 },
        { order: 2, branchId: "B2", actual: "NT", manualIndex: 2 },
        { order: 3, branchId: "B3", actual: "T", manualIndex: 3 }
      ],
      loops: [{ startOrder: 1, endOrder: 2, repetitions: 3 }]
    };

    expect(new SequenceExpander().expand(sequence).map((execution) => execution.branchId)).toEqual([
      "B0",
      "B1",
      "B2",
      "B1",
      "B2",
      "B1",
      "B2",
      "B3"
    ]);
  });

  it("rejects loop ranges that do not match executions", () => {
    const sequence: BranchSequence = {
      executions: [{ order: 0, branchId: "B0", actual: "NT", manualIndex: 0 }],
      loops: [{ startOrder: 0, endOrder: 2, repetitions: 2 }]
    };

    expect(() => new SequenceExpander().expand(sequence)).toThrow(
      "loop range must match existing execution orders"
    );
  });
});
