import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";

interface CompoundingExplainerProps {
  open: boolean;
  principal: number;
  annualRate: number;
  contributions: ContributionsByDecade;
  selectedAgeIndex: number;
  showSavings: boolean;
  showBlack: boolean;
  showBlue: boolean;
  timeMode: "age" | "year";
  onAgeChange: (index: number) => void;
  onClose: () => void;
}

interface ContributionsByDecade {
  "10s": number;
  "20s": number;
  "30s": number;
  "40s": number;
  "50s": number;
}

const STARTING_AGE = 10;
const ENDING_AGE = 60;
const MAX_STEP = ENDING_AGE - STARTING_AGE;
type ComparisonKind = "total" | "step" | "growth";

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString()}`;
}

function contributionForAge(age: number, contributions: ContributionsByDecade) {
  if (age >= 10 && age <= 19) return contributions["10s"];
  if (age >= 20 && age <= 29) return contributions["20s"];
  if (age >= 30 && age <= 39) return contributions["30s"];
  if (age >= 40 && age <= 49) return contributions["40s"];
  if (age >= 50 && age <= 60) return contributions["50s"];
  return 0;
}

function buildLinearValues(principal: number, contributions: ContributionsByDecade) {
  const values = [principal];
  let current = principal;
  for (let step = 1; step <= MAX_STEP; step += 1) {
    current += contributionForAge(STARTING_AGE + step, contributions);
    values.push(current);
  }
  return values;
}

function buildCompoundingOnlyValues(principal: number, rate: number) {
  const values = [principal];
  let current = principal;
  for (let step = 1; step <= MAX_STEP; step += 1) {
    current *= 1 + rate;
    values.push(current);
  }
  return values;
}

function buildCompoundedWithContributionsValues(
  principal: number,
  rate: number,
  contributions: ContributionsByDecade,
) {
  const values = [principal];
  let current = principal;
  for (let step = 1; step <= MAX_STEP; step += 1) {
    current *= 1 + rate;
    current += contributionForAge(STARTING_AGE + step, contributions);
    values.push(current);
  }
  return values;
}

interface MiniGrowthLineProps {
  values: number[];
  selectedStep: number;
  maxGrowth: number;
  color: string;
  label: string;
  selectedTimelineLabel: string;
  heightScale?: number;
}

function MiniGrowthLine({
  values,
  selectedStep,
  maxGrowth,
  color,
  label,
  selectedTimelineLabel,
  heightScale = 1,
}: MiniGrowthLineProps) {
  const startingValue = values[0] ?? 0;
  const finalValue = values[values.length - 1] ?? startingValue;
  const finalGrowth = Math.max(0, finalValue - startingValue);
  const growthRatio = maxGrowth > 0 ? finalGrowth / maxGrowth : 0;
  const amplitude = (18 + Math.sqrt(Math.min(1, growthRatio)) * 92) * heightScale;
  const baseline = 112;
  const width = 100;
  const height = 128;
  const yForValue = (value: number) => {
    const progress =
      finalGrowth > 0
        ? Math.max(0, Math.min(1, (value - startingValue) / finalGrowth))
        : 0;
    return baseline - progress * amplitude;
  };
  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? 4
        : 4 + (index / (values.length - 1)) * 92;
    const y = yForValue(value);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const path =
    points.length === 1
      ? `M ${points[0]} L 96,${baseline}`
      : `M ${points.join(" L ")}`;
  const markerIndex = Math.min(values.length - 1, Math.max(0, selectedStep));
  const markerX =
    values.length === 1 ? 4 : 4 + (markerIndex / (values.length - 1)) * 92;
  const markerY = yForValue(values[markerIndex] ?? startingValue);

  return (
    <figure
      className="relative h-[108px] w-full"
      role="img"
      aria-label={`${label} growth trajectory through ${selectedTimelineLabel}`}
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.35"
        />
      </svg>
      <span
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${markerX}%`,
          top: `${(markerY / height) * 100}%`,
          backgroundColor: color,
        }}
        aria-hidden="true"
      />
    </figure>
  );
}

export function CompoundingExplainer({
  open,
  principal,
  annualRate,
  contributions,
  selectedAgeIndex,
  showSavings,
  showBlack,
  showBlue,
  timeMode,
  onAgeChange,
  onClose,
}: CompoundingExplainerProps) {
  const [comparisonHover, setComparisonHover] = useState<ComparisonKind | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectedAgeIndexRef = useRef(selectedAgeIndex);
  const onAgeChangeRef = useRef(onAgeChange);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const step = Math.min(MAX_STEP, Math.max(0, selectedAgeIndex));
  const age = STARTING_AGE + step;
  const selectedTimelineLabel =
    timeMode === "year"
      ? `year ${step}`
      : `age ${age}`;
  const visibleCardCount = [showSavings, showBlack, showBlue].filter(Boolean).length;
  const cardGridColumns =
    visibleCardCount === 3
      ? "md:grid-cols-3"
      : visibleCardCount === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-1";
  selectedAgeIndexRef.current = step;
  onAgeChangeRef.current = onAgeChange;

  const rate = Math.max(0, annualRate) / 100;
  const safePrincipal = Math.max(0, principal);
  const linearValues = buildLinearValues(safePrincipal, contributions);
  const compoundingOnlyValues = buildCompoundingOnlyValues(safePrincipal, rate);
  const compoundedWithContributionsValues = buildCompoundedWithContributionsValues(
    safePrincipal,
    rate,
    contributions,
  );
  const linear = linearValues[step];
  const compoundingOnly = compoundingOnlyValues[step];
  const compoundedWithContributions = compoundedWithContributionsValues[step];
  const yearlyAddition = step > 0 ? contributionForAge(age, contributions) : 0;
  const linearStepChange =
    step > 0 ? linear - linearValues[step - 1] : 0;
  const compoundingInterest =
    step > 0
      ? compoundingOnly - compoundingOnlyValues[step - 1]
      : 0;
  const compoundedInterest =
    step > 0
      ? compoundedWithContributionsValues[step - 1] * rate
      : 0;
  const maxValue = Math.max(
    ...compoundingOnlyValues,
    ...compoundedWithContributionsValues,
    ...linearValues,
    1,
  );
  const finalMaxGrowth = Math.max(
    linearValues[linearValues.length - 1],
    compoundingOnlyValues[compoundingOnlyValues.length - 1],
    compoundedWithContributionsValues[compoundedWithContributionsValues.length - 1],
  ) - safePrincipal;

  const moveYear = (direction: 1 | -1) => {
    const nextStep = Math.min(MAX_STEP, Math.max(0, selectedAgeIndexRef.current + direction));
    selectedAgeIndexRef.current = nextStep;
    onAgeChangeRef.current(nextStep);
  };

  const comparisonValueClass = (kind: ComparisonKind) =>
    `inline-block ${
      comparisonHover === kind
        ? "bg-white outline outline-1 outline-slate-500 outline-offset-2"
        : ""
    }`;

  const comparisonValueHandlers = (kind: ComparisonKind) => ({
    onMouseEnter: () => setComparisonHover(kind),
    onMouseLeave: () => setComparisonHover(null),
  });

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    setDragOffset({ x: 0, y: 0 });

    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveYear(1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveYear(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  };

  const handleDragEnd = (event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderAgeButton = (index: number) => {
    const visibleLabel =
      timeMode === "year" ? index : STARTING_AGE + index;
    const accessibleLabel =
      timeMode === "year"
        ? `Go to year ${index}`
        : `Go to age ${STARTING_AGE + index}`;

    return (
      <button
        key={index}
        type="button"
        aria-label={accessibleLabel}
        aria-current={index === step ? "step" : undefined}
        onClick={() => onAgeChange(index)}
        style={{
          color: "#9ca3af",
          fontFamily: "inherit",
          fontSize: "12px",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 400,
        }}
        className="grid h-6 w-auto place-items-center border-0 px-0 transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center p-0.5 ${
            index === step
              ? "bg-gray-500 text-white"
              : "text-gray-400 hover:text-black hover:outline hover:outline-1 hover:outline-gray-400 hover:outline-offset-2"
          }`}
        >
          {visibleLabel}
        </span>
      </button>
    );
  };

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-3 sm:p-0"
      role="presentation"
    >
      <section
        ref={dialogRef}
        data-tour="explainer"
        role="dialog"
        aria-modal="false"
        aria-labelledby="compounding-explainer-title"
        aria-describedby="compounding-explainer-description"
        tabIndex={-1}
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          fontFamily: "inherit",
        }}
        className="pointer-events-auto relative max-h-[94vh] w-[calc(90%+9px)] max-w-[calc(46.656rem+9px)] overflow-y-auto border border-slate-200 bg-white p-[10px] shadow-2xl outline-none md:w-[calc(64.8%+9px)]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-30 w-4 cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-30 w-4 cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 z-30 h-4 cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <header
          className="select-text cursor-move touch-none bg-white px-5 pb-2 pt-4 sm:px-9 sm:pt-5"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div
            className="flex items-start justify-between gap-4"
          >
            <div>
              <h2
                id="compounding-explainer-title"
                className="max-w-2xl text-lg text-gray-900 md:text-xl"
              >
                Visually Compare All Three
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Next year"
                onClick={() => moveYear(1)}
                disabled={age >= ENDING_AGE}
                className={`group relative grid h-8 w-10 place-items-center text-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 ${
                  age >= ENDING_AGE
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-transparent hover:text-black"
                }`}
              >
                <svg aria-hidden="true" width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M8 0L16 10H0L8 0Z" fill="currentColor" />
                </svg>
                {age < ENDING_AGE && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 -mb-1 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[10px] font-normal text-slate-500 opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="block">up arrow</span>
                    <span className="block">(next year)</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label="Previous year"
                onClick={() => moveYear(-1)}
                disabled={age <= STARTING_AGE}
                className={`group relative grid h-8 w-10 place-items-center text-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 ${
                  age <= STARTING_AGE
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-transparent hover:text-black"
                }`}
              >
                <svg aria-hidden="true" width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M8 10L0 0H16L8 10Z" fill="currentColor" />
                </svg>
                {age > STARTING_AGE && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 -mb-1 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[10px] font-normal text-slate-500 opacity-0 transition-opacity duration-75 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="block">down arrow</span>
                    <span className="block">(prev year)</span>
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label="Close visual explainer"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center text-xl leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                ×
              </button>
            </div>
          </div>

          <p
            id="compounding-explainer-description"
            className="mt-1 max-w-none text-sm leading-6 text-slate-500"
          >
            <span>All 3 investment types start with the same money.</span>
            <br />
            <span>Press the up and down arrows to see how they change over time.</span>
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <div className="bg-white py-1">
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                Starting principal
              </span>
              <span className="text-sm font-bold text-slate-900 sm:text-base">
                {formatMoney(safePrincipal)}
              </span>
            </div>
            <div className="bg-white py-1">
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                Yearly rate of compounding
              </span>
              <span className="text-sm font-bold text-slate-900 sm:text-base">
                {annualRate.toLocaleString()}%
              </span>
            </div>
          </div>
        </header>

        <div className="px-5 pb-3 pt-1 sm:px-9 sm:pb-4 sm:pt-1">
          <div className={`mt-1 grid gap-x-1 gap-y-3 ${cardGridColumns}`}>
            {showSavings && (
            <article className="flex min-h-[380px] flex-col bg-pink-50/50 p-5">
              <div className="-mx-5 -mt-5 mb-4 h-4 overflow-hidden bg-pink-100" aria-label="Savings progress">
                <div
                  className="h-full bg-pink-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, (linear / maxValue) * 100)}%` }}
                />
              </div>
              <div className="flex min-h-6 flex-wrap items-start justify-between gap-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-normal text-pink-900 md:whitespace-nowrap">Linear growth</h3>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-[1.15rem] text-pink-900/60">
                The pink savings-only line is yearly additions that move forward steadily without earning interest on earlier growth.
              </p>
              <div className="mt-auto">
                <MiniGrowthLine
                  values={linearValues}
                  selectedStep={step}
                  maxGrowth={finalMaxGrowth}
                  color="#db2777"
                  label="Linear"
                  selectedTimelineLabel={selectedTimelineLabel}
                />
                <p className="mt-1 text-3xl font-bold tracking-tight text-pink-700">
                  <span
                    className={comparisonValueClass("total")}
                    {...comparisonValueHandlers("total")}
                  >
                    {formatMoney(linear)}
                  </span>
                </p>
                <p className="mt-2 text-left text-[11px] font-normal leading-5 text-pink-700">
                  Growth:
                </p>
                <p className="flex items-center gap-1 whitespace-nowrap text-left text-[13px] font-semibold leading-5 text-pink-700">
                  <span
                    className={comparisonValueClass("step")}
                    {...comparisonValueHandlers("step")}
                  >
                    +{formatMoney(linearStepChange)}
                  </span>
                  <span
                    className={comparisonValueClass("growth")}
                    {...comparisonValueHandlers("growth")}
                  >
                    = {formatMoney(linear - safePrincipal)}
                  </span>
                </p>
              </div>
            </article>
            )}

            {showBlack && (
            <article className="flex min-h-[380px] flex-col bg-gray-100 p-5">
              <div className="-mx-5 -mt-5 mb-4 h-4 overflow-hidden bg-gray-200" aria-label="Compounding progress">
                <div
                  className="h-full bg-gray-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, (compoundingOnly / maxValue) * 100)}%` }}
                />
              </div>
              <div className="flex min-h-6 flex-wrap items-start justify-between gap-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-normal text-gray-800 md:whitespace-nowrap">Compounding only</h3>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-[1.15rem] text-gray-700/70">
                The gray compounding-only line is interest earned on your starting money without adding new contributions.
              </p>
              <div className="mt-auto">
                <MiniGrowthLine
                  values={compoundingOnlyValues}
                  selectedStep={step}
                  maxGrowth={finalMaxGrowth}
                  color="#9ca3af"
                  label="Compounding-only"
                  selectedTimelineLabel={selectedTimelineLabel}
                  heightScale={0.8}
                />
                <p className="mt-1 text-3xl font-bold tracking-tight text-gray-700">
                  <span
                    className={comparisonValueClass("total")}
                    {...comparisonValueHandlers("total")}
                  >
                    {formatMoney(compoundingOnly)}
                  </span>
                </p>
                <p className="mt-2 text-left text-[11px] font-normal leading-5 text-gray-700">
                  Growth:
                </p>
                <p className="flex items-center gap-1 whitespace-nowrap text-left text-[13px] font-semibold leading-5 text-gray-700">
                  <span
                    className={comparisonValueClass("step")}
                    {...comparisonValueHandlers("step")}
                  >
                    +{formatMoney(compoundingInterest)}
                  </span>
                  <span
                    className={comparisonValueClass("growth")}
                    {...comparisonValueHandlers("growth")}
                  >
                    = {formatMoney(compoundingOnly - safePrincipal)}
                  </span>
                </p>
              </div>
            </article>
            )}

            {showBlue && (
            <article className="flex min-h-[380px] flex-col bg-blue-50/50 p-5">
              <div className="-mx-5 -mt-5 mb-4 h-4 overflow-hidden bg-blue-100" aria-label="Compounding plus yearly investments progress">
                <div
                  className="h-full bg-blue-500 transition-[width] duration-300"
                  style={{ width: `${Math.max(4, (compoundedWithContributions / maxValue) * 100)}%` }}
                />
              </div>
              <div className="flex min-h-6 flex-wrap items-start justify-between gap-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-normal text-blue-900 md:whitespace-nowrap">Compounding + yearly Inv.</h3>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-[1.15rem] text-blue-900/60">
                The blue compounding-plus-investments line is interest earned on your money plus your yearly additions
              </p>
              <div className="mt-auto">
                <MiniGrowthLine
                  values={compoundedWithContributionsValues}
                  selectedStep={step}
                  maxGrowth={finalMaxGrowth}
                  color="#3b82f6"
                  label="Compounding plus yearly investing"
                  selectedTimelineLabel={selectedTimelineLabel}
                />
                <p className="mt-1 text-3xl font-bold tracking-tight text-blue-700">
                  <span
                    className={comparisonValueClass("total")}
                    {...comparisonValueHandlers("total")}
                  >
                    {formatMoney(compoundedWithContributions)}
                  </span>
                </p>
                <p className="mt-2 text-left text-[11px] font-normal leading-5 text-blue-700">
                  Growth:
                </p>
                <p className="flex items-center gap-1 whitespace-nowrap text-left text-[13px] font-semibold leading-5 text-blue-700">
                  <span
                    className={comparisonValueClass("step")}
                    {...comparisonValueHandlers("step")}
                  >
                    +{formatMoney(compoundedInterest)} +{formatMoney(yearlyAddition)}
                  </span>
                  <span
                    className={comparisonValueClass("growth")}
                    {...comparisonValueHandlers("growth")}
                  >
                    = {formatMoney(compoundedWithContributions - safePrincipal)}
                  </span>
                </p>
              </div>
            </article>
            )}
          </div>

          <div
            className="mt-3 grid w-full gap-y-px overflow-hidden py-1"
            aria-label={timeMode === "year" ? "Choose a year" : "Choose an age"}
          >
            <div
              className="grid grid-cols-[repeat(25,max-content)] justify-between gap-0"
              aria-label={
                timeMode === "year"
                  ? "Years 0 through 24"
                  : "Ages 10 through 34"
              }
            >
              {Array.from({ length: 25 }, (_, index) => renderAgeButton(index))}
            </div>
            <div
              className="grid grid-cols-[repeat(26,max-content)] justify-between gap-0"
              aria-label={
                timeMode === "year"
                  ? "Years 25 through 50"
                  : "Ages 35 through 60"
              }
            >
              {Array.from({ length: 26 }, (_, index) => renderAgeButton(index + 25))}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}