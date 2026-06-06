import { PredictorFactory } from "../../domain/predictors/PredictorFactory";
import { SimulationEngine } from "../../domain/simulation/SimulationEngine";
import { StatsCalculator } from "../../domain/stats/StatsCalculator";
import type { OfficialTemplate, OfficialTemplateVariant } from "./OfficialTemplate";
import { officialTemplateSchema } from "./OfficialTemplateSchema";

export interface TemplateValidationReport {
  readonly templateId: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export class TemplateValidator {
  constructor(private readonly predictorFactory = new PredictorFactory()) {}

  validate(template: OfficialTemplate): TemplateValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];
    const schemaResult = officialTemplateSchema.safeParse(template);

    if (!schemaResult.success) {
      errors.push(...schemaResult.error.issues.map((issue) => issue.message));
    }

    if (template.exerciseNumber === 6) {
      errors.push("exercise 6 is excluded from v1 because it requires Tournament");
    }
    if (template.branchSequence.executions.length === 0) {
      errors.push("template must include a branch sequence");
    }
    if (template.variants.length === 0) {
      errors.push("template must include at least one predictor variant");
    }

    for (const variant of template.variants) {
      const variantResult = this.validateVariant(template, variant);
      errors.push(...variantResult.errors);
      warnings.push(...variantResult.warnings);
    }

    return {
      templateId: template.id,
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateVariant(
    template: OfficialTemplate,
    variant: OfficialTemplateVariant
  ): { errors: string[]; warnings: string[] } {
    const predictor = this.predictorFactory.create(variant.predictorConfig);
    if (!predictor) {
      return { errors: [`${variant.id}: predictor config is not executable yet`], warnings: [] };
    }

    const engine = new SimulationEngine();
    const run = engine.runToCompletion(
      engine.initialise(template.branchSequence, predictor as never, variant.predictorConfig as never),
      predictor as never
    );
    const memoryUsage =
      "memoryUsage" in predictor
        ? (predictor.memoryUsage as (config: unknown) => { bits: number; entries: number })(
            variant.predictorConfig
          )
        : undefined;
    const stats = new StatsCalculator().calculate(run.trace, memoryUsage);
    const expected = variant.expectedStatistics;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (expected.hits !== undefined && expected.hits !== stats.hits) {
      this.addDiscrepancy(template, `${variant.id}: expected ${expected.hits} hits, engine produced ${stats.hits}`, errors, warnings);
    }
    if (expected.misses !== undefined && expected.misses !== stats.misses) {
      this.addDiscrepancy(template, `${variant.id}: expected ${expected.misses} misses, engine produced ${stats.misses}`, errors, warnings);
    }
    if (expected.memoryBits !== undefined && expected.memoryBits !== stats.memoryBits) {
      this.addDiscrepancy(template, `${variant.id}: expected ${expected.memoryBits} memory bits, engine produced ${stats.memoryBits}`, errors, warnings);
    }

    return { errors, warnings };
  }

  private addDiscrepancy(
    template: OfficialTemplate,
    message: string,
    errors: string[],
    warnings: string[]
  ): void {
    if (template.verificationStatus === "verified") {
      errors.push(message);
      return;
    }

    warnings.push(message);
  }
}
