import { describe, expect, it } from "vitest";
import { CTranslator } from "./CTranslator";
import { RiscVParser } from "./RiscVParser";

describe("CTranslator", () => {
  it("translates a simple counted C loop into didactic RISC-V", () => {
    const source = `
      #define N 10
      int a = 10;
      int i = 0;
      for (; i < N; i++) a -= i;
      printf(a);
    `;

    const result = new CTranslator().translate(source);

    expect(result.riscVSource).toContain("addi x5, x0, 10      # N = 10");
    expect(result.riscVSource).toContain("addi x6, x0, 10      # a = 10");
    expect(result.riscVSource).toContain("addi x7, x0, 0      # i = 0");
    expect(result.riscVSource).toContain("bge x7, x5, end      # B1: exit loop");
    expect(result.riscVSource).toContain("sub x6, x6, x7      # a -= i");
    expect(result.riscVSource).toContain("printf(...) omitted");
    expect(result.branchOutcomeHints).toEqual([
      { branchId: "B1", outcomes: ["NT", "NT", "NT", "NT", "NT", "NT", "NT", "NT", "NT", "NT", "T"] }
    ]);
  });

  it("generates RISC-V branches accepted by the parser", () => {
    const result = new CTranslator().translate("int a = 10; int i = 0; for (; i < 3; i++) a += i;");
    const program = new RiscVParser().parse(result.riscVSource);

    expect(program.branches).toEqual([
      expect.objectContaining({ id: "B1", opcode: "bge", targetLabel: "end" })
    ]);
  });

  it("reports unsupported input with an explicit diagnostic", () => {
    const result = new CTranslator().translate("int a = 1;");

    expect(result.diagnostics).toEqual([{ severity: "warning", message: "No supported for loop was found." }]);
  });
});
