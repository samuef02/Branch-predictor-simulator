export interface Instruction {
  readonly address?: number;
  readonly label?: string;
  readonly opcode: string;
  readonly operands: readonly string[];
  readonly rawText: string;
  readonly lineNumber: number;
}

export interface Branch {
  readonly id: string;
  readonly address?: number;
  readonly opcode: string;
  readonly targetLabel?: string;
  readonly lineNumber: number;
}

export interface RiscVProgram {
  readonly instructions: readonly Instruction[];
  readonly branches: readonly Branch[];
}
