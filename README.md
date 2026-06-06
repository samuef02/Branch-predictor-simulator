# Branch Predictor Simulator

Local web application for studying and solving branch predictor exercises from the Computer Structure course at Universidad Complutense de Madrid.

The simulator will allow users to work from didactic C, RISC-V assembly, or a manual branch sequence, then inspect predictions, predictor state transitions, hit/miss results, statistics, and official exercise solutions.

## Source Of Truth

The current reference documents are:

- `REQUISITOS.md`: functional scope and v1 requirements.
- `ARQUITECTURA.md`: domain model, use cases, architecture and design patterns.
- `Documentos externos/Problemas.pdf`: official branch predictor exercises and solutions.
- Theory PDF in `Documentos externos/`: reference material for RISC-V and branch prediction.

`REQUISITOS.md` and `ARQUITECTURA.md` are the main source of truth for implementation decisions.

## Planned Stack

- TypeScript
- Vite
- React
- MUI Material UI
- Zustand
- TanStack Table
- Monaco Editor
- Zod
- YAML
- i18next
- Vitest
- Playwright

Technical rationale and Codex agent roles are documented in `DECISIONES_TECNICAS_Y_AGENTES.md` and `.codex/AGENTES.md`.

## V1 Scope

The first version focuses on:

- One-level predictors with configurable saturating counters.
- Two-level predictors `(n,m)`.
- Global correlated predictors.
- `gshare`.
- `gselect`.
- Classic local correlated predictors.
- Official templates for exercises 1, 2, 3, 4, 5 and 7.
- Step-by-step and full simulation.
- Manual table filling and correction.
- YAML import/export.
- Spanish and British English UI.

Future work includes Tournament, TAGE, detailed pipeline simulation, ROB, return address stack and misprediction penalties.

## Development Status

The project is currently in architecture and scaffold preparation. The implementation will start by creating the Vite + React + TypeScript app and separating the code into domain, application, infrastructure and presentation layers.

## Local Development

Once the frontend scaffold exists:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
```

`npm.cmd` is recommended on Windows if PowerShell blocks the `npm.ps1` wrapper.

## Expected Structure

```text
src/
+-- domain/
+-- application/
+-- infrastructure/
+-- presentation/
public/
+-- templates/
Documentos externos/
```

The simulation domain must stay independent from React, Material UI, browser storage and YAML formatting.
