import type { BranchExecution, BranchSequence, LoopRange } from "./BranchSequence";

export class SequenceExpander {
  expand(sequence: BranchSequence): readonly BranchExecution[] {
    const executions = [...sequence.executions].sort((a, b) => a.order - b.order);
    const loops = [...sequence.loops].sort((a, b) => a.startOrder - b.startOrder);
    const expanded: BranchExecution[] = [];

    let executionIndex = 0;
    for (const loop of loops) {
      this.validateLoop(loop, executions);

      while (
        executionIndex < executions.length &&
        executions[executionIndex].order < loop.startOrder
      ) {
        expanded.push(executions[executionIndex]);
        executionIndex += 1;
      }

      const range = executions.filter(
        (execution) => execution.order >= loop.startOrder && execution.order <= loop.endOrder
      );
      for (let repetition = 0; repetition < loop.repetitions; repetition += 1) {
        expanded.push(...range);
      }

      while (
        executionIndex < executions.length &&
        executions[executionIndex].order <= loop.endOrder
      ) {
        executionIndex += 1;
      }
    }

    while (executionIndex < executions.length) {
      expanded.push(executions[executionIndex]);
      executionIndex += 1;
    }

    return expanded;
  }

  expandRange(sequence: BranchSequence, loopRange: LoopRange): readonly BranchExecution[] {
    this.validateLoop(loopRange, sequence.executions);

    const range = sequence.executions.filter(
      (execution) => execution.order >= loopRange.startOrder && execution.order <= loopRange.endOrder
    );

    return Array.from({ length: loopRange.repetitions }, () => range).flat();
  }

  private validateLoop(loop: LoopRange, executions: readonly BranchExecution[]): void {
    if (!Number.isInteger(loop.startOrder) || !Number.isInteger(loop.endOrder)) {
      throw new RangeError("loop orders must be integers");
    }
    if (loop.startOrder > loop.endOrder) {
      throw new RangeError("loop startOrder must be before or equal to endOrder");
    }
    if (!Number.isInteger(loop.repetitions) || loop.repetitions < 1) {
      throw new RangeError("loop repetitions must be a positive integer");
    }

    const hasStart = executions.some((execution) => execution.order === loop.startOrder);
    const hasEnd = executions.some((execution) => execution.order === loop.endOrder);
    if (!hasStart || !hasEnd) {
      throw new Error("loop range must match existing execution orders");
    }
  }
}
