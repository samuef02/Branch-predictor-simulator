import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import { useSimulationStore } from "../stores/simulationStore";

export function DashboardShell() {
  const {
    templates,
    selectedTemplateId,
    mode,
    cSource,
    riscVSource,
    translationDiagnostics,
    currentStep,
    tableView,
    statistics,
    selectTemplate,
    updateCSource,
    setMode,
    step,
    runAll,
    reset,
    calculateStats
  } = useSimulationStore();
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const selectedVariant = selectedTemplate.variants[0];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="inherit" elevation={0}>
        <Toolbar sx={{ gap: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography component="h1" variant="h1" sx={{ flexGrow: 1 }}>
            Branch Predictor Simulator
          </Typography>
          <Tabs
            value={mode}
            aria-label="Modo de trabajo"
            onChange={(_event, value: "exam" | "solution") => setMode(value)}
          >
            <Tab value="exam" label="Examen" />
            <Tab value="solution" label="Solucion" />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
          gap: 2,
          p: 2
        }}
      >
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2
            }}
          >
            <EditorPanel title="C didactico" value={cSource} onChange={updateCSource} />
            <EditorPanel title="RISC-V" value={riscVSource} readOnly />
          </Box>
          {translationDiagnostics.length > 0 ? (
            <Stack spacing={1}>
              {translationDiagnostics.map((diagnostic) => (
                <Alert key={`${diagnostic.severity}-${diagnostic.message}`} severity={diagnostic.severity}>
                  {diagnostic.message}
                </Alert>
              ))}
            </Stack>
          ) : undefined}

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Stack direction="row" spacing={1} sx={{ p: 1.5, alignItems: "center" }}>
              <Button startIcon={<PlayArrowIcon />} variant="contained" onClick={step}>
                Paso
              </Button>
              <Button startIcon={<SkipNextIcon />} variant="outlined" onClick={runAll}>
                Todo
              </Button>
              <Button startIcon={<RestartAltIcon />} variant="outlined" color="inherit" onClick={reset}>
                Reiniciar
              </Button>
              <Typography sx={{ ml: "auto" }} variant="body2">
                Paso {currentStep} / {selectedTemplate.branchSequence.executions.length}
              </Typography>
            </Stack>
            <Divider />
            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                aria-label="Tabla de simulacion"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  "& th, & td": {
                    p: 1.25,
                    borderBottom: 1,
                    borderColor: "divider",
                    textAlign: "left",
                    whiteSpace: "nowrap"
                  },
                  "& th": { bgcolor: "#eef3f3", fontWeight: 500 }
                }}
              >
                <thead>
                  <tr>
                    {tableView.columns.map((column) => (
                      <th key={column.id}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableView.rows.length === 0 ? (
                    <tr>
                      <td colSpan={tableView.columns.length}>Sin pasos ejecutados</td>
                    </tr>
                  ) : (
                    tableView.rows.map((row) => (
                      <tr key={row.id}>
                        {tableView.columns.map((column) => (
                          <td key={column.id}>{row.cells[column.id]?.value}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        </Stack>

        <Paper
          variant="outlined"
          sx={{ p: 2, alignSelf: "start", position: { lg: "sticky" }, top: { lg: 16 } }}
        >
          <Stack spacing={2}>
            <Typography component="h2" variant="h2">
              Configuracion
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="template-label">Plantilla</InputLabel>
              <Select
                labelId="template-label"
                label="Plantilla"
                value={selectedTemplateId}
                onChange={(event) => selectTemplate(event.target.value)}
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Variante" size="small" value={selectedVariant.title} InputProps={{ readOnly: true }} />
            <TextField
              label="Enunciado"
              size="small"
              value={selectedTemplate.statement}
              multiline
              minRows={3}
              InputProps={{ readOnly: true }}
            />
            <Divider />
            <Typography component="h2" variant="h2">
              Estadisticas
            </Typography>
            <TextField label="Aciertos" size="small" value={statistics?.hits ?? ""} InputProps={{ readOnly: true }} />
            <TextField label="Fallos" size="small" value={statistics?.misses ?? ""} InputProps={{ readOnly: true }} />
            <TextField
              label="Tasa acierto"
              size="small"
              value={statistics ? `${(statistics.hitRate.value * 100).toFixed(2)}%` : ""}
              InputProps={{ readOnly: true }}
            />
            <Button variant="contained" onClick={calculateStats}>
              Calcular
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

function EditorPanel({
  title,
  value,
  readOnly = false,
  onChange
}: {
  readonly title: string;
  readonly value: string;
  readonly readOnly?: boolean;
  readonly onChange?: (value: string) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ px: 1.5, py: 1, bgcolor: "#eef3f3", borderBottom: 1, borderColor: "divider" }}>
        <Typography component="h2" variant="h2">
          {title}
        </Typography>
      </Box>
      <TextField
        multiline
        fullWidth
        minRows={8}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        InputProps={{
          readOnly,
          sx: {
            fontFamily: '"Roboto Mono", Consolas, monospace',
            fontSize: "0.875rem",
            alignItems: "flex-start"
          }
        }}
      />
    </Paper>
  );
}
