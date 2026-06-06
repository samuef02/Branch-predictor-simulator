import { create } from "zustand";
import {
  CTranslator,
  PredictorFactory,
  SimulationEngine,
  StatsCalculator,
  TableProjector,
  type CTranslationDiagnostic,
  type BranchSequence,
  type DynamicTableView,
  type SessionMode,
  type StatisticsSet,
  type TraceStep
} from "../../application";
import type { OfficialTemplate } from "../../infrastructure/templates/OfficialTemplate";
import { officialTemplates } from "../../infrastructure/templates/officialTemplates";
import { CsvTableExporter, MarkdownTableExporter } from "../../infrastructure/export/TableExporters";
import { SessionYamlMapper } from "../../infrastructure/persistence/SessionYamlMapper";

export type TableExportFormat = "csv" | "markdown";

interface SimulationStoreState {
  readonly templates: readonly OfficialTemplate[];
  readonly selectedTemplateId: string;
  readonly selectedVariantId: string;
  readonly activeTitle: string;
  readonly activeStatement: string;
  readonly activeVariantTitle: string;
  readonly activeBranchSequence: BranchSequence;
  readonly activePredictorConfig: unknown;
  readonly mode: SessionMode;
  readonly cSource: string;
  readonly riscVSource: string;
  readonly sessionYamlInput: string;
  readonly sessionImportError?: string;
  readonly translationDiagnostics: readonly CTranslationDiagnostic[];
  readonly currentStep: number;
  readonly trace: readonly TraceStep[];
  readonly tableView: DynamicTableView;
  readonly exportedTable?: string;
  readonly exportedSessionYaml?: string;
  readonly statistics?: StatisticsSet;
  readonly selectTemplate: (templateId: string) => void;
  readonly updateCSource: (source: string) => void;
  readonly updateSessionYamlInput: (source: string) => void;
  readonly importSessionYaml: () => void;
  readonly setMode: (mode: SessionMode) => void;
  readonly step: () => void;
  readonly runAll: () => void;
  readonly reset: () => void;
  readonly calculateStats: () => void;
  readonly exportTable: (format: TableExportFormat) => void;
  readonly exportSessionYaml: () => void;
}

const tableProjector = new TableProjector();
const predictorFactory = new PredictorFactory();
const cTranslator = new CTranslator();
const sessionYamlMapper = new SessionYamlMapper();
const tableExporters: Record<TableExportFormat, { export: (tableView: DynamicTableView) => string }> = {
  csv: new CsvTableExporter(),
  markdown: new MarkdownTableExporter()
};

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
  activeTitle: initialTemplate.title,
  activeStatement: initialTemplate.statement,
  activeVariantTitle: initialVariant.title,
  activeBranchSequence: initialTemplate.branchSequence,
  activePredictorConfig: initialVariant.predictorConfig,
  mode: "exam",
  cSource: initialCSource,
  riscVSource: initialTranslation.riscVSource,
  sessionYamlInput: "",
  translationDiagnostics: initialTranslation.diagnostics,
  currentStep: 0,
  trace: [],
  tableView: project([], "exam"),
  selectTemplate: (templateId) => {
    const template = officialTemplates.find((candidate) => candidate.id === templateId) ?? initialTemplate;
    set({
      selectedTemplateId: template.id,
      selectedVariantId: template.variants[0].id,
      activeTitle: template.title,
      activeStatement: template.statement,
      activeVariantTitle: template.variants[0].title,
      activeBranchSequence: template.branchSequence,
      activePredictorConfig: template.variants[0].predictorConfig,
      currentStep: 0,
      trace: [],
      statistics: undefined,
      exportedTable: undefined,
      exportedSessionYaml: undefined,
      sessionImportError: undefined,
      tableView: project([], get().mode)
    });
  },
  updateCSource: (source) => {
    const translation = translateSafely(source);
    set({
      cSource: source,
      riscVSource: translation.riscVSource,
      translationDiagnostics: translation.diagnostics,
      exportedSessionYaml: undefined
    });
  },
  updateSessionYamlInput: (source) => {
    set({ sessionYamlInput: source, sessionImportError: undefined });
  },
  importSessionYaml: () => {
    try {
      const session = sessionYamlMapper.fromYaml(get().sessionYamlInput);
      set({
        activeTitle: session.title,
        activeStatement: "Sesion importada desde YAML.",
        activeVariantTitle: "Configuracion importada",
        activeBranchSequence: session.branchSequence,
        activePredictorConfig: session.predictorConfig,
        mode: session.mode,
        cSource: session.source.cSource ?? "",
        riscVSource: session.source.riscVSource,
        translationDiagnostics: [],
        currentStep: 0,
        trace: [],
        statistics: undefined,
        exportedTable: undefined,
        exportedSessionYaml: undefined,
        sessionImportError: undefined,
        tableView: project([], session.mode)
      });
    } catch (error) {
      set({
        sessionImportError: error instanceof Error ? error.message : "No se pudo importar la sesion YAML."
      });
    }
  },
  setMode: (mode) => {
    set({ mode, tableView: project(get().trace, mode) });
  },
  step: () => {
    const state = get();
    const trace = runTrace(state.activeBranchSequence, state.activePredictorConfig, state.currentStep + 1);
    set({
      currentStep: trace.length,
      trace,
      statistics: undefined,
      exportedTable: undefined,
      exportedSessionYaml: undefined,
      tableView: project(trace, get().mode)
    });
  },
  runAll: () => {
    const state = get();
    const trace = runTrace(state.activeBranchSequence, state.activePredictorConfig);
    set({
      currentStep: trace.length,
      trace,
      statistics: undefined,
      exportedTable: undefined,
      exportedSessionYaml: undefined,
      tableView: project(trace, get().mode)
    });
  },
  reset: () => {
    set({
      currentStep: 0,
      trace: [],
      statistics: undefined,
      exportedTable: undefined,
      exportedSessionYaml: undefined,
      tableView: project([], get().mode)
    });
  },
  calculateStats: () => {
    const predictorConfig = get().activePredictorConfig;
    const predictor = predictorFactory.create(predictorConfig);
    const memoryUsage =
      predictor && "memoryUsage" in predictor
        ? (predictor.memoryUsage as (config: unknown) => { bits: number; entries: number })(
            predictorConfig
          )
        : undefined;
    set({
      statistics: new StatsCalculator().calculate(get().trace, memoryUsage)
    });
  },
  exportTable: (format) => {
    set({ exportedTable: tableExporters[format].export(get().tableView) });
  },
  exportSessionYaml: () => {
    const state = get();
    set({
      exportedSessionYaml: sessionYamlMapper.toYaml({
        version: 1,
        title: state.activeTitle,
        language: "es",
        mode: state.mode,
        predictorConfig: state.activePredictorConfig,
        source: {
          cSource: state.cSource,
          riscVSource: state.riscVSource,
          syncState: "synced"
        },
        branchSequence: state.activeBranchSequence
      })
    });
  }
}));

function runTrace(
  branchSequence: BranchSequence,
  predictorConfig: unknown,
  limit = branchSequence.executions.length
) {
  const predictor = predictorFactory.create(predictorConfig);
  if (!predictor) {
    return [];
  }

  const limitedSequence = {
    executions: branchSequence.executions.slice(0, limit),
    loops: []
  };
  const engine = new SimulationEngine();
  return engine.runToCompletion(
    engine.initialise(limitedSequence, predictor as never, predictorConfig as never),
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
