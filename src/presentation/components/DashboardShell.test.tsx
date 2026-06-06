import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../screens/App";
import { useSimulationStore } from "../stores/simulationStore";

describe("DashboardShell", () => {
  beforeEach(() => {
    useSimulationStore.getState().selectTemplate("exercise-1-one-level-2bit");
    useSimulationStore.getState().reset();
    useSimulationStore.getState().updateCSource(`#define N 10
int a = 10;
int i = 0;
for (; i < N; i++) a -= i;
printf(a);`);
    useSimulationStore.setState({
      mode: "exam",
      exportedTable: undefined,
      exportedSessionYaml: undefined,
      sessionYamlInput: "",
      sessionImportError: undefined
    });
  });

  it("runs a template step and calculates statistics from the domain trace", () => {
    render(<App />);

    expect(screen.getByText("Sin pasos ejecutados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Paso" }));
    expect(screen.getByText("Paso 1 / 6")).toBeInTheDocument();
    expect(screen.getByText("B1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    expect(screen.getByLabelText("Fallos")).toHaveValue("1");
  });

  it("reveals prediction data in solution mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Paso" }));
    expect(screen.getAllByRole("row")[1].children[4]).toHaveTextContent("");

    fireEvent.click(screen.getByRole("tab", { name: "Solucion" }));
    expect(screen.getAllByRole("row")[1].children[4]).not.toHaveTextContent("");
  });

  it("regenerates didactic RISC-V when the C source changes", () => {
    render(<App />);

    expect((screen.getAllByRole("textbox")[1] as HTMLTextAreaElement).value).toContain("bge x7, x5, end");

    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "int a = 10; int i = 0; for (; i < 3; i++) a += i;" }
    });

    expect(screen.getByDisplayValue(/addi x7, x0, 3/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/add x5, x5, x6/)).toBeInTheDocument();
  });

  it("exports the current projected table to Markdown", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Paso" }));
    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));

    const exportArea = screen.getByLabelText("Exportacion") as HTMLTextAreaElement;
    expect(exportArea.value).toContain("| Iteracion | Salto |");
    expect(exportArea.value).toContain("| 1 | B1 |");
  });

  it("exports the current editable input as YAML without derived statistics", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Paso" }));
    fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
    fireEvent.click(screen.getByRole("button", { name: "YAML" }));

    const yamlArea = screen.getByLabelText("Sesion YAML") as HTMLTextAreaElement;
    expect(yamlArea.value).toContain("version: 1");
    expect(yamlArea.value).toContain("cSource:");
    expect(yamlArea.value).toContain("riscVSource:");
    expect(yamlArea.value).toContain("branchSequence:");
    expect(yamlArea.value).not.toContain("statistics:");
    expect(yamlArea.value).not.toContain("tableView:");
  });

  it("imports a YAML session and restores its editable sources", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "YAML" }));
    const exportedYaml = (screen.getByLabelText("Sesion YAML") as HTMLTextAreaElement).value;

    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "int a = 10; int i = 0; for (; i < 3; i++) a += i;" }
    });
    expect((screen.getAllByRole("textbox")[1] as HTMLTextAreaElement).value).toContain("addi x7, x0, 3");

    fireEvent.change(screen.getByLabelText("YAML de sesion"), {
      target: { value: exportedYaml }
    });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    const textboxes = screen.getAllByRole("textbox") as HTMLTextAreaElement[];
    expect(textboxes[0].value).toContain("#define N 10");
    expect(textboxes[1].value).toContain("bge x7, x5, end");
    expect(screen.getByText("Paso 0 / 6")).toBeInTheDocument();
  });
});
