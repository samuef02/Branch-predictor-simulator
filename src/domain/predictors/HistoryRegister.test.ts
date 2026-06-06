import { describe, expect, it } from "vitest";
import { HistoryRegister } from "./HistoryRegister";

describe("HistoryRegister", () => {
  it("shifts outcomes into a fixed-width register", () => {
    const history = new HistoryRegister(3, 0);

    expect(history.shiftIn("T").toBits()).toBe("001");
    expect(history.shiftIn("T").shiftIn("NT").shiftIn("T").toBits()).toBe("101");
    expect(new HistoryRegister(3, 7).shiftIn("T").toBits()).toBe("111");
  });

  it("rejects values outside the configured width", () => {
    expect(() => new HistoryRegister(2, 4)).toThrow(RangeError);
  });
});
