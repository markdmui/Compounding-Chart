import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CompoundingTool from "./CompoundingTool";

const STARTING_AGE = 10;
const INITIAL_INVESTMENT = 7_000;
const RATE = 0.15;
const CONTRIBUTIONS = [200, 500, 1_000, 2_000, 5_000];

function calculateExpectedValues(age: number) {
  const years = age - STARTING_AGE;
  let compoundedWithContributions = INITIAL_INVESTMENT;
  let compoundedOnly = INITIAL_INVESTMENT;
  let savingsOnly = INITIAL_INVESTMENT;

  for (let year = 1; year <= years; year += 1) {
    compoundedWithContributions *= 1 + RATE;
    compoundedOnly *= 1 + RATE;
    const currentAge = STARTING_AGE + year;
    const decadeIndex = Math.min(Math.floor(currentAge / 10) - 1, CONTRIBUTIONS.length - 1);
    savingsOnly += CONTRIBUTIONS[decadeIndex];
    compoundedWithContributions += CONTRIBUTIONS[decadeIndex];
  }

  return {
    compoundedWithContributions,
    compoundedOnly,
    savingsOnly,
  };
}

function formatSummaryMoney(value: number) {
  const roundedToHundred = Math.round(value / 100) * 100;
  if (roundedToHundred >= 1_000_000) return `$${(roundedToHundred / 1_000_000).toFixed(1)}M`;
  if (roundedToHundred >= 1_000) return `$${(roundedToHundred / 1_000).toFixed(0)}K`;
  return `$${Math.round(roundedToHundred).toLocaleString()}`;
}

function expectSynchronizedChartState(age: number) {
  const expected = calculateExpectedValues(age);
  const rows = screen.getAllByTestId("growth-row");
  const activeRows = rows.filter((row) => row.getAttribute("data-active") === "true");

  expect(activeRows).toHaveLength(1);
  expect(activeRows[0]).toHaveAttribute("data-age", String(age));
  expect(screen.getByTestId("chart-tooltip-age")).toHaveTextContent(`Age ${age}`);
  expect(screen.getByTestId("chart-facing-age")).toHaveTextContent(`Age ${age}`);
  expect(screen.getByTestId("summary-return-percentage")).toHaveTextContent(
    `${Math.round((expected.compoundedWithContributions / expected.savingsOnly) * 100).toLocaleString()}%`,
  );
  expect(screen.getByTestId("summary-savings-value")).toHaveTextContent(
    formatSummaryMoney(expected.savingsOnly),
  );
  expect(screen.getByTestId("summary-compounding-value")).toHaveTextContent(
    formatSummaryMoney(expected.compoundedOnly),
  );
  expect(screen.getByTestId("summary-compounding-yearly-value")).toHaveTextContent(
    formatSummaryMoney(expected.compoundedWithContributions),
  );
}

describe("growth table chart navigation", () => {
  it.each([
    { age: 10, column: "first", cell: "age" },
    { age: 35, column: "first", cell: "money" },
    { age: 60, column: "second", cell: "age" },
  ])(
    "keeps the chart and summaries synchronized when the $cell cell for age $age is clicked in the $column table column",
    async ({ age, column, cell }) => {
      const user = userEvent.setup();
      render(<CompoundingTool />);

      const tableColumn = screen.getByTestId(`growth-column-${column}`);
      const row = within(tableColumn).getByRole("button", {
        name: `Show age ${age} on chart`,
      });
      const target = cell === "money" ? row.querySelectorAll("span")[2] : row.querySelector("span");

      expect(target).not.toBeNull();
      await user.click(target!);

      expectSynchronizedChartState(age);
    },
  );

  it.each([
    { age: 10, key: "Enter", keyLabel: "Enter" },
    { age: 10, key: " ", keyLabel: "Space" },
    { age: 35, key: "Enter", keyLabel: "Enter" },
    { age: 35, key: " ", keyLabel: "Space" },
    { age: 60, key: "Enter", keyLabel: "Enter" },
    { age: 60, key: " ", keyLabel: "Space" },
  ])(
    "keeps the chart and summaries synchronized when the $keyLabel key activates the growth row for age $age",
    ({ age, key }) => {
      render(<CompoundingTool />);

      const row = screen.getByRole("button", {
        name: `Show age ${age} on chart`,
      });
      row.focus();

      expect(row).toHaveFocus();
      fireEvent.keyDown(row, { key });

      expectSynchronizedChartState(age);
    },
  );
});