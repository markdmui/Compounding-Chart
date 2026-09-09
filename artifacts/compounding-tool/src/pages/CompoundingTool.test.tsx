import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CompoundingTool from "./CompoundingTool";

const STARTING_AGE = 10;
const INITIAL_INVESTMENT = 1_000;
const RATE = 0.1;
const CONTRIBUTIONS = [200, 200, 200, 200, 200];

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

function enableComparisonCurves() {
  fireEvent.click(screen.getByRole("button", { name: "Compounding" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
  );
}

describe("growth table chart navigation", () => {
  it("centers the interface vertically when the viewport has extra height", () => {
    const { container } = render(<CompoundingTool />);
    const pageShell = container.firstElementChild;

    expect(pageShell).toHaveClass("flex", "min-h-screen");
    expect(pageShell?.firstElementChild).toHaveClass("my-auto");
  });

  it("updates every age contribution field when Ctrl+wheel is used", () => {
    render(<CompoundingTool />);
    const contributionInputs = screen.getAllByRole("spinbutton").slice(-5);

    fireEvent.wheel(contributionInputs[2], { ctrlKey: true, deltaY: -100 });
    expect(contributionInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
      "300",
      "300",
      "300",
      "300",
      "300",
    ]);

    fireEvent.wheel(contributionInputs[0], { ctrlKey: true, deltaY: 100 });
    expect(contributionInputs.map((input) => (input as HTMLInputElement).value)).toEqual([
      "200",
      "200",
      "200",
      "200",
      "200",
    ]);
  });

  it("updates the growth bars when yearly investments change in compounding mode", () => {
    render(<CompoundingTool />);
    fireEvent.click(screen.getByRole("button", { name: "Compounding" }));
    const contributionInputs = screen.getAllByRole("spinbutton").slice(-5);

    fireEvent.wheel(contributionInputs[0], { deltaY: -100 });

    let expectedMoney = INITIAL_INVESTMENT;
    for (let year = 1; year <= 8; year += 1) {
      expectedMoney = expectedMoney * (1 + RATE) + 300;
    }

    expect(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    ).toHaveClass("bg-blue-100");
    expect(screen.getByTestId("growth-heading")).toHaveTextContent(
      "Compounding plus Additional Investments Over Time",
    );
    expect(screen.getByTestId("growth-money-18")).toHaveTextContent(
      `$${Math.round(expectedMoney).toLocaleString()}`,
    );
  });

  it("adjusts the main inputs with their wheel increments", () => {
    render(<CompoundingTool />);
    const [initialInvestmentInput, annualRateInput] = screen.getAllByRole(
      "spinbutton",
    );

    fireEvent.wheel(initialInvestmentInput, { deltaY: -100 });
    expect(initialInvestmentInput).toHaveValue(1100);

    fireEvent.wheel(initialInvestmentInput, { deltaY: 100 });
    expect(initialInvestmentInput).toHaveValue(1000);

    fireEvent.wheel(annualRateInput, { deltaY: -100 });
    expect(annualRateInput).toHaveValue(11);

    fireEvent.wheel(annualRateInput, { deltaY: 100 });
    expect(annualRateInput).toHaveValue(10);
  });

  it("opens the shortcut guide with K without listing the secret reset shortcut", () => {
    render(<CompoundingTool />);

    fireEvent.keyDown(window, { key: "k" });

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Control + scroll");
    expect(dialog).toHaveTextContent("← / →");
    expect(dialog).toHaveTextContent("Move through Introduction slides");
    expect(dialog).toHaveTextContent("1–4 (Quiz Mode)");
    expect(dialog).toHaveTextContent("Show or hide the growth and lessons panels");
    expect(dialog).not.toHaveTextContent("Control + ← / → (Quiz Mode)");
    expect(dialog).toHaveTextContent("Enter (Quiz Mode)");
    expect(dialog).not.toHaveTextContent("Control + 1");
    expect(dialog).not.toHaveTextContent("Ctrl + 1");
    expect(dialog).toHaveClass("max-w-3xl");
    const shortcutColumns = within(dialog).getAllByRole("list");
    expect(shortcutColumns).toHaveLength(2);
    expect(shortcutColumns[0]).not.toHaveTextContent("Move through Introduction slides");
    expect(shortcutColumns[1]).toHaveTextContent("Move through Introduction slides");

    fireEvent.keyDown(window, { key: "K" });
    expect(
      screen.queryByRole("dialog", { name: "Keyboard shortcuts" }),
    ).not.toBeInTheDocument();
  });

  it("toggles and resynchronizes the growth and lessons panels with H", () => {
    render(<CompoundingTool />);

    expect(screen.getByTestId("growth-heading")).toBeInTheDocument();
    expect(screen.getByText("Money is a way to store and trade value.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("growth-heading").closest("button")!);
    expect(screen.queryByTestId("growth-money-10")).not.toBeInTheDocument();
    expect(screen.getByText("Money is a way to store and trade value.")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "h" });

    expect(screen.getByTestId("growth-heading").closest(".side-by-side-right")).toHaveClass(
      "hidden",
    );
    expect(
      screen.queryByText("Money is a way to store and trade value."),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "H" });

    expect(screen.getByTestId("growth-heading").closest(".side-by-side-right")).not.toHaveClass(
      "hidden",
    );
    expect(screen.getByTestId("growth-money-10")).toBeInTheDocument();
    expect(screen.getByText("Money is a way to store and trade value.")).toBeInTheDocument();
  });

  it("highlights the matching chart curve in yellow when its legend label is hovered", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompoundingTool />);
    enableComparisonCurves();
    const legendCurves = [
      {
        key: "pink",
        name: "Savings-Only (no compounding)",
        originalStroke: "#f472b6",
      },
      {
        key: "black",
        name: "$1,000 + Interest Only",
        originalStroke: "#374151",
      },
      {
        key: "blue",
        name: "$1,000+ Yearly Investments",
        originalStroke: "#3b82f6",
      },
    ];
    const chartCurveArea = screen.getByTestId("chart-curve-area");

    for (const { key, name, originalStroke } of legendCurves) {
      const label = screen.getByRole("button", { name });
      const originalCurve = container.querySelector(
        `.recharts-line-curve[stroke="${originalStroke}"]`,
      );
      expect(originalCurve).toBeInTheDocument();

      await user.hover(label);

      await waitFor(() => {
        expect(chartCurveArea).toHaveAttribute("data-highlighted-curve", key);
        expect(
          container.querySelector(
            `.recharts-line-curve[stroke="${originalStroke}"]`,
          ),
        ).toBeInTheDocument();
      });

      await user.unhover(label);
      await waitFor(() => {
        expect(chartCurveArea).not.toHaveAttribute("data-highlighted-curve");
      });
    }
  });

  it("toggles the chart x-axis between ages and elapsed years", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const axisToggle = screen.getByTestId("x-axis-mode-toggle");
    expect(axisToggle).toHaveTextContent("AGE");
    expect(
      screen.queryByRole("tooltip", { name: "Year" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Yearly Investments by Age")).toBeInTheDocument();
    expect(screen.getByText("Ages 10–19")).toBeInTheDocument();
    expect(screen.queryByText("Ages 20–29")).not.toBeInTheDocument();
    expect(screen.getByText("20–29")).toBeInTheDocument();
    expect(screen.getByText("Age 11")).toBeInTheDocument();
    expect(screen.getByText("Age 60")).toBeInTheDocument();
    expect(screen.getByTestId("summary-interest-25")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-interest-20")).not.toBeInTheDocument();

    await user.hover(axisToggle);
    const activeAxisLabel = screen
      .getByTestId("x-axis-mode-toggle")
      .querySelector("text");
    expect(activeAxisLabel).toHaveAttribute("fill", "#111827");
    expect(activeAxisLabel).toHaveStyle({ textDecoration: "underline" });
    expect(screen.getByRole("tooltip", { name: "Year" })).toHaveClass(
      "rounded-md",
      "bg-gray-100",
      "border-gray-200",
      "opacity-100",
    );
    expect(screen.getByRole("tooltip", { name: "Year" })).toHaveStyle({
      opacity: "1",
    });

    await user.click(screen.getByTestId("x-axis-mode-toggle"));

    const yearToggle = screen.getByTestId("x-axis-mode-toggle");
    expect(yearToggle.querySelector("text")).toHaveTextContent("YEAR");
    expect(screen.getByRole("tooltip", { name: "Age" })).toBeInTheDocument();
    expect(screen.getByTestId("x-axis-tick-0")).toBeEmptyDOMElement();
    expect(screen.getByTestId("x-axis-tick-1")).toHaveTextContent("1");
    expect(screen.getByTestId("x-axis-tick-50")).toHaveTextContent("50");
    expect(screen.getByTestId("chart-tooltip-age")).toHaveTextContent(
      "Year 0",
    );
    expect(screen.getByTestId("chart-facing-age")).toHaveTextContent(
      "Year 0",
    );
    expect(screen.getByText("Yearly Investments by Year")).toBeInTheDocument();
    expect(screen.getByText("Years 1–9")).toBeInTheDocument();
    expect(screen.queryByText("Years 10–19")).not.toBeInTheDocument();
    expect(screen.getByText("10–19")).toBeInTheDocument();
    expect(screen.getByText("40–50")).toBeInTheDocument();
    expect(screen.getAllByText("Year 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Year 50").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("growth-row")[0]).toHaveTextContent("0");
    expect(screen.getAllByTestId("growth-row")[0]).not.toHaveTextContent("Year");
    expect(screen.getAllByTestId("growth-row")[1]).toHaveTextContent("1");
    expect(screen.getAllByTestId("growth-row")[1]).not.toHaveTextContent("Year");
    expect(screen.getAllByTestId("growth-time-header")).toHaveLength(2);
    screen
      .getAllByTestId("growth-time-header")
      .forEach((header) => expect(header).toHaveTextContent("Year"));
    expect(screen.getAllByTestId("growth-row")[0]).toHaveAccessibleName(
      "Show year 0 on chart",
    );
    expect(screen.getAllByTestId("growth-row")[1]).toHaveAccessibleName(
      "Show year 1 on chart",
    );

    await user.keyboard("c");
    expect(screen.getByLabelText("Choose a year")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to year 50" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByTestId("x-axis-mode-toggle"));
    expect(
      screen.getByTestId("x-axis-mode-toggle").querySelector("text"),
    ).toHaveTextContent("AGE");
    expect(screen.getByTestId("x-axis-tick-0")).toHaveTextContent("10");
    expect(screen.getByTestId("x-axis-tick-50")).toHaveTextContent("60");
  });

  it("makes the growth table time header toggle between ages and years", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const timeHeader = screen.getAllByTestId("growth-time-header")[0];
    expect(timeHeader).toHaveTextContent("Age");
    expect(timeHeader).toHaveAccessibleName("Show table by year");

    await user.hover(timeHeader);
    expect(screen.getByRole("tooltip", { name: "Year" })).toBeInTheDocument();

    await user.click(timeHeader);

    expect(timeHeader).toHaveTextContent("Year");
    expect(timeHeader).toHaveAccessibleName("Show table by age");
    expect(screen.getByText("Years 1–9")).toBeInTheDocument();
    expect(screen.queryByText("Ages 10–19")).not.toBeInTheDocument();
  });

  it("resets all numeric settings to their default values", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const spinbuttons = screen.getAllByRole("spinbutton");
    const initialInvestmentInput = spinbuttons[0];
    const annualRateInput = spinbuttons[1];
    const contributionInputs = spinbuttons.slice(-5);

    await user.clear(initialInvestmentInput);
    await user.type(initialInvestmentInput, "7000");
    await user.clear(annualRateInput);
    await user.type(annualRateInput, "15");
    await user.clear(contributionInputs[1]);
    await user.type(contributionInputs[1], "500");
    await user.click(screen.getByRole("button", { name: "Savings" }));
    await user.click(screen.getByRole("button", { name: "Compounding" }));
    await user.click(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(initialInvestmentInput).toHaveValue(1000);
    expect(annualRateInput).toHaveValue(10);
    expect(contributionInputs.map((input) => input.value)).toEqual([
      "200",
      "200",
      "200",
      "200",
      "200",
    ]);
    expect(screen.getByRole("button", { name: "Savings" })).toHaveClass(
      "bg-pink-100",
    );
    expect(screen.getByRole("button", { name: "Compounding" })).not.toHaveClass(
      "bg-gray-200",
    );
    expect(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    ).not.toHaveClass("bg-blue-100");
  });

  it("loads the saved comparison values with Control+1", () => {
    render(<CompoundingTool />);

    fireEvent.keyDown(window, { key: "1", ctrlKey: true });

    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons[0]).toHaveValue(7000);
    expect(spinbuttons[1]).toHaveValue(15);
    expect(spinbuttons.slice(-5).map((input) => input.value)).toEqual([
      "200",
      "500",
      "1000",
      "2000",
      "5000",
    ]);
    expect(screen.getByRole("button", { name: "Savings" })).toHaveClass(
      "bg-pink-100",
    );
    expect(screen.getByRole("button", { name: "Compounding" })).toHaveClass(
      "bg-gray-200",
    );
    expect(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    ).toHaveClass("bg-blue-100");
  });

  it("updates the growth heading according to mode priority", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const heading = screen.getByTestId("growth-heading");
    const savingsButton = screen.getByRole("button", { name: "Savings" });
    const compoundingButton = screen.getByRole("button", { name: "Compounding" });
    const blueButton = screen.getByRole("button", {
      name: "Compounding+Yearly Inv.",
    });

    expect(heading).toHaveTextContent("Savings Growth Over Time");

    await user.click(compoundingButton);
    expect(heading).toHaveTextContent("Compounding Growth Over Time");

    await user.click(blueButton);
    expect(heading).toHaveTextContent(
      "Compounding plus Additional Investments Over Time",
    );

    await user.click(savingsButton);
    expect(heading).toHaveTextContent(
      "Compounding plus Additional Investments Over Time",
    );

    await user.click(blueButton);
    expect(heading).toHaveTextContent("Compounding Growth Over Time");

    await user.click(compoundingButton);
    expect(heading).toHaveTextContent("Growth Over Time");
  });

  it("shows only the legend labels for visible chart curves", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    expect(
      screen.getByRole("button", { name: "Savings-Only (no compounding)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "$1,000 + Interest Only" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "$1,000+ Yearly Investments" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Compounding" }));
    expect(
      screen.getByRole("button", { name: "$1,000 + Interest Only" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "$1,000+ Yearly Investments" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    );
    expect(
      screen.getByRole("button", { name: "$1,000+ Yearly Investments" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Savings" }));
    expect(
      screen.queryByRole("button", { name: "Savings-Only (no compounding)" }),
    ).not.toBeInTheDocument();
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
    { milestone: "double", age: 15 },
    { milestone: "triple", age: 20 },
    { milestone: "quadruple", age: 25 },
  ])(
    "highlights the matching money row when the $milestone milestone is hovered",
    async ({ milestone, age }) => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

      const milestoneValue = screen.getByTestId(
        `summary-milestone-${milestone}`,
      );
      const growthMoney = screen.getByTestId(`growth-money-${age}`);

      await user.hover(milestoneValue);

      expect(milestoneValue).toHaveStyle({ backgroundColor: "#ffff99" });
      expect(growthMoney).toHaveStyle({ backgroundColor: "#ffff99" });
      expect(growthMoney).toHaveStyle({ color: "#111827" });

      await user.unhover(milestoneValue);

      expect(milestoneValue).not.toHaveStyle({
        backgroundColor: "#ffff99",
      });
      expect(growthMoney).not.toHaveStyle({ backgroundColor: "#ffff99" });
    },
  );

  it("shows savings-alone milestone wording and values", () => {
    render(<CompoundingTool />);

    expect(screen.getByText("Savings alone")).toBeInTheDocument();
    expect(screen.getByTestId("summary-milestone-double")).toHaveTextContent(
      "5 years",
    );
    expect(screen.getByTestId("summary-milestone-triple")).toHaveTextContent(
      "10 years",
    );
    expect(screen.getByTestId("summary-milestone-quadruple")).toHaveTextContent(
      "15 years",
    );
  });

  it("keeps an empty growth table visible when every mode is off", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    await user.click(screen.getByRole("button", { name: "Savings" }));

    expect(screen.getByTestId("growth-heading")).toHaveTextContent(
      "Growth Over Time",
    );
    expect(screen.getByTestId("growth-interest-11")).toBeEmptyDOMElement();
    expect(screen.getByTestId("growth-money-11")).toBeEmptyDOMElement();
    expect(screen.getByTestId("growth-percent-11")).toBeEmptyDOMElement();
    expect(screen.queryByTestId("growth-bar-fill-11")).not.toBeInTheDocument();
  });

  it("recalculates all milestones from compounding plus yearly investments", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    await user.click(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    );

    const expectedMilestones = [
      { name: "double", years: 4, age: 14 },
      { name: "triple", years: 6, age: 16 },
      { name: "quadruple", years: 8, age: 18 },
    ];

    expect(
      screen.getByText("Compounding at 10% + yearly investments"),
    ).toBeInTheDocument();

    for (const { name, years, age } of expectedMilestones) {
      const milestone = screen.getByTestId(`summary-milestone-${name}`);
      const growthMoney = screen.getByTestId(`growth-money-${age}`);

      expect(milestone).toHaveTextContent(`${years} years`);

      await user.hover(milestone);
      expect(milestone).toHaveStyle({ backgroundColor: "#ffff99" });
      expect(growthMoney).toHaveStyle({ backgroundColor: "#ffff99" });
      await user.unhover(milestone);
    }
  });

  it("highlights the dynamically calculated million-dollar money row", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);
    await user.click(
      screen.getByRole("button", { name: "Compounding+Yearly Inv." }),
    );
    const contributionInputs = screen.getAllByRole("spinbutton").slice(-5);

    contributionInputs.forEach((input) => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "10" } });
      fireEvent.blur(input);
    });

    const millionMilestone = screen.getByTestId("summary-milestone-million");
    const growthMoney = screen.getByTestId("growth-money-58");

    expect(millionMilestone).toHaveTextContent("age 58");

    await user.hover(millionMilestone);

    expect(millionMilestone).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(growthMoney).toHaveStyle({ color: "#111827" });
  });

  it("moves the selected chart point when a summary dollar value is clicked", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    await user.click(screen.getByTestId("summary-money-25"));

    expect(screen.getByTestId("chart-tooltip-age")).toHaveTextContent("Age 35");
    expect(screen.getByTestId("chart-facing-age")).toHaveTextContent("Age 35");
    const activeRows = screen
      .getAllByTestId("growth-row")
      .filter((row) => row.getAttribute("data-active") === "true");
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]).toHaveAttribute("data-age", "35");
  });

  it("highlights a difference value without touching the chart curve", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);
    enableComparisonCurves();

    const chartCurveArea = screen.getByTestId("chart-curve-area");
    const delta1 = screen.getByTestId("delta1");
    const delta2 = screen.getByTestId("delta2");

    await user.hover(delta1);
    expect(delta1).toHaveTextContent(
      "the delta/difference between Compounding Only and Savings Only is:",
    );
    const blackValue = within(delta1).getByTestId("difference-black-value");
    const pinkValue = within(delta1).getByTestId("difference-pink-value");

    // The number highlights, but only the legend may glow a curve.
    await user.hover(blackValue);
    expect(blackValue).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(chartCurveArea).not.toHaveAttribute("data-highlighted-curve");

    await user.hover(pinkValue);
    expect(pinkValue).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(chartCurveArea).not.toHaveAttribute("data-highlighted-curve");

    await user.hover(delta2);
    expect(delta2).toHaveTextContent(
      "the delta/difference between Compounding + Yearly Inv. and Compounding Only is:",
    );
    const blueValue = within(delta2).getByTestId("difference-blue-value");
    await user.hover(blueValue);
    expect(blueValue).toHaveStyle({ backgroundColor: "#ffff99" });
    expect(chartCurveArea).not.toHaveAttribute("data-highlighted-curve");
  });

  it("matches summary values to the compounding-only growth bars when yearly investments are off", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    await user.click(screen.getByRole("button", { name: "Compounding" }));

    const expectedMoney = Math.round(
      calculateExpectedValues(35).compoundedOnly,
    );
    const expectedInterest = Math.round(
      calculateExpectedValues(34).compoundedOnly * RATE,
    );
    const summaryMoney = screen.getByTestId("summary-money-25");
    const summaryInterest = screen.getByTestId("summary-interest-25");
    const growthMoney = screen.getByTestId("growth-money-35");
    const growthInterest = screen.getByTestId("growth-interest-35");

    expect(summaryMoney).toHaveTextContent(`$${expectedMoney.toLocaleString()}`);
    expect(summaryInterest).toHaveTextContent(
      `$${expectedInterest.toLocaleString()}`,
    );
    expect(summaryMoney).toHaveTextContent(growthMoney.textContent ?? "");
    expect(summaryInterest).toHaveTextContent(growthInterest.textContent ?? "");
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
      enableComparisonCurves();

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
      enableComparisonCurves();

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
  it("starts with the compounding explainer closed", () => {
    render(<CompoundingTool />);

    expect(
      screen.queryByRole("dialog", {
        name: "Visually Compare All Three",
      }),
    ).not.toBeInTheDocument();
  });

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
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Next" }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(
        screen.queryByRole("button", { name: "Close the walkthrough" }),
      ).not.toBeInTheDocument();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("uses the visual comparison copy on slide 15", async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = () => {};
    const user = userEvent.setup();
    try {
      render(<CompoundingTool />);
      await user.click(screen.getByRole("button", { name: "Introduction" }));

      for (let step = 0; step < 14; step += 1) {
        await user.keyboard("{ArrowRight}");
      }

      await waitFor(() => {
        const dialog = screen.getByRole("dialog", {
          name: "Same Start, 3 Kinds of Growth",
        });
        expect(dialog).toHaveTextContent(
          "A side by side comparison is a helpful tool when trying to understand complicated things.",
        );
        expect(dialog).not.toHaveTextContent(
          "All of them begin with the same money",
        );
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("shows scroll-to-change indicators on the editable Introduction slides", async () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = () => {};
    const user = userEvent.setup();
    try {
      render(<CompoundingTool />);

      await user.click(screen.getByRole("button", { name: "Introduction" }));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog", {
          name: "Your Starting Principal",
        });
        expect(dialog).toHaveTextContent("Scroll to change");
        expect(screen.getByText("(Scroll to change)")).toHaveClass(
          "rounded-md",
          "border",
          "bg-slate-100",
        );
      });

      await user.keyboard("{ArrowRight}");

      await waitFor(() => {
        const dialog = screen.getByRole("dialog", {
          name: "This Is the Interest Rate",
        });
        expect(dialog).toHaveTextContent("Scroll to change");
        expect(
          screen.getByRole("button", { name: "$1,000 + Interest Only" }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("chart-curve-area")).toContainElement(
          document.querySelector(".curve-black"),
        );
        expect(screen.getByText("(Scroll to change)")).toHaveClass(
          "rounded-md",
          "border",
          "bg-slate-100",
        );
      });

      await user.keyboard("{ArrowRight}");

      await waitFor(() => {
        const dialog = screen.getByRole("dialog", { name: "The Shape of Growth" });
        expect(dialog).toHaveTextContent("up and down arrow keys");
        expect(dialog).not.toHaveTextContent("left and right arrow keys");
      });

      expect(screen.getByTestId("chart-facing-age")).toHaveTextContent("Age 10");
      await user.keyboard("{ArrowUp}");
      expect(screen.getByTestId("chart-facing-age")).toHaveTextContent("Age 11");

      await user.keyboard("{ArrowDown}");
      expect(screen.getByTestId("chart-facing-age")).toHaveTextContent("Age 10");

      await user.keyboard("{ArrowRight}");

      await waitFor(() => {
        const dialog = screen.getByRole("dialog", {
          name: "What You Add Each Year",
        });
        expect(dialog).toHaveTextContent("Scroll to change");
        expect(
          screen.getByRole("button", {
            name: "$1,000+ Yearly Investments",
          }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("chart-curve-area")).toContainElement(
          document.querySelector(".curve-blue"),
        );
        expect(screen.getByText("(Scroll to change)")).toHaveClass(
          "rounded-md",
          "border",
          "bg-slate-100",
        );
      });
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

  it("switches to the compounding explainer with C", () => {
    render(<CompoundingTool />);

    fireEvent.keyDown(window, { key: "m" });
    expect(
      screen.getByRole("dialog", { name: "What is money?" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "c" });

    expect(
      screen.queryByRole("dialog", { name: "What is money?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Visually Compare All Three" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("All 3 investment types start with the same money."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Press the up and down arrows to see how they change over time."),
    ).toBeInTheDocument();
  });

  it("shows the C and M shortcut tooltips on the lesson links", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    const compoundingLink = screen.getByRole("button", {
      name: "What is compounding?",
    });
    const moneyLink = screen.getByRole("button", { name: "What is money?" });
    const compoundingTooltip = screen.getByRole("tooltip", {
      name: "Shortcut: C",
    });
    const moneyTooltip = screen.getByRole("tooltip", {
      name: "Shortcut: M",
    });

    expect(compoundingTooltip).toHaveClass("opacity-0");
    expect(moneyTooltip).toHaveClass("opacity-0");
    expect(compoundingTooltip).toHaveClass(
      "group-hover:opacity-100",
      "group-focus-visible:opacity-100",
    );
    expect(moneyTooltip).toHaveClass(
      "group-hover:opacity-100",
      "group-focus-visible:opacity-100",
    );
    expect(compoundingLink).toHaveClass("group");
    expect(moneyLink).toHaveClass("group");
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
    expect(compoundingButton).toHaveClass("bg-gray-200");
    expect(yearlyInvestmentsButton).toHaveClass("bg-blue-100");
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
      "We value five things: control, power, freedom, time, and knowledge",
    );
    const learnMoreLink = screen.getByRole("button", {
      name: "Show details about the five values",
    });
    expect(learnMoreLink).toHaveClass("cursor-pointer");
    expect(within(learnMoreLink).getByRole("tooltip", { name: "Learn More" })).toHaveClass(
      "opacity-0",
      "group-hover:opacity-100",
      "group-focus-visible:opacity-100",
    );

    await user.click(
      learnMoreLink,
    );

    expect(
      screen.getByRole("region", { name: "Five things people value" }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      "Control - which way your actions are directed. It is deciding where to aim the garden hose.",
    );
    expect(dialog).toHaveTextContent(
      "Power - how much your action does. It is how much water comes out of the hose.",
    );
    expect(dialog).toHaveTextContent(
      "Time - hours that belong to you. It is the most valuable resource we have.",
    );
    expect(dialog).toHaveTextContent(
      "Paying for a bus ride to school saves you the hour you would have spent walking.",
    );
    expect(dialog).toHaveTextContent(
      "Freedom - whether you get to act at all. It is choosing whether to pick up or put down the garden hose.",
    );
    expect(dialog).toHaveTextContent(
      "Knowledge - information you can actually use.",
    );
    expect(dialog).toHaveTextContent(
      "You can spend or trade your time and money to acquire knowledge, then sell that knowledge for more money.",
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

describe("quiz mode", () => {
  it("shows each shortcut tooltip only from its numbered answer key", async () => {
    const user = userEvent.setup();
    render(<CompoundingTool />);

    fireEvent.click(screen.getByRole("button", { name: "Quiz Mode" }));

    const key = screen.getByTestId("quiz-choice-key-1");
    const tooltip = screen.getByRole("tooltip", { name: "Shortcut: 1" });

    expect(tooltip).toHaveClass("opacity-0", "group-hover:opacity-100");
    await user.hover(key);
    expect(tooltip).toHaveClass("group-hover:opacity-100");

    await user.unhover(key);
    expect(tooltip).toHaveClass("opacity-0");
  });

  it("shows numbered answer keys and selects an answer with the matching number", () => {
    render(<CompoundingTool />);

    fireEvent.click(screen.getByRole("button", { name: "Quiz Mode" }));

    expect(screen.getByRole("dialog", { name: "Quiz Mode" })).toBeInTheDocument();
    expect(screen.getAllByTestId(/quiz-choice-key-/)).toHaveLength(4);
    expect(screen.getByTestId("quiz-choice-key-1")).toHaveTextContent("1");
    expect(screen.getByTestId("quiz-choice-key-2")).toHaveTextContent("2");
    expect(screen.getByTestId("quiz-choice-key-3")).toHaveTextContent("3");
    expect(screen.getByTestId("quiz-choice-key-4")).toHaveTextContent("4");

    fireEvent.keyDown(window, { key: "4" });

    expect(screen.getByTestId("quiz-choice-3")).toBeDisabled();

    for (let index = 0; index < 4; index += 1) {
      const choice = screen.getByTestId(`quiz-choice-${index}`);
      if (!choice.hasAttribute("disabled")) {
        fireEvent.click(choice);
      }
      if (
        screen.queryByText("Correct") ||
        screen.queryByText("That's the one")
      ) {
        break;
      }
    }

    expect(screen.getByTestId("quiz-enter-shortcut")).toHaveTextContent("Enter key");

    fireEvent.keyDown(window, { key: "Enter" });

    expect(screen.getByText(/Question 2 of/)).toBeInTheDocument();
  });
});