import { create } from "zustand";
import {
  CTranslator,
  PredictorFactory,
  SimulationEngine,
  StatsCalculator,
  TableProjector,
  type CTranslationDiagnostic,
  type DynamicTableView,
  type SessionMode,
  type StatisticsSet,
  type TraceStep
} from "../../application";
import type { OfficialTemplate, OfficialTemplateVariant } from "../../infrastructure/templates/OfficialTemplate";
import { officialTemplates } from "../../infrastructure/templates/officialTemplates";

interface SimulationStoreState {
  readonly templates: readonly OfficialTemplate[];
  readonly selectedTemplateId: string;
  readonly selectedVariantId: string;
  readonly mode: SessionMode;
  readonly cSource: string;
  readonly riscVSource: string;
  readonly translationDiagnostics: readonly CTranslationDiagnostic[];
  readonly currentStep: number;
  readonly trace: readonly TraceStep[];
  readonly tableView: DynamicTableView;
  readonly statistics?: StatisticsSet;
  readonly selectTemplate: (templateId: string) => void;
  readonly updateCSource: (source: string) => void;
  readonly setMode: (mode: SessionMode) => void;
  readonly step: () => void;
  readonly runAll: () => void;
  readonly reset: () => void;
  readonly calculateStats: () => void;
}

const tableProjector = new TableProjector();
const predictorFactory = new PredictorFactory();
const cTranslator = new CTranslator();

const initialTemplate = officialTemplates[0];
const initialVariant = initialTemplate.variants[0];
const initialCSource = `#define N 10
int a = 10;
int i = 0;
for (; i < N; i++) a -= i;
printf(a);`;
const initialTranslation = cTranslator.translate(initialCSource);

export const useSimulationStore = create<SimulationStoreState>((set, get) => ({
  templates: officialTemplates,
  selectedTemplateId: initialTemplate.id,
  selectedVariantId: initialVariant.id,
  mode: "exam",
  cSource: initialCSource,
  riscVSource: initialTranslation.riscVSource,
  translationDiagnostics: initialTranslation.diagnostics,
  currentStep: 0,
  trace: [],
  tableView: project([], "exam"),
  selectTemplate: (templateId) => {
    const template = officialTemplates.find((candidate) => candidate.id === templateId) ?? initialTemplate;
    set({
      selectedTemplateId: template.id,
      selectedVariantId: template.variants[0].id,
      currentStep: 0,
      trace: [],
      statistics: undefined,
      tableView: project([], get().mode)
    });
  },
  updateCSource: (source) => {
    const translation = translateSafely(source);
    set({
      cSource: source,
      riscVSource: translation.riscVSource,
      translationDiagnostics: translation.diagnostics
    });
  },
  setMode: (mode) => {
    set({ mode, tableView: project(get().trace, mode) });
  },
  step: () => {
    const { template, variant } = getSelected(get());
    const trace = runTrace(template, variant, get().currentStep + 1);
    set({
      currentStep: trace.length,
      trace,
      statistics: undefined,
      tableView: project(trace, get().mode)
    });
  },
  runAll: () => {
    const { template, variant } = getSelected(get());
    const trace = runTrace(template, variant);
    set({
      currentStep: trace.length,
      trace,
      statistics: undefined,
      tableView: project(trace, get().mode)
    });
  },
  reset: () => {
    set({
      currentStep: 0,
      trace: [],
      statistics: undefined,
      tableView: project([], get().mode)
    });
  },
  calculateStats: () => {
    const { variant } = getSelected(get());
    const predictor = predictorFactory.create(variant.predictorConfig);
    const memoryUsage =
      predictor && "memoryUsage" in predictor
        ? (predictor.memoryUsage as (config: unknown) => { bits: number; entries: number })(
            variant.predictorConfig
          )
        : undefined;
    set({
      statistics: new StatsCalculator().calculate(get().trace, memoryUsage)
    });
  }
}));

function getSelected(state: SimulationStoreState) {
  const template =
    state.templates.find((candidate) => candidate.id === state.selectedTemplateId) ?? initialTemplate;
  const variant =
    template.variants.find((candidate) => candidate.id === state.selectedVariantId) ??
    template.variants[0];

  return { template, variant };
}

function runTrace(
  template: OfficialTemplate,
  variant: OfficialTemplateVariant,
  limit = template.branchSequence.executions.length
) {
  const predictor = predictorFactory.create(variant.predictorConfig);
  if (!predictor) {
    return [];
  }

  const limitedSequence = {
    executions: template.branchSequence.executions.slice(0, limit),
    loops: []
  };
  const engine = new SimulationEngine();
  return engine.runToCompletion(
    engine.initialise(limitedSequence, predictor as never, variant.predictorConfig as never),
    predictor as never
  ).trace;
}

function project(trace: readonly TraceStep[], mode: SessionMode) {
  return tableProjector.project(trace, { mode, language: "es", revealSolution: mode === "solution" });
}

function translateSafely(source: string) {
  try {
    return cTranslator.translate(source);
  } catch (error) {
    return {
      riscVSource: "",
      diagnostics: [
        {
          severity: "warning" as const,
          message: error instanceof Error ? error.message : "C source could not be translated."
        }
      ],
      branchOutcomeHints: []
    };
  }
}
