import { parse, stringify } from "yaml";
import { z } from "zod";
import type { BranchSequence } from "../../domain/simulation/BranchSequence";
import { SourceSyncPolicy, type SourceBundle } from "../../domain/source/SourceBundle";

const outcomeSchema = z.union([z.literal("T"), z.literal("NT")]);
const branchExecutionSchema = z.object({
  order: z.number().int().nonnegative(),
  branchId: z.string(),
  actual: outcomeSchema,
  address: z.number().int().nonnegative().optional(),
  manualIndex: z.number().int().nonnegative().optional(),
  comment: z.string().optional()
});
const loopRangeSchema = z.object({
  startOrder: z.number().int().nonnegative(),
  endOrder: z.number().int().nonnegative(),
  repetitions: z.number().int().positive()
});
const sessionYamlSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  language: z.union([z.literal("es"), z.literal("en")]),
  mode: z.union([z.literal("exam"), z.literal("solution")]),
  predictorConfig: z.any(),
  source: z.object({
    cSource: z.string().optional(),
    riscVSource: z.string(),
    syncState: z.union([z.literal("synced"), z.literal("desynced")])
  }),
  branchSequence: z.object({
    executions: z.array(branchExecutionSchema),
    loops: z.array(loopRangeSchema)
  }),
  userSolution: z.any().optional()
});

export type SessionYamlDto = z.infer<typeof sessionYamlSchema>;

export interface StudySessionDraft {
  readonly version: 1;
  readonly title: string;
  readonly language: "es" | "en";
  readonly mode: "exam" | "solution";
  readonly predictorConfig: unknown;
  readonly source: SourceBundle;
  readonly branchSequence: BranchSequence;
  readonly userSolution?: unknown;
}

export class SessionYamlMapper {
  constructor(private readonly sourceSyncPolicy = new SourceSyncPolicy()) {}

  toYaml(session: StudySessionDraft): string {
    const dto = this.toDto(session);
    return stringify(dto);
  }

  fromYaml(document: string): StudySessionDraft {
    const dto = sessionYamlSchema.parse(parse(document));
    return {
      version: dto.version,
      title: dto.title,
      language: dto.language,
      mode: dto.mode,
      predictorConfig: dto.predictorConfig,
      source: dto.source,
      branchSequence: {
        executions: dto.branchSequence.executions,
        loops: dto.branchSequence.loops
      },
      userSolution: dto.userSolution
    };
  }

  toDto(session: StudySessionDraft): SessionYamlDto {
    return sessionYamlSchema.parse({
      ...session,
      source: this.sourceSyncPolicy.removeNonPersistableC(session.source)
    });
  }
}
