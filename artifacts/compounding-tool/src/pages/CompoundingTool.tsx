import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Customized,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { CompoundingExplainer } from "@/components/CompoundingExplainer";
import { QuizMode } from "@/components/QuizMode";

const YEARS = 50;
const STARTING_AGE = 10;

const BLUE = "#3b82f6";
const BLACK = "#374151";
const BLACK_BAR = "#6b7280";
const PINK = "#f472b6";

interface ContributionsByDecade {
  "10s": number;
  "20s": number;
  "30s": number;
  "40s": number;
  "50s": number;
}

function calculateGrowth(initial: number, rate: number, numYears: number) {
  const data: number[] = [initial];
  let current = initial;
  for (let i = 1; i <= numYears; i++) {
    current *= 1 + rate;
    data.push(current);
  }
  return data;
}

function calculateGrowthWithContributions(
  initial: number,
  rate: number,
  numYears: number,
  contributions: ContributionsByDecade
) {
  const data: number[] = [initial];
  let current = initial;
  for (let i = 1; i <= numYears; i++) {
    current *= 1 + rate;
    const age = STARTING_AGE + i;
    if (age >= 10 && age <= 19) current += contributions["10s"];
    else if (age >= 20 && age <= 29) current += contributions["20s"];
    else if (age >= 30 && age <= 39) current += contributions["30s"];
    else if (age >= 40 && age <= 49) current += contributions["40s"];
    else if (age >= 50 && age <= 60) current += contributions["50s"];
    data.push(current);
  }
  return data;
}

function calculateLinear(initial: number, contributions: ContributionsByDecade, numYears: number) {
  const data: number[] = [initial];
  let current = initial;
  for (let i = 1; i <= numYears; i++) {
    const age = STARTING_AGE + i;
    if (age >= 10 && age <= 19) current += contributions["10s"];
    else if (age >= 20 && age <= 29) current += contributions["20s"];
    else if (age >= 30 && age <= 39) current += contributions["30s"];
    else if (age >= 40 && age <= 49) current += contributions["40s"];
    else if (age >= 50 && age <= 60) current += contributions["50s"];
    data.push(current);
  }
  return data;
}

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatCurveMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";
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

function formatCurveDeltaMoney(value: number) {
  const absoluteValue = Math.abs(value);
  if (!Number.isFinite(absoluteValue)) return "$0";
  if (absoluteValue >= 1_000_000_000) {
    return `$${(Math.round(absoluteValue / 100_000_000) / 10).toFixed(1)}B`;
  }
  if (absoluteValue >= 1_000_000) {
    return `$${(Math.round(absoluteValue / 100_000) / 10).toFixed(1)}M`;
  }
  if (absoluteValue >= 1_000) {
    return `$${(Math.round(absoluteValue / 100) / 10).toFixed(1)}K`;
  }
  return `$${Math.round(absoluteValue).toLocaleString()}`;
}

function HeaderHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="relative group text-[11px] text-gray-400 font-semibold uppercase cursor-help transition-colors duration-150 group-hover:text-gray-900 hover:text-gray-900">
      {label}
      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 block w-72 rounded-xl border border-gray-100 bg-white px-4 py-3 normal-case font-normal tracking-normal text-[13px] leading-snug text-gray-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        {hint}
      </span>
    </span>
  );
}

const EXPLANATIONS: Record<string, string> = {
  blue:
    "Compounding supercharged with yearly additions. Notice how much larger this is — that's the power of investing more money into the system each year.",
  black:
    "The black line shows your money compounding at the set interest rate with no extra additions. Each year, interest grows on top of prior growth — growth on top of growth.",
  pink:
    "The pink line is pure linear savings — no compounding, just adding $200/year to your principal. Good, but nowhere near the power of compound interest.",
};

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
}

function InlineNumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  step = 1,
  className = "",
  inputClassName = "",
}: NumberInputProps) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <span
      className={`inline-flex items-center bg-gray-100 rounded-lg px-2 py-0.5 ${className}`}
    >
      {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
      <input
        type="number"
        min={min}
        step={step}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={() => {
          const n = parseFloat(local);
          if (isNaN(n) || n < min) {
            onChange(min);
            setLocal(String(min));
          }
        }}
        className={`bg-transparent focus:outline-none w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inputClassName}`}
      />
      {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
    </span>
  );
}

interface DecadeInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onSyncChange?: (delta: number) => void;
  step?: number;
  color: string;
}

function YAxisTick({ x, y, payload }: { x: number; y: number; payload: { value: number } }) {
  const [hov, setHov] = useState(false);
  return (
    <g
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: "default" }}
    >
      <rect x={x - 68} y={y - 10} width={68} height={20} fill="transparent" />
      <text
        x={x}
        y={y}
        dy={4}
        textAnchor="end"
        fontSize={13}
        fontWeight={hov ? "700" : "400"}
        fill={hov ? "#111827" : "#9ca3af"}
        style={{ transition: "fill 0.15s" }}
      >
        {formatMoney(payload.value)}
      </text>
    </g>
  );
}

function DecadeInput({ label, value, onChange, onSyncChange, step = 100, color }: DecadeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const increment = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event?.ctrlKey && onSyncChange) {
      onSyncChange(step);
      return;
    }
    onChange(value + step);
  };
  const decrement = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event?.ctrlKey && onSyncChange) {
      onSyncChange(-step);
      return;
    }
    onChange(Math.max(0, value - step));
  };

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (isNaN(n) || n < 0) { onChange(0); return; }
    // Multiply by 100, then snap to nearest 100
    onChange(Math.round(n) * 100);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const incrementRef = useRef(increment);
  const decrementRef = useRef(decrement);
  incrementRef.current = increment;
  decrementRef.current = decrement;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) incrementRef.current(); else decrementRef.current();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
        {label}
      </label>
      <div ref={wrapperRef} className="relative w-full">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium z-10 pointer-events-none">
          $
        </span>
        <input
          ref={inputRef}
          type="number"
          min={0}
          step={1}
          value={editing ? draft : value}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full pl-6 pr-7 py-1.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          onFocus={(e) => {
            setEditing(true);
            setDraft("");
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${color}22`;
          }}
          onBlur={(e) => {
            setEditing(false);
            commit(draft);
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
          }}
        />
        {/* Up / Down arrow buttons */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={increment}
            className="w-5 h-4 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-100 focus:outline-none"
            tabIndex={-1}
          >
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M4 0.5L7.5 5.5H0.5L4 0.5Z" fill="#6b7280" />
            </svg>
          </button>
          <button
            type="button"
            onClick={decrement}
            className="w-5 h-4 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors duration-100 focus:outline-none"
            tabIndex={-1}
          >
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M4 5.5L0.5 0.5H7.5L4 5.5Z" fill="#6b7280" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULTS = {
  initialInvestment: 7000,
  annualRate: 15,
  contributions: { "10s": 200, "20s": 500, "30s": 1000, "40s": 2000, "50s": 5000 } as ContributionsByDecade,
  showSavings: true,
};

const RESET_SETTINGS = {
  initialInvestment: 1000,
  annualRate: 10,
  contributions: { "10s": 100, "20s": 100, "30s": 100, "40s": 100, "50s": 100 } as ContributionsByDecade,
};

export default function CompoundingTool() {
  const [initialInvestment, setInitialInvestment] = useState(DEFAULTS.initialInvestment);
  const [explainerOpen, setExplainerOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [lessonsSummaryOpen, setLessonsSummaryOpen] = useState(true);
  const [growthTableOpen, setGrowthTableOpen] = useState(true);
  const [annualRate, setAnnualRate] = useState(DEFAULTS.annualRate);
  const [contributions, setContributions] = useState<ContributionsByDecade>(DEFAULTS.contributions);
  const [showSavings, setShowSavings] = useState(true);
  const [showBlue, setShowBlue] = useState(true);
  const [showBlack, setShowBlack] = useState(true);
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number>(0);
  const [axisHoveredIndex, setAxisHoveredIndex] = useState<number | null>(null);
  const [chartHoveredIndex, setChartHoveredIndex] = useState<number | null>(null);
  const [barHoveredIdx, setBarHoveredIdx] = useState<number | null>(null);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const chartSectionRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartScaleRef = useRef<{ xScale: (v: any) => number; yScale: (v: any) => number } | null>(null);
  const handleExplainerClose = useCallback(() => setExplainerOpen(false), []);
  // Quiz Mode takes over the screen: close anything else that is open first.
  const handleQuizOpen = useCallback(() => {
    setExplainerOpen(false);
    setQuizOpen(true);
  }, []);
  const handleQuizClose = useCallback(() => setQuizOpen(false), []);
  const handleAgeChange = useCallback((index: number) => {
    setHoveredDataIndex(Math.min(YEARS, Math.max(0, index)));
  }, []);

  useEffect(() => {
    if (quizOpen) return;

    const handleExplainerShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "f" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      setExplainerOpen((open) => !open);
    };

    window.addEventListener("keydown", handleExplainerShortcut);
    return () => window.removeEventListener("keydown", handleExplainerShortcut);
  }, [quizOpen]);

  useEffect(() => {
    if (explainerOpen || quizOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      handleAgeChange(hoveredDataIndex + (event.key === "ArrowUp" ? 1 : -1));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [explainerOpen, quizOpen, handleAgeChange, hoveredDataIndex]);

  useEffect(() => {
    const handleSettingsShortcut = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.key !== "1") return;
      event.preventDefault();
      setInitialInvestment(DEFAULTS.initialInvestment);
      setAnnualRate(DEFAULTS.annualRate);
      setContributions({ ...DEFAULTS.contributions });
      setShowSavings(true);
      setShowBlack(true);
      setShowBlue(true);
    };

    window.addEventListener("keydown", handleSettingsShortcut);
    return () => window.removeEventListener("keydown", handleSettingsShortcut);
  }, []);

  const rate = annualRate / 100;
  const hasContributions = Object.values(contributions).some((v) => v > 0);
  const totalYearlyContrib = Object.values(contributions).reduce((sum, v) => sum + v, 0);
  const isSavingsOnly = showSavings && !showBlack && !showBlue;
  const isCompoundingOnly = showBlack && !showSavings && !showBlue;
  const hasVisibleGrowthMode = showSavings || showBlack || showBlue;

  useEffect(() => {
    if (hasContributions) {
      setGrowthTableOpen(true);
    }
  }, [hasContributions]);

  // Keyboard shortcuts: 1 toggles Savings, 2 toggles Compounding,
  // 3 toggles Compounding+Yearly Inv.
  useEffect(() => {
    if (quizOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "1") setShowSavings((prev) => !prev);
      else if (e.key === "2") setShowBlack((prev) => !prev);
      else if (e.key === "3") setShowBlue((prev) => !prev);
      else return;

      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quizOpen]);

  const blueData = calculateGrowthWithContributions(
    initialInvestment,
    rate,
    YEARS,
    contributions
  );
  const blackData = calculateGrowth(initialInvestment, rate, YEARS);
  const pinkData = calculateLinear(initialInvestment, contributions, YEARS);

  const chartData = Array.from({ length: YEARS + 1 }, (_, i) => ({
    age: `Age ${STARTING_AGE + i}`,
    ageNum: STARTING_AGE + i,
    blue: blueData[i],
    black: blackData[i],
    pink: pinkData[i],
  }));

  const totalContributions =
    contributions["10s"] * 10 +
    contributions["20s"] * 10 +
    contributions["30s"] * 10 +
    contributions["40s"] * 10 +
    contributions["50s"] * 11;

  const displayIdx = hoveredDataIndex ?? YEARS;
  const displayAge = STARTING_AGE + displayIdx;
  const activeSummaryData = showBlue ? blueData : showBlack ? blackData : pinkData;
  const activeSummaryValue = activeSummaryData[displayIdx];
  const activeSummaryLabel = showBlue
    ? "your compounded + additions value"
    : showBlack
      ? "your compounding-only value"
      : "your savings-only value";
  const summaryColors = showBlue
    ? {
        background: "bg-blue-50",
        label: "text-blue-600",
        value: "text-blue-700",
        detail: "text-blue-500",
      }
    : showBlack
      ? {
          background: "bg-gray-100",
          label: "text-gray-600",
          value: "text-gray-700",
          detail: "text-gray-500",
        }
      : {
          background: "bg-pink-50",
          label: "text-pink-600",
          value: "text-pink-700",
          detail: "text-pink-500",
        };
  const pinkAtDisplay = pinkData[displayIdx];
  const percentDifference = pinkAtDisplay > 0
    ? Math.round(((activeSummaryValue - pinkAtDisplay) / pinkAtDisplay) * 100)
    : null;

  const dataMax = Math.max(
    ...(showBlue ? blueData : [0]),
    ...(showBlack ? blackData : [0]),
    ...(showSavings ? pinkData : [0]),
    0,
  );
  const yStep = (() => {
    const rough = dataMax / 8;
    if (rough <= 0) return 100_000;
    const exp = Math.floor(Math.log10(Math.max(rough, 1)));
    const base = Math.pow(10, exp);
    if (rough / base <= 1) return base;
    if (rough / base <= 2) return 2 * base;
    if (rough / base <= 5) return 5 * base;
    return 10 * base;
  })();
  const yMax = Math.ceil(dataMax / yStep) * yStep;
  const yAxisTicks = Array.from({ length: Math.round(yMax / yStep) + 1 }, (_, i) => i * yStep);

  const handleReset = () => {
    setInitialInvestment(RESET_SETTINGS.initialInvestment);
    setAnnualRate(RESET_SETTINGS.annualRate);
    setContributions({ ...RESET_SETTINGS.contributions });
    setShowSavings(true);
    setShowBlue(false);
    setShowBlack(false);
    setGrowthTableOpen(true);
  };

  const updateContrib = useCallback(
    (key: keyof ContributionsByDecade) => (v: number) => {
      setContributions((prev) => ({ ...prev, [key]: v }));
    },
    []
  );
  const updateAllContribs = useCallback((delta: number) => {
    setContributions((prev) => ({
      "10s": Math.max(0, prev["10s"] + delta),
      "20s": Math.max(0, prev["20s"] + delta),
      "30s": Math.max(0, prev["30s"] + delta),
      "40s": Math.max(0, prev["40s"] + delta),
      "50s": Math.max(0, prev["50s"] + delta),
    }));
  }, []);

  const decadeConfigs: Array<{
    key: keyof ContributionsByDecade;
    label: string;
    step: number;
  }> = [
    { key: "10s", label: "Ages 10–19", step: 100 },
    { key: "20s", label: "Ages 20–29", step: 100 },
    { key: "30s", label: "Ages 30–39", step: 100 },
    { key: "40s", label: "Ages 40–49", step: 100 },
    { key: "50s", label: "Ages 50–59", step: 100 },
  ];

  const renderCustomLegend = () => {
    const items = [
      {
        key: "pink",
        color: PINK,
        label: `Savings-Only (no compounding)`,
        always: showSavings,
      },
      {
        key: "black",
        color: BLACK,
        label: `$${initialInvestment.toLocaleString()} + Interest Only`,
        always: hasContributions,
      },
      {
        key: "blue",
        color: BLUE,
        label: `$${initialInvestment.toLocaleString()}+ Yearly Additions`,
        always: true,
      },
    ].filter((i) => i.always);

    return (
      <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
        {items.map((item) => (
          <button
            key={item.key}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-100 hover:bg-gray-100"
            onMouseEnter={(e) => {
              setHoveredLegend(item.key);
              if (chartSectionRef.current) {
                const sectionRect = chartSectionRef.current.getBoundingClientRect();
                const btnRect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({
                  left: btnRect.left - sectionRect.left,
                  top: btnRect.bottom - sectionRect.top + 8,
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredLegend(null);
              setTooltipPos(null);
            }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm font-medium text-gray-600">{item.label}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-5">
      <div className="w-full px-[50px]">
        {/* Header */}
        <div className="relative mb-4 md:mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={handleQuizOpen}
            aria-haspopup="dialog"
            className="absolute right-0 top-0 text-sm text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            Quiz Mode
          </button>
          <span className="text-lg md:text-xl text-gray-900">
            Power of Compounding
          </span>
          <InlineNumberInput
            value={initialInvestment}
            onChange={setInitialInvestment}
            prefix="$"
            min={0}
            step={100}
            className="text-lg md:text-xl px-3 py-1"
            inputClassName="w-16 text-gray-900 text-lg md:text-xl"
          />
          <span className="text-lg md:text-xl text-gray-900">
            with Yearly Interest of
          </span>
          <InlineNumberInput
            value={annualRate}
            onChange={setAnnualRate}
            suffix="%"
            min={0}
            step={0.5}
            className="text-lg md:text-xl"
            inputClassName="w-[2ch] text-gray-900 text-lg md:text-xl"
          />
        </div>

        {/* Main Card */}
        <div className="bg-white overflow-hidden">

          {/* 3xl side-by-side wrapper: left=chart+controls, right=growth table */}
          <div className="side-by-side-wrapper">
          <div className="side-by-side-left">

          {/* Chart Section */}
          <div ref={chartSectionRef} className="relative p-4 pb-2">
            {renderCustomLegend()}

            {/* Floating explanation tooltip — absolutely positioned, never shifts layout */}
            <AnimatePresence>
              {hoveredLegend && tooltipPos && (
                <motion.div
                  key={hoveredLegend}
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.1 }}
                  className="absolute z-20 w-64 px-4 py-3 rounded-xl text-sm text-gray-700 leading-relaxed pointer-events-none shadow-lg border border-gray-100 bg-white"
                  style={{
                    left: tooltipPos.left,
                    top: tooltipPos.top,
                  }}
                >
                  {hoveredLegend === "pink"
                    ? `The pink line is pure linear savings — no compounding, just adding your yearly contributions to your principal. Good, but nowhere near the power of compound interest.`
                    : EXPLANATIONS[hoveredLegend]}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chartContainerRef} className="relative h-[32vh] md:h-[38vh] xl:h-[44vh] min-h-[220px] max-h-[520px] w-full">
              {/* Floating curve values follow the selected point */}
              {(() => {
                const idx = hoveredDataIndex;
                const row = chartData[idx];
                const blueVal: number = row.blue as number;
                const blackVal: number = row.black as number;
                const pinkVal: number = row.pink as number;
                const label = `Age ${STARTING_AGE + idx}`;
                const tooltipWidth = 170;
                const tooltipEstHeight = 120;
                const gap = 20;
                let left: number;
                let top: number;
                const scales = chartScaleRef.current;
                if (scales) {
                  const curveX = scales.xScale(row.age as string);
                  const curveY = showBlue
                    ? scales.yScale(blueData[idx])
                    : showBlack
                    ? scales.yScale(blackData[idx])
                    : scales.yScale(pinkData[idx]);
                  left = curveX - gap - tooltipWidth;
                  top = curveY - gap - tooltipEstHeight;
                  if (left < 4) left = curveX + gap;
                  if (top < 4) top = curveY + gap;
                } else {
                  const containerWidth = chartContainerRef.current?.clientWidth ?? 600;
                  const plotLeft = 54;
                  const plotWidth = Math.max(100, containerWidth - plotLeft - 24);
                  const xPixel = plotLeft + (idx / YEARS) * plotWidth;
                  left = Math.max(4, xPixel - gap - tooltipWidth);
                  top = 12;
                }
                return (
                  <div
                    className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-xl p-4"
                    style={{ left, top, minWidth: tooltipWidth }}
                  >
                    <p data-testid="chart-tooltip-age" className="text-xs font-semibold text-gray-500 mb-2">
                      {label}
                    </p>
                    {showBlue && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLUE }} />
                        <span className="font-bold text-sm" style={{ color: BLUE }}>{formatCurveMoney(blueVal)}</span>
                      </div>
                    )}
                    {showBlack && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                        <span className="font-bold text-sm" style={{ color: BLACK }}>{formatCurveMoney(blackVal)}</span>
                      </div>
                    )}
                    {showSavings && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PINK }} />
                        <span className="font-bold text-sm" style={{ color: PINK }}>{formatCurveMoney(pinkVal)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 24, left: 10, bottom: 20 }}
                  onMouseMove={(state: any) => {
                    const activeIndex = state?.activeTooltipIndex;
                    if (activeIndex === undefined || activeIndex === null) return;
                    const nextIndex = Number(activeIndex);
                    setChartHoveredIndex((current) => current === nextIndex ? current : nextIndex);
                     setAxisHoveredIndex((current) => current === nextIndex ? current : nextIndex);
                  }}
                   onMouseLeave={() => {
                     setChartHoveredIndex(null);
                     setAxisHoveredIndex(null);
                   }}
                   onClick={(state: any) => {
                     const activeIndex = state?.activeTooltipIndex;
                     if (activeIndex === undefined || activeIndex === null) return;
                     handleAgeChange(Number(activeIndex));
                   }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={true} />
                  <XAxis
                    dataKey="age"
                    tick={(props: { x: number; y: number; payload: { value: string }; index: number }) => {
                      const { x, y, payload, index } = props;
                      const isSelected = index === hoveredDataIndex;
                      const isHovered = index === axisHoveredIndex;
                      const num = payload.value.replace("Age ", "");
                      return (
                        <g
                          onMouseEnter={() => {
                            setAxisHoveredIndex(index);
                            setChartHoveredIndex(index);
                          }}
                          onMouseLeave={() => {
                            setAxisHoveredIndex(null);
                            setChartHoveredIndex(null);
                          }}
                          onClick={() => {
                            handleAgeChange(index);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <rect x={x - 10} y={y} width={20} height={20} fill="transparent" />
                          <text
                            x={x}
                            y={y + 13}
                            textAnchor="middle"
                            fontSize={isSelected ? 11.5 : 10.5}
                            fontWeight={isSelected || isHovered ? "700" : "400"}
                            fill={isSelected || isHovered ? "#111827" : "#9ca3af"}
                          >
                            {num}
                          </text>
                        </g>
                      );
                    }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={0}
                    textAnchor="middle"
                    height={30}
                    label={{
                      content: (props: unknown) => {
                        const { viewBox } = props as { viewBox: { x: number; y: number } };
                        return (
                          <text
                            x={viewBox.x - 11}
                            y={viewBox.y + 25}
                            textAnchor="end"
                            fontSize={10.5}
                            fill="#9ca3af"
                          >
                            AGE
                          </text>
                        );
                      }
                    }}
                  />
                  <YAxis
                    tickFormatter={(v) => formatMoney(v)}
                    tick={(props: any) => <YAxisTick {...props} />}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    ticks={yAxisTicks}
                    domain={[0, yMax]}
                  />
                  <Tooltip
                    content={() => null}
                    cursor={false}
                  />
                  {/* Blue line */}
                  {showBlue && (
                    <Line
                      type="monotone"
                      dataKey="blue"
                      stroke={BLUE}
                      strokeWidth={2.5}
                      dot={(props: any) => props.index === hoveredDataIndex
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill={BLUE} stroke="white" strokeWidth={2} />
                        : <g key={props.key} />}
                      activeDot={false}
                      name="With Contributions"
                      animationDuration={300}
                    />
                  )}
                  {/* Black line */}
                  {showBlack && (
                    <Line
                      type="monotone"
                      dataKey="black"
                      stroke={BLACK}
                      strokeWidth={2}
                      dot={(props: any) => props.index === hoveredDataIndex
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={BLACK} stroke="white" strokeWidth={2} />
                        : <g key={props.key} />}
                      strokeDasharray="6 3"
                      activeDot={false}
                      name="Interest Only"
                      animationDuration={300}
                    />
                  )}
                  {/* Pink line */}
                  {showSavings && (
                    <Line
                      type="monotone"
                      dataKey="pink"
                      stroke={PINK}
                      strokeWidth={2}
                      dot={(props: any) => props.index === hoveredDataIndex
                        ? <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={PINK} stroke="white" strokeWidth={2} />
                        : <g key={props.key} />}
                      strokeDasharray="4 4"
                      activeDot={false}
                      name="Linear Savings"
                      animationDuration={300}
                    />
                  )}
                  {/* Selected-year guide lines drawn via Customized using real chart pixel scales */}
                  <Customized
                    component={(props: any) => {
                      if (!chartData[hoveredDataIndex]) return null;
                      const xAxis = Object.values(props.xAxisMap ?? {})[0] as any;
                      const yAxis = Object.values(props.yAxisMap ?? {})[0] as any;
                      if (!xAxis?.scale || !yAxis?.scale) return null;

                      chartScaleRef.current = { xScale: xAxis.scale, yScale: yAxis.scale };

                      const leftX = xAxis.scale(chartData[0].age);
                      const selectedX = xAxis.scale(chartData[hoveredDataIndex].age);
                      const guideIndex = chartHoveredIndex ?? hoveredDataIndex;
                      if (!chartData[guideIndex]) return null;
                      const guideX = xAxis.scale(chartData[guideIndex].age);
                      const plotTop = yAxis.y;
                      const plotHeight = yAxis.height;

                      const lines: Array<{ y: number; color: string; opacity: number }> = [
                        ...(showBlue
                          ? [{ y: yAxis.scale(blueData[hoveredDataIndex]), color: BLUE, opacity: 0.6 }]
                          : []),
                        ...(showBlack
                          ? [{ y: yAxis.scale(blackData[hoveredDataIndex]), color: BLACK, opacity: 0.45 }]
                          : []),
                        ...(showSavings
                          ? [{ y: yAxis.scale(pinkData[hoveredDataIndex]), color: PINK, opacity: 0.6 }]
                          : []),
                      ];

                      return (
                        <g>
                          <line
                            x1={guideX}
                            y1={plotTop}
                            x2={guideX}
                            y2={plotTop + plotHeight}
                            stroke="#d1d5db"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            opacity={0.8}
                          />
                          {lines.map((l, i) => (
                            <line
                              key={i}
                              x1={leftX}
                              y1={l.y}
                              x2={selectedX}
                              y2={l.y}
                              stroke={l.color}
                              strokeWidth={1}
                              strokeDasharray="4 3"
                              opacity={l.opacity}
                            />
                          ))}
                        </g>
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="border-t border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* Left: Decade inputs + action buttons */}
              <div className="w-full lg:w-2/5" onDoubleClick={(e) => e.stopPropagation()}>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Yearly Additions by Age
                </h2>
                <div className="grid grid-cols-5 gap-1.5">
                  {decadeConfigs.map(({ key, label, step }) => (
                    <DecadeInput
                      key={key}
                      label={label}
                      value={contributions[key]}
                      onChange={updateContrib(key)}
                      onSyncChange={updateAllContribs}
                      step={step}
                      color={BLUE}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowSavings((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal ${showSavings ? "bg-pink-100 text-pink-500 hover:bg-pink-200" : "text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600"}`}
                  >
                    Savings
                  </button>
                  <button
                    onClick={() => setShowBlack((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal ${showBlack ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600"}`}
                  >
                    Compounding
                  </button>
                  <button
                    onClick={() => setShowBlue((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal ${showBlue ? "bg-blue-100 text-blue-600 hover:bg-blue-200" : "text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600"}`}
                  >
                    Compounding+Yearly Inv.
                  </button>
                </div>
              </div>

              {/* Right: Stats cards */}
              <div className="w-full lg:w-3/5 flex flex-col sm:flex-row gap-3 items-stretch">
                {/* Green — Total Added */}
                <div className="flex-1 bg-green-50 rounded-2xl py-2 px-4 text-center flex flex-col justify-center">
                  <p className="text-base font-bold text-green-700 mb-1">
                    ${totalContributions.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 leading-snug">
                    is what you invested<br />across your entire life
                  </p>
                </div>

                {/* Active mode — Return at age */}
                <div className={`flex-1 ${summaryColors.background} rounded-2xl py-2 px-4 text-center flex flex-col justify-center`}>
                  <p data-testid="chart-facing-age" className={`text-xs ${summaryColors.label} mb-0.5 leading-snug`}>
                    Age {displayAge} {activeSummaryLabel} is
                  </p>
                  <p data-testid="summary-return-percentage" className={`text-base font-bold ${summaryColors.value}`}>
                    {percentDifference !== null
                      ? `${Math.abs(percentDifference).toLocaleString()}%`
                      : formatMoney(Math.round(activeSummaryValue / 100) * 100)}
                  </p>
                  {percentDifference !== null && (
                    <p className={`text-xs ${summaryColors.detail} mt-0.5 leading-snug`}>
                      {percentDifference < 0 ? "less" : "larger"} than savings alone
                    </p>
                  )}
                </div>

                {/* Gray — Live hover data broken into 3 sub-columns */}
                {(() => {
                  const idx = hoveredDataIndex ?? YEARS;
                  const ageLabel = `Age ${STARTING_AGE + idx}`;
                  const blueVal = blueData[idx];
                  const blackVal = blackData[idx];
                  const pinkVal = pinkData[idx];
                  const diffBlackPink = blackVal - pinkVal;
                  const diffBlueBlack = blueVal - blackVal;
                  return (
                    <div className="flex-[2] bg-white border border-gray-100 rounded-2xl py-2 px-3 flex flex-col gap-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Col 1 — Savings Only (pink) */}
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] text-gray-500 leading-snug">Savings<br />Only</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PINK }} />
                            <span data-testid="summary-savings-value" className="text-lg font-bold" style={{ color: PINK }}>{formatCurveMoney(pinkVal)}</span>
                          </div>
                        </div>
                        {/* Col 2 — Compounding Only (black) */}
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] text-gray-500 leading-snug">Compounding<br />Only</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                            <span data-testid="summary-compounding-value" className="text-lg font-bold text-gray-800">{formatCurveMoney(blackVal)}</span>
                          </div>
                        </div>
                        {/* Col 3 — Compounding + Yearly (blue) */}
                        <div className="flex flex-col gap-1">
                          <p className="text-[13px] text-gray-500 leading-snug"><span className="whitespace-nowrap">Compounding +</span><br />Yearly Inv.</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLUE }} />
                            <span data-testid="summary-compounding-yearly-value" className="text-lg font-bold" style={{ color: BLUE }}>{formatCurveMoney(blueVal)}</span>
                          </div>
                        </div>
                      </div>
                      {/* Bottom row — delta diff lines (always visible) */}
                      <div className="relative flex w-full gap-4">
                        <div className="flex-1">
                          <div className="group inline-flex items-center gap-1 cursor-default p-2 -m-2">
                            <span className="text-[11px] text-gray-400">△</span>
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PINK }} />
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                            {showSavings && hasContributions && diffBlackPink > 0 && (
                              <span className="text-[13px] text-gray-700">-${(Math.round(diffBlackPink / 100) * 100).toLocaleString()}</span>
                            )}
                            <div className="pointer-events-none absolute left-0 top-full z-50 mt-0 w-72 rounded-xl border border-gray-100 bg-white px-4 py-[22px] text-[13px] leading-snug text-gray-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                              Difference between Compounding Only and Savings Only
                              <div className="mt-2 flex flex-nowrap items-center gap-1 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                                <span className="font-semibold" style={{ color: BLACK }}>{formatCurveMoney(blackVal)}</span>
                                <span className="text-gray-400">–</span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PINK }} />
                                <span className="font-semibold" style={{ color: PINK }}>{formatCurveMoney(pinkVal)}</span>
                                <span className="text-gray-400">=</span>
                                <span className="text-gray-700">-{formatCurveDeltaMoney(diffBlackPink)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="relative group inline-flex items-center gap-1 cursor-default p-2 -m-2">
                            <span className="text-[11px] text-gray-400">△</span>
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLUE }} />
                            {hasContributions && diffBlueBlack > 0 && (
                              <span className="text-[13px] text-gray-700">-${(Math.round(diffBlueBlack / 100) * 100).toLocaleString()}</span>
                            )}
                            <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-0 w-72 -translate-x-1/2 rounded-xl border border-gray-100 bg-white px-4 py-[22px] text-[13px] leading-snug text-gray-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                              Difference between Compounding + Yearly Inv. and Compounding Only
                              <div className="mt-2 flex flex-nowrap items-center gap-1 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLUE }} />
                                <span className="font-semibold" style={{ color: BLUE }}>{formatCurveMoney(blueVal)}</span>
                                <span className="text-gray-400">–</span>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BLACK }} />
                                <span className="font-semibold" style={{ color: BLACK }}>{formatCurveMoney(blackVal)}</span>
                                <span className="text-gray-400">=</span>
                                <span className="text-gray-700">-{formatCurveDeltaMoney(diffBlueBlack)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Lessons + Summary (inside left panel so it sits below chart at 2k) */}
          <div className="border-t border-gray-100">
            {/* Clickable header row */}
            <button
              onClick={() => setLessonsSummaryOpen(o => !o)}
              className="w-full grid grid-cols-[11fr_9fr] items-center px-6 py-[8px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider text-left">💡 Lessons</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">🪙 Summary</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${lessonsSummaryOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Collapsible content */}
            {lessonsSummaryOpen && (
              <div className="px-6 pb-6 grid grid-cols-[11fr_9fr] gap-8">
                {/* Lessons */}
                <div>
                  <ol className="space-y-0">
                    {([
                      <>
                        <button
                          type="button"
                          onClick={() => setExplainerOpen(true)}
                          className="cursor-pointer font-bold text-black no-underline transition-colors hover:text-blue-600 hover:underline hover:decoration-blue-300 hover:underline-offset-2 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-haspopup="dialog"
                        >
                          What is compounding?
                        </button>{" "}
                        Compounding is a type of growth. What is growth? Growth is change across time. The shape of compounded growth looks like a hockey stick vs. linear growth which looks like a straight line.
                      </>,
                      "Compounding is when something grows. That growth gets put back into itself and grows again the next year, this repeats forever so that the growth itself grows faster and larger the longer you compound.",
                      "Start as early as possible, time turns small savings into fortunes",
                      "Consistency beats amount, investing early is better than investing a lot later in life",
                      "Re-invest your dividends so your interest earns more interest",
                      "Patience is your best friend because growth takes time",
                    ] as React.ReactNode[]).map((lesson, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-gray-600">
                        <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                        <span>{lesson}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Summary */}
                <div>
                  <div className="grid grid-cols-[auto_70px_auto] gap-x-6 gap-y-1 w-fit">
                    <div />
                    <span className="text-xs text-gray-400 font-semibold uppercase">Interest:</span>
                    <span className="text-xs text-gray-400 font-semibold uppercase">Your Money:</span>
                    {([
                      { label: "Year 1",  idx: 1 },
                      { label: "Year 30", idx: 20 },
                      { label: "Year 60", idx: 50 },
                    ] as { label: string; idx: number }[]).map(({ label, idx }) => {
                      const money = blueData[idx];
                      const interest = Math.round(blueData[idx - 1] * rate);
                      return (
                        <Fragment key={label}>
                          <span className="text-sm text-gray-500">{label}</span>
                          <span className="text-sm font-semibold text-gray-700 tabular-nums">${interest.toLocaleString()}</span>
                          <span className="text-sm font-semibold text-gray-700 tabular-nums">${Math.round(money).toLocaleString()}</span>
                        </Fragment>
                      );
                    })}
                  </div>
                  {(() => {
                    const millionIdx = blueData.findIndex(v => v >= 1_000_000);
                    const millionAge = millionIdx >= 0 ? STARTING_AGE + millionIdx : null;
                    return (
                      <p className="mt-[22px] text-[13px] text-gray-600">
                        <span className="font-semibold">Compounding at {annualRate}%</span>
                        {' '}your money will double in{' '}
                        <span className="font-semibold">{Math.ceil(Math.log(2) / Math.log(1 + rate))} years</span>
                        {', '}<br />triple in{' '}
                        <span className="font-semibold">{Math.ceil(Math.log(3) / Math.log(1 + rate))} years</span>
                        {', '}quadruple in{' '}
                        <span className="font-semibold">{Math.ceil(Math.log(4) / Math.log(1 + rate))} years</span>
                        {millionAge !== null ? (
                          <>{', '}you earn{' '}<span className="font-semibold">$1 million</span>{' '}at age{' '}<span className="font-semibold">{millionAge}</span></>
                        ) : null}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          </div>{/* end left panel */}

          {/* Right panel: Growth Progression Chart */}
          <div className={`side-by-side-right ${hasVisibleGrowthMode ? "" : "hidden"}`}>
          <div className="growth-table-section border-t border-gray-100">
            <button
              onClick={() => setGrowthTableOpen(o => !o)}
              className="w-full flex items-center justify-between px-6 py-[8px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">📈 Compounding Growth Over Time</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${growthTableOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {growthTableOpen && <div className="px-6 pb-6">
            <div className="growth-table-grid grid grid-cols-1 lg:grid-cols-2 gap-x-8">
              {([{ start: 0, end: 26 }, { start: 26, end: 51 }] as { start: number; end: number }[]).map(({ start, end }, colIdx) => (
                <div key={colIdx} data-testid={`growth-column-${colIdx === 0 ? "first" : "second"}`}>
                  <div className={`grid grid-cols-[32px_80px_80px_1fr] gap-2 pb-1 mb-1 border-b border-gray-100 ${colIdx === 1 ? "hidden lg:grid growth-col-header-2" : ""}`}>
                    <span className="text-[11px] text-gray-400 font-semibold uppercase">Age</span>
                    <HeaderHint
                      label="Yearly Int."
                      hint="The money you get for that year from interest paid to you for your investment"
                    />
                    <HeaderHint
                      label="Money"
                      hint="The total amount of money you now own from all your years of investing"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 font-semibold uppercase flex-1">Growth Over Time</span>
                      <span className="text-[11px] text-gray-400 font-semibold w-20 text-right">% Growth</span>
                    </div>
                  </div>
                  {Array.from({ length: end - start }, (_, i) => {
                    const idx = start + i;
                    const age = STARTING_AGE + idx;
                    const tableData = showBlue
                      ? blueData
                      : showBlack
                        ? blackData
                        : pinkData;
                    const value = tableData[idx];
                    const visibleBarSeries = [
                      showSavings
                        ? { data: pinkData, lightColor: "#fce7f3", activeColor: PINK }
                        : null,
                      showBlack
                        ? { data: blackData, lightColor: "#d1d5db", activeColor: BLACK_BAR }
                        : null,
                      showBlue
                        ? { data: blueData, lightColor: "#b2d8fe", activeColor: "#00d3ff" }
                        : null,
                    ].filter(
                      (series): series is { data: number[]; lightColor: string; activeColor: string } =>
                        series !== null,
                    );
                    const maxVal = Math.max(
                      ...visibleBarSeries.map((series) => series.data[YEARS]),
                      1,
                    );
                    const pct = Math.round((value - initialInvestment) / initialInvestment * 100);
                    const multiplier = value / initialInvestment;
                    const label = idx === 0
                      ? "Starting Principal"
                      : pct >= 100
                      ? `${Math.round(multiplier)}X`
                      : `+${pct}%`;
                    const isHovered = hoveredDataIndex === idx;
                    const isBarHovered = barHoveredIdx === idx;
                    const rowActive = isHovered || isBarHovered;
                    const yearInterest = idx === 0
                      ? null
                      : isSavingsOnly
                        ? 0
                        : Math.round(tableData[idx - 1] * rate);
                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        aria-label={`Show age ${age} on chart`}
                        data-testid="growth-row"
                        data-age={age}
                        data-active={isHovered ? "true" : "false"}
                        className="growth-row grid cursor-pointer grid-cols-[32px_80px_80px_1fr] items-center gap-2 py-px"
                        onClick={() => {
                          handleAgeChange(idx);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleAgeChange(idx);
                          }
                        }}
                      >
                        <span className={`cell-hover text-[12px] ${rowActive ? "font-semibold" : ""}`} style={{ color: rowActive ? "#111827" : "#9ca3af" }}>{age}</span>
                        <span className={`cell-hover text-[12px] tabular-nums ${rowActive ? "font-semibold" : ""}`} style={{ color: rowActive ? "#111827" : "#9ca3af" }}>{yearInterest === null ? "—" : `$${yearInterest.toLocaleString()}`}</span>
                        <span className={`cell-hover text-[12px] tabular-nums ${rowActive ? "font-semibold" : ""}`} style={{ color: rowActive ? "#111827" : "#9ca3af" }}>${Math.round(value).toLocaleString()}</span>
                        <div
                          className="flex items-center gap-1.5 cursor-default"
                          onMouseEnter={() => setBarHoveredIdx(idx)}
                          onMouseLeave={() => setBarHoveredIdx(null)}
                        >
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: rowActive ? "#eeeeee" : "#f6f6f6" }}>
                            <div className="flex h-full w-full">
                              {(() => {
                                let previousWidth = 0;
                                return visibleBarSeries.map((series, seriesIdx) => {
                                  const endpointWidth = Math.max(
                                    previousWidth,
                                    Math.round((series.data[idx] / maxVal) * 100),
                                  );
                                  const segmentWidth = endpointWidth - previousWidth;
                                  previousWidth = endpointWidth;
                                  return (
                                    <div
                                      key={seriesIdx}
                                      className="h-full"
                                      style={{
                                        width: `${segmentWidth}%`,
                                        backgroundColor: isHovered
                                          ? series.activeColor
                                          : series.lightColor,
                                      }}
                                    />
                                  );
                                });
                              })()}
                            </div>
                          </div>
                          <span className={`whitespace-nowrap w-20 text-right ${rowActive ? "font-semibold" : ""} ${idx === 0 ? "text-[10px]" : "text-[12px]"}`} style={{ color: rowActive ? "#111827" : "#9ca3af" }}>{label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            </div>}{/* end collapsible */}
          </div>
          </div>{/* end right panel */}
          </div>{/* end 3xl wrapper */}

        </div>

      </div>
      <CompoundingExplainer
        open={explainerOpen}
        principal={initialInvestment}
        annualRate={annualRate}
        contributions={contributions}
        selectedAgeIndex={hoveredDataIndex}
        showSavings={showSavings}
        showBlack={showBlack}
        showBlue={showBlue}
        onAgeChange={handleAgeChange}
        onClose={handleExplainerClose}
      />
      <QuizMode
        open={quizOpen}
        principal={initialInvestment}
        annualRate={annualRate}
        onClose={handleQuizClose}
      />
    </div>
  );
}
