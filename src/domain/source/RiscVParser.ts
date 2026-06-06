import type { Branch, Instruction, RiscVProgram } from "./RiscVProgram";

const branchOpcodes = new Set(["beq", "bne", "blt", "bge", "bgt", "ble", "beqz", "bnez"]);

export class RiscVParser {
  parse(source: string): RiscVProgram {
    const instructions: Instruction[] = [];
    const branches: Branch[] = [];

    source.split(/\r?\n/).forEach((line, index) => {
      const parsed = this.parseLine(line, index + 1);
      if (!parsed) {
        return;
      }

      instructions.push(parsed.instruction);
      if (parsed.branch) {
        branches.push(parsed.branch);
      }
    });

    return { instructions, branches };
  }

  private parseLine(
    line: string,
    lineNumber: number
  ): { instruction: Instruction; branch?: Branch } | undefined {
    const [codePart, commentPart = ""] = line.split("#", 2);
    let code = codePart.trim();
    if (code.length === 0) {
      return undefined;
    }

    const labelMatch = code.match(/^([A-Za-z_.$][\w.$]*):\s*(.*)$/);
    const label = labelMatch?.[1];
    if (labelMatch) {
      code = labelMatch[2].trim();
      if (code.length === 0) {
        return undefined;
      }
    }

    const addressMatch = code.match(/^(0x[0-9a-fA-F]+|\d+)\s+(.+)$/);
    const address = addressMatch ? Number(addressMatch[1]) : undefined;
    const instructionText = addressMatch ? addressMatch[2] : code;
    const [opcodeRaw = "", ...operandParts] = instructionText.trim().split(/\s+/);
    const opcode = opcodeRaw.toLowerCase();
    const operands = operandParts.join(" ").split(",").map((operand) => operand.trim()).filter(Boolean);
    const instruction: Instruction = {
      address,
      label,
      opcode,
      operands,
      rawText: line,
      lineNumber
    };

    if (!branchOpcodes.has(opcode)) {
      return { instruction };
    }

    const idMatch = commentPart.match(/\bB\d+\b/i);
    const branchId = idMatch?.[0].toUpperCase() ?? `B${this.nextBranchNumber(lineNumber)}`;
    const branch: Branch = {
      id: branchId,
      address,
      opcode,
      targetLabel: operands.length > 0 ? operands[operands.length - 1] : undefined,
      lineNumber
    };

    return { instruction, branch };
  }

  private nextBranchNumber(lineNumber: number): number {
    return lineNumber;
  }
}
