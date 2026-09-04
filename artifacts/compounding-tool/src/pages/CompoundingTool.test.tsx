import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  if (value >= 1_000_000_000) {
    return `$${(Math.floor(value / 100_000_000) / 10).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(Math.floor(value / 100_000) / 10).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(Math.floor(value / 100) / 10).toFixed(1)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function expectSynchronizedChartState(age: number) {
  const expected = calculateExpectedValues(age);
  const percentLargerThanSavings = Math.round(
    ((expected.compoundedWithContributions - expected.savingsOnly) /
      expected.savingsOnly) *
      100,
  );
  const rows = screen.getAllByTestId("growth-row");
  const activeRows = rows.filter((row) => row.getAttribute("data-active") === "true");

  expect(activeRows).toHaveLength(1);
  expect(activeRows[0]).toHaveAttribute("data-age", String(age));
  expect(screen.getByTestId("chart-tooltip-age")).toHaveTextContent(`Age ${age}`);
  expect(screen.getByTestId("chart-facing-age")).toHaveTextContent(`Age ${age}`);
  expect(screen.getByTestId("summary-return-percentage")).toHaveTextContent(
    `${percentLargerThanSavings.toLocaleString()}%`,
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
  it("updates the growth heading according to mode priority", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const heading = screen.getByTestId("growth-heading");
    const savingsButton = screen.getByRole("button", { name: "Savings" });
    const compoundingButton = screen.getByRole("button", { name: "Compounding" });
    const blueButton = screen.getByRole("button", {
      name: "Compounding+Yearly Inv.",
    });

    expect(heading).toHaveTextContent(
      "Compounding plus Additional Investments Over Time",
    );

    await user.click(blueButton);
    expect(heading).toHaveTextContent("Compounding Growth Over Time");

    await user.click(savingsButton);
    expect(heading).toHaveTextContent("Compounding Growth Over Time");

    await user.click(compoundingButton);
    expect(heading).toHaveTextContent("Savings Growth Over Time");

    await user.click(savingsButton);
    expect(heading).toHaveTextContent("Savings Growth Over Time");
  });

  it("highlights the matching growth-table values when a summary value is hovered", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const summaryInterest = screen.getByTestId("summary-interest-1");
    const summaryMoney = screen.getByTestId("summary-money-1");
    const growthInterest = screen.getByTestId("growth-interest-11");
    const growthMoney = screen.getByTestId("growth-money-11");

    await user.hover(summaryInterest);
    expect(summaryInterest).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthInterest).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthInterest).toHaveStyle({ color: "#111827" });
    expect(summaryMoney).not.toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).not.toHaveStyle({ backgroundColor: "#ffff99" });

    await user.hover(summaryMoney);
    expect(summaryInterest).not.toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthInterest).not.toHaveStyle({ backgroundColor: "#ffff99" });
    expect(summaryMoney).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).toHaveStyle({ color: "#111827" });

    await user.unhover(summaryMoney);
    expect(summaryMoney).not.toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).not.toHaveStyle({ backgroundColor: "#ffff99" });
  });

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

describe("money explainer", () => {
  it("opens as the final Introduction walkthrough slide", async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = () => {};
    const user = userEvent.setup();
    try {
      render(<CompoundingTool />);

      await user.click(screen.getByRole("button", { name: "Introduction" }));

      for (let step = 0; step < 15; step += 1) {
        await user.keyboard("{ArrowRight}");
      }

      await waitFor(() => {
        expect(
          screen.getByRole("dialog", { name: "What is money?" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("dialog", {
            name: "An Intro to Money",
          }),
        ).toBeInTheDocument();
      });
      expect(screen.getByText("16 of 16")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "What is money?" }),
      ).toHaveAttribute("data-tour", "money-link");

      await user.click(
        screen.getByRole("button", { name: "Close the walkthrough" }),
      );
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("opens with the M keyboard shortcut", () => {
    render(<CompoundingTool />);

    expect(
      screen.queryByRole("dialog", { name: "What is money?" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "m" });

    expect(
      screen.getByRole("dialog", { name: "What is money?" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "m" });

    expect(
      screen.queryByRole("dialog", { name: "What is money?" }),
    ).not.toBeInTheDocument();
  });

  it("switches to the compounding explainer with F", () => {
    render(<CompoundingTool />);

    fireEvent.keyDown(window, { key: "m" });
    expect(
      screen.getByRole("dialog", { name: "What is money?" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "f" });

    expect(
      screen.queryByRole("dialog", { name: "What is money?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Same Start, 3 Kinds of Growth" }),
    ).toBeInTheDocument();
  });

  it("keeps numeric visibility shortcuts active while the money panel is open", () => {
    render(<CompoundingTool />);

    fireEvent.keyDown(window, { key: "m" });
    expect(
      screen.getByRole("dialog", { name: "What is money?" }),
    ).toBeInTheDocument();

    const savingsButton = screen.getByRole("button", { name: "Savings" });
    const compoundingButton = screen.getByRole("button", {
      name: "Compounding",
    });
    const yearlyInvestmentsButton = screen.getByRole("button", {
      name: "Compounding+Yearly Inv.",
    });

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });

    expect(savingsButton).not.toHaveClass("bg-pink-100");
    expect(compoundingButton).not.toHaveClass("bg-gray-200");
    expect(yearlyInvestmentsButton).not.toHaveClass("bg-blue-100");
    expect(
      screen.getByRole("dialog", { name: "What is money?" }),
    ).toBeInTheDocument();
  });

  it("opens from the seventh lesson and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    await user.click(
      screen.getByRole("button", {
        name: "What is money?",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "What is money?" });
    expect(dialog).toHaveTextContent("Money is a way to store and trade value.");
    expect(dialog).toHaveTextContent(
      "To understand how money works, imagine you are a squirrel.",
    );
    expect(
      screen.queryByRole("region", { name: "Five things people value" }),
    ).not.toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "We value five things: control, power, time, freedom, and knowledge.",
    );

    await user.click(
      screen.getByRole("button", { name: "Show details about the five values" }),
    );

    expect(
      screen.getByRole("region", { name: "Five things people value" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Control - choosing how you act, even when you did not choose the situation.",
    );
    expect(dialog).toHaveTextContent(
      "Power - being able to direct other people’s choices.",
    );
    expect(dialog).toHaveTextContent(
      "Time - hours that belong to you. The most valued resource we have.",
    );
    expect(dialog).toHaveTextContent(
      "Freedom - being able to make your own choices.",
    );
    expect(dialog).toHaveTextContent(
      "Knowledge - information you can actually use.",
    );

    await user.click(
      screen.getByRole("button", { name: "Hide details about the five values" }),
    );

    expect(
      screen.queryByRole("region", { name: "Five things people value" }),
    ).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "What is money?" }),
    ).not.toBeInTheDocument();
  });
});