export interface CTranslationDiagnostic {
  readonly severity: "info" | "warning";
  readonly message: string;
}

export interface BranchOutcomeHint {
  readonly branchId: string;
  readonly outcomes: readonly ("T" | "NT")[];
}

export interface CTranslationResult {
  readonly riscVSource: string;
  readonly diagnostics: readonly CTranslationDiagnostic[];
  readonly branchOutcomeHints: readonly BranchOutcomeHint[];
}

interface SymbolEntry {
  readonly name: string;
  readonly register: string;
  readonly value?: number;
  readonly kind: "constant" | "variable";
}

interface ForLoopMatch {
  readonly iterator: string;
  readonly operator: "<" | "<=" | ">" | ">=";
  readonly bound: string;
  readonly incrementVariable: string;
  readonly body: string;
}

const allocatableRegisters = ["x5", "x6", "x7", "x8", "x9", "x10", "x11", "x12"];

export class CTranslator {
  translate(source: string): CTranslationResult {
    const diagnostics: CTranslationDiagnostic[] = [];
    const symbols = new Map<string, SymbolEntry>();
    const lines: string[] = [];
    let nextRegister = 0;
    let address = 0;

    const emit = (instruction: string) => {
      lines.push(`${formatAddress(address)} ${instruction}`);
      address += 4;
    };
    const allocate = (name: string, kind: SymbolEntry["kind"], value?: number) => {
      const existing = symbols.get(name);
      if (existing) {
        return existing;
      }
      const register = allocatableRegisters[nextRegister];
      if (!register) {
        throw new Error("didactic C translator ran out of registers");
      }
      nextRegister += 1;
      const entry = { name, register, value, kind };
      symbols.set(name, entry);
      return entry;
    };

    const normalized = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const define of normalized.matchAll(/^\s*#define\s+([A-Za-z_]\w*)\s+(-?\d+)\s*$/gm)) {
      const [, name, valueRaw] = define;
      const value = Number(valueRaw);
      const symbol = allocate(name, "constant", value);
      emit(`addi ${symbol.register}, x0, ${value}      # ${name} = ${value}`);
    }

    const loop = this.parseFirstForLoop(normalized);
    const beforeLoop = loop ? normalized.slice(0, normalized.indexOf("for")) : normalized;
    for (const declaration of beforeLoop.matchAll(/\bint\s+([A-Za-z_]\w*)\s*=\s*(-?\d+)\s*;?/g)) {
      const [, name, valueRaw] = declaration;
      const value = Number(valueRaw);
      const symbol = allocate(name, "variable", value);
      emit(`addi ${symbol.register}, x0, ${value}      # ${name} = ${value}`);
    }

    const branchOutcomeHints: BranchOutcomeHint[] = [];
    if (loop) {
      const iterator = symbols.get(loop.iterator);
      const bound = this.resolveSymbolOrLiteral(loop.bound, symbols, allocate, emit);
      if (!iterator) {
        throw new Error(`loop iterator ${loop.iterator} must be declared before the for loop`);
      }
      if (loop.incrementVariable !== loop.iterator) {
        throw new Error("didactic C translator only supports for loops incrementing their iterator");
      }

      const exitBranch = this.exitBranchFor(loop.operator);
      lines.push("");
      lines.push("loop:");
      emit(`${exitBranch.opcode} ${iterator.register}, ${bound.register}, end      # B1: exit loop`);
      this.emitBody(loop.body, symbols, emit);
      emit(`addi ${iterator.register}, ${iterator.register}, 1      # ${loop.iterator}++`);
      emit("jal x0, loop      # control-flow helper, not a predictor branch");
      lines.push("end:");

      const outcomes = this.outcomeHint(iterator.value, bound.value, loop.operator);
      if (outcomes.length > 0) {
        branchOutcomeHints.push({ branchId: "B1", outcomes });
      }
    } else {
      diagnostics.push({ severity: "warning", message: "No supported for loop was found." });
    }

    if (/\bprintf\s*\(/.test(normalized)) {
      lines.push("# printf(...) omitted: real C runtime is outside the v1 didactic subset");
      diagnostics.push({
        severity: "info",
        message: "printf is omitted because v1 does not model the real C runtime."
      });
    }

    return { riscVSource: lines.join("\n"), diagnostics, branchOutcomeHints };
  }

  private parseFirstForLoop(source: string): ForLoopMatch | undefined {
    const match = source.match(
      /for\s*\(\s*;\s*([A-Za-z_]\w*)\s*(<|<=|>|>=)\s*([A-Za-z_]\w*|-?\d+)\s*;\s*([A-Za-z_]\w*)\s*\+\+\s*\)\s*([^;]+);?/
    );
    if (!match) {
      return undefined;
    }

    return {
      iterator: match[1],
      operator: match[2] as ForLoopMatch["operator"],
      bound: match[3],
      incrementVariable: match[4],
      body: match[5].trim()
    };
  }

  private resolveSymbolOrLiteral(
    raw: string,
    symbols: ReadonlyMap<string, SymbolEntry>,
    allocate: (name: string, kind: SymbolEntry["kind"], value?: number) => SymbolEntry,
    emit: (instruction: string) => void
  ): SymbolEntry {
    const existing = symbols.get(raw);
    if (existing) {
      return existing;
    }
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`unknown loop bound ${raw}`);
    }

    const value = Number(raw);
    const symbol = allocate(`literal_${raw.replace("-", "minus_")}`, "constant", value);
    emit(`addi ${symbol.register}, x0, ${value}      # loop bound ${value}`);
    return symbol;
  }

  private exitBranchFor(operator: ForLoopMatch["operator"]): { opcode: string } {
    switch (operator) {
      case "<":
        return { opcode: "bge" };
      case "<=":
        return { opcode: "bgt" };
      case ">":
        return { opcode: "ble" };
      case ">=":
        return { opcode: "blt" };
    }
  }

  private emitBody(
    body: string,
    symbols: ReadonlyMap<string, SymbolEntry>,
    emit: (instruction: string) => void
  ): void {
    const compound = body.match(/^([A-Za-z_]\w*)\s*([-+])=\s*([A-Za-z_]\w*|-?\d+)$/);
    if (!compound) {
      throw new Error(`unsupported for-loop body: ${body}`);
    }

    const [, targetName, operator, operandRaw] = compound;
    const target = symbols.get(targetName);
    if (!target) {
      throw new Error(`unknown assignment target ${targetName}`);
    }
    const operand = symbols.get(operandRaw);
    if (!operand) {
      throw new Error(`unknown assignment operand ${operandRaw}`);
    }

    const opcode = operator === "+" ? "add" : "sub";
    emit(`${opcode} ${target.register}, ${target.register}, ${operand.register}      # ${body}`);
  }

  private outcomeHint(
    initialIterator: number | undefined,
    bound: number | undefined,
    operator: ForLoopMatch["operator"]
  ): readonly ("T" | "NT")[] {
    if (initialIterator === undefined || bound === undefined || initialIterator < 0 || bound < initialIterator) {
      return [];
    }

    const iterations = operator === "<=" ? bound - initialIterator + 1 : bound - initialIterator;
    if ((operator === "<" || operator === "<=") && iterations >= 0) {
      return [...Array(iterations).fill("NT"), "T"];
    }
    return [];
  }
}

function formatAddress(address: number): string {
  return `0x${address.toString(16).padStart(2, "0")}`;
}
