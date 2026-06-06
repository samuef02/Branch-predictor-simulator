import { describe, expect, it } from "vitest";
import { SourceSyncPolicy, type SourceBundle } from "./SourceBundle";

describe("SourceSyncPolicy", () => {
  it("blocks C editing and removes C from persistence when RISC-V is desynced", () => {
    const policy = new SourceSyncPolicy();
    const source: SourceBundle = {
      cSource: "for (;;) {}",
      riscVSource: "bne r1, r2, loop",
      syncState: "synced"
    };
    const desynced = policy.markDesynced(source);

    expect(policy.canEditC(desynced)).toBe(false);
    expect(policy.removeNonPersistableC(desynced)).toEqual({
      riscVSource: "bne r1, r2, loop",
      syncState: "desynced"
    });
  });
});
