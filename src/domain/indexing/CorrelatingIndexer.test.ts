import { describe, expect, it } from "vitest";
import { ConcatenatingIndexer } from "./ConcatenatingIndexer";
import { XorIndexer } from "./XorIndexer";

describe("correlating indexers", () => {
  it("combines PC and history with XOR for gshare", () => {
    expect(
      new XorIndexer().resolveIndex(
        { order: 0, branchId: "B1", actual: "T", address: 0b1100 },
        { entries: 8, pcBits: 3, historyBits: 3, historyValue: 0b101 }
      )
    ).toMatchObject({
      index: 1,
      calculation: { policy: "xor", pcBits: "100", historyBits: "101", resultIndex: "1" }
    });
  });

  it("concatenates PC and history for gselect", () => {
    expect(
      new ConcatenatingIndexer().resolveIndex(
        { order: 0, branchId: "B1", actual: "T", address: 0b10 },
        { entries: 16, pcBits: 2, historyBits: 2, historyValue: 0b01 }
      )
    ).toMatchObject({
      index: 9,
      calculation: { policy: "concat", pcBits: "10", historyBits: "01", resultIndex: "9" }
    });
  });
});
