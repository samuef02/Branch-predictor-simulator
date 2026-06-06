import { describe, expect, it } from "vitest";
import { SessionYamlMapper, type StudySessionDraft } from "./SessionYamlMapper";

const session: StudySessionDraft = {
  version: 1,
  title: "Exercise 1",
  language: "es",
  mode: "exam",
  predictorConfig: {
    type: "one-level",
    counterBits: 2,
    entries: 2,
    initialCounterValue: 1,
    indexPolicy: { type: "manual", entries: 2 }
  },
  source: {
    cSource: "while (i < 10) {}",
    riscVSource: "0x10 bne r1, r2, loop # B1",
    syncState: "desynced"
  },
  branchSequence: {
    executions: [{ order: 0, branchId: "B1", actual: "T", manualIndex: 0 }],
    loops: [{ startOrder: 0, endOrder: 0, repetitions: 10 }]
  },
  userSolution: {
    tableAnswers: [{ step: 1, prediction: "T" }]
  }
};

describe("SessionYamlMapper", () => {
  it("exports YAML without derived data or desynced C source", () => {
    const dto = new SessionYamlMapper().toDto(session);

    expect(dto.source.cSource).toBeUndefined();
    expect(dto.branchSequence.executions).toHaveLength(1);
    expect(dto).not.toHaveProperty("trace");
    expect(dto).not.toHaveProperty("statistics");
  });

  it("round-trips user input through YAML", () => {
    const mapper = new SessionYamlMapper();
    const restored = mapper.fromYaml(mapper.toYaml({ ...session, source: { ...session.source, syncState: "synced" } }));

    expect(restored.source.cSource).toBe("while (i < 10) {}");
    expect(restored.branchSequence.loops[0].repetitions).toBe(10);
    expect(restored.userSolution).toEqual(session.userSolution);
  });
});
