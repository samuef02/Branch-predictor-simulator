import { assertPositiveInteger, toBitString } from "../shared/BitString";
import type { BranchExecution } from "../simulation/BranchSequence";
import type { IndexCalculation } from "../predictors/BranchPredictor";

export interface XorIndexConfig {
  readonly entries: number;
  readonly pcBits: number;
  readonly historyBits: number;
  readonly historyValue: number;
  readonly ignoreLowBits?: number;
}

export interface XorIndexResult {
  readonly index: number;
  readonly calculation: IndexCalculation;
}

export class XorIndexer {
  resolveIndex(execution: BranchExecution, config: XorIndexConfig): XorIndexResult {
    assertPositiveInteger(config.entries, "entries");
    assertPositiveInteger(config.pcBits, "pcBits");
    assertPositiveInteger(config.historyBits, "historyBits");

    const address = execution.address;
    if (address === undefined || !Number.isInteger(address) || address < 0) {
      throw new Error(`branch ${execution.branchId} needs a non-negative address for XOR indexing`);
    }

    const ignored = config.ignoreLowBits ?? 0;
    const pcValue = Math.floor(address / 2 ** ignored) % 2 ** config.pcBits;
    const historyValue = config.historyValue % 2 ** config.historyBits;
    const index = (pcValue ^ historyValue) % config.entries;

    return {
      index,
      calculation: {
        policy: "xor",
        pcBits: toBitString(pcValue, config.pcBits),
        historyBits: toBitString(historyValue, config.historyBits),
        operation: "pc xor history",
        resultIndex: String(index)
      }
    };
  }
}
