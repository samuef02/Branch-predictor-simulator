import { assertPositiveInteger, toBitString } from "../shared/BitString";
import type { BranchExecution } from "../simulation/BranchSequence";
import type { IndexCalculation } from "../predictors/BranchPredictor";

export interface ConcatenatingIndexConfig {
  readonly entries: number;
  readonly pcBits: number;
  readonly historyBits: number;
  readonly historyValue: number;
  readonly ignoreLowBits?: number;
}

export interface ConcatenatingIndexResult {
  readonly index: number;
  readonly calculation: IndexCalculation;
}

export class ConcatenatingIndexer {
  resolveIndex(
    execution: BranchExecution,
    config: ConcatenatingIndexConfig
  ): ConcatenatingIndexResult {
    assertPositiveInteger(config.entries, "entries");
    assertPositiveInteger(config.pcBits, "pcBits");
    assertPositiveInteger(config.historyBits, "historyBits");

    const address = execution.address;
    if (address === undefined || !Number.isInteger(address) || address < 0) {
      throw new Error(`branch ${execution.branchId} needs a non-negative address for concat indexing`);
    }

    const ignored = config.ignoreLowBits ?? 0;
    const pcValue = Math.floor(address / 2 ** ignored) % 2 ** config.pcBits;
    const historyValue = config.historyValue % 2 ** config.historyBits;
    const rawIndex = pcValue * 2 ** config.historyBits + historyValue;
    const index = rawIndex % config.entries;

    return {
      index,
      calculation: {
        policy: "concat",
        pcBits: toBitString(pcValue, config.pcBits),
        historyBits: toBitString(historyValue, config.historyBits),
        operation: "pc || history",
        resultIndex: String(index)
      }
    };
  }
}
