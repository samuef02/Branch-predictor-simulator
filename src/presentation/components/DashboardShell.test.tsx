import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../screens/App";

describe("DashboardShell", () => {
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

    expect(screen.getByDisplayValue(/bge x7, x5, end/)).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "int a = 10; int i = 0; for (; i < 3; i++) a += i;" }
    });

    expect(screen.getByDisplayValue(/addi x7, x0, 3/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/add x5, x5, x6/)).toBeInTheDocument();
  });
});
