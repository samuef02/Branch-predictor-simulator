import { describe, expect, it } from "vitest";
import { RiscVParser } from "./RiscVParser";

describe("RiscVParser", () => {
  it("detects supported conditional branches with addresses, labels and comments", () => {
    const program = new RiscVParser().parse(`
loop: 0x38 bge r4, r0, else # B1
      0x44 bnez r7, loop # B2
      add r1, r1, r2
`);

    expect(program.instructions).toHaveLength(3);
    expect(program.branches).toEqual([
      { id: "B1", address: 0x38, opcode: "bge", targetLabel: "else", lineNumber: 2 },
      { id: "B2", address: 0x44, opcode: "bnez", targetLabel: "loop", lineNumber: 3 }
    ]);
  });

  it("ignores comments and non-branch instructions", () => {
    const program = new RiscVParser().parse(`
# only a comment
0x10 addi r1, r1, 1
0x14 ble r1, r2, loop
`);

    expect(program.instructions.map((instruction) => instruction.opcode)).toEqual(["addi", "ble"]);
    expect(program.branches).toHaveLength(1);
  });
});
