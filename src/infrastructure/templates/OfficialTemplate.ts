import type { BranchSequence } from "../../domain/simulation/BranchSequence";

export type TemplateVerificationStatus = "verified" | "draft";

export interface ExpectedTemplateStatistics {
  readonly hits?: number;
  readonly misses?: number;
  readonly hitRate?: number;
  readonly missRate?: number;
  readonly memoryBits?: number;
  readonly notes?: string;
}

export interface OfficialSolution {
  readonly summary: string;
  readonly stableFromStep?: number;
  readonly notes?: string;
}

export interface OfficialTemplateVariant {
  readonly id: string;
  readonly title: string;
  readonly predictorConfig: unknown;
  readonly initialState: string;
  readonly officialSolution: OfficialSolution;
  readonly expectedStatistics: ExpectedTemplateStatistics;
}

export interface OfficialTemplate {
  readonly id: string;
  readonly exerciseNumber: number;
  readonly verificationStatus: TemplateVerificationStatus;
  readonly title: string;
  readonly statement: string;
  readonly source: "ref_docs/Problemas.pdf";
  readonly pdfReference: string;
  readonly branchSequence: BranchSequence;
  readonly variants: readonly OfficialTemplateVariant[];
}
