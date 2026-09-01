import { useEffect, useRef, useState } from "react";
import "./_group.css";

const PRINCIPAL = 7000;
const RATE = 0.15;
const STARTING_AGE = 10;
const ENDING_AGE = 60;
const MAX_STEP = ENDING_AGE - STARTING_AGE;
const CONTRIBUTIONS = {
  "10s": 200,
  "20s": 500,
  "30s": 1000,
  "40s": 2000,
  "50s": 5000,
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function contributionForAge(age: number) {
  if (age <= 19) return CONTRIBUTIONS["10s"];
  if (age <= 29) return CONTRIBUTIONS["20s"];
  if (age <= 39) return CONTRIBUTIONS["30s"];
  if (age <= 49) return CONTRIBUTIONS["40s"];
  return CONTRIBUTIONS["50s"];
}

function buildLinearValues() {
  const values = [PRINCIPAL];
  let current = PRINCIPAL;
  for (let step = 1; step <= MAX_STEP; step += 1) {
    current += contributionForAge(STARTING_AGE + step);
    values.push(current);
  }
  return values;
}

function buildCompoundedValues() {
  const values = [PRINCIPAL];
  let current = PRINCIPAL;
  for (let step = 1; step <= MAX_STEP; step += 1) {
    current *= 1 + RATE;
    current += contributionForAge(STARTING_AGE + step);
    values.push(current);
  }
  return values;
}

export function Panel() {
  const [age, setAge] = useState(STARTING_AGE);
  const panelRef = useRef<HTMLDivElement>(null);

  const step = age - STARTING_AGE;
  const linearValues = buildLinearValues();
  const compoundedValues = buildCompoundedValues();
  const linear = linearValues[step];
  const compound = compoundedValues[step];
  const difference = compound - linear;
  const maxValue = compoundedValues[MAX_STEP];

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const moveYear = (direction: 1 | -1) => {
    setAge((current) => Math.min(ENDING_AGE, Math.max(STARTING_AGE, current + direction)));
  };

  return (
    <div className="min-h-screen bg-slate-100/90 p-6 font-['Inter'] text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="mx-auto mt-8 h-16 max-w-5xl bg-white" />
        <div className="mx-auto mt-4 grid max-w-5xl grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="h-[610px] bg-white" />
          <div className="h-[610px] bg-white" />
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl">
        <div className="absolute inset-0 bg-slate-900/20 blur-xl" />
        <section
          ref={panelRef}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-labelledby="explainer-title"
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              moveYear(1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveYear(-1);
            }
          }}
          className="relative overflow-hidden border border-slate-200 bg-white shadow-2xl outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          <header className="border-b border-slate-100 bg-gradient-to-r from-white via-blue-50/50 to-pink-50/40 px-7 pb-5 pt-6 sm:px-10">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  A visual lesson
                </p>
                <h1 id="explainer-title" className="max-w-2xl text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Visual Explainer Showing Linear Growth vs Compounding Growth
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Watch the same starting money grow in two different ways. Use the arrows to move through time.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close visual explainer"
                className="grid h-9 w-9 shrink-0 place-items-center border border-slate-200 text-xl leading-none text-slate-500 transition hover:border-slate-400 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="border border-slate-200 bg-white/90 px-4 py-2">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Starting principal</span>
                <span className="text-base font-bold text-slate-900">{formatMoney(PRINCIPAL)}</span>
              </div>
              <div className="border border-slate-200 bg-white/90 px-4 py-2">
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Yearly rate</span>
                <span className="text-base font-bold text-slate-900">15%</span>
              </div>
            </div>
          </header>

          <div className="px-7 pb-7 pt-6 sm:px-10 sm:pb-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Time traveler</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  Age {age}
                  <span className="ml-2 text-sm font-medium text-slate-400">
                    {step === 0 ? "Your starting point" : step === 1 ? "One year later" : `${step} years later`}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2" aria-label="Change year">
                <button
                  type="button"
                  aria-label="Go back one year"
                  onClick={() => moveYear(-1)}
                  disabled={step === 0}
                  className="grid h-11 w-11 place-items-center border border-slate-200 bg-white text-xl text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Go forward one year"
                  onClick={() => moveYear(1)}
                  disabled={age === ENDING_AGE}
                  className="grid h-11 w-11 place-items-center border border-blue-200 bg-blue-50 text-xl text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                >
                  ↑
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <article className="border border-pink-200 bg-pink-50/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 bg-pink-500" />
                    <h2 className="font-bold text-pink-900">Linear growth</h2>
                  </div>
                  <span className="bg-white px-2.5 py-1 text-xs font-semibold text-pink-600">Savings-only line</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-pink-900/60">
                  This is the chart&apos;s pink line: yearly additions move steadily without earning interest on earlier growth.
                </p>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-700/60">Your money</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-pink-700">{formatMoney(linear)}</p>
                  </div>
                  <p className="text-right text-xs font-semibold text-pink-700">
                    +{formatMoney(linear - PRINCIPAL)} total growth
                  </p>
                </div>
                <div className="mt-4 h-4 overflow-hidden bg-pink-100">
                  <div
                    className="h-full bg-pink-500 transition-all duration-300"
                    style={{ width: `${Math.max(4, (linear / maxValue) * 100)}%` }}
                  />
                </div>
              </article>

              <article className="border border-blue-200 bg-blue-50/50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 bg-blue-500" />
                    <h2 className="font-bold text-blue-900">Compounding growth</h2>
                  </div>
                  <span className="bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">Chart&apos;s blue line</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-blue-900/60">
                  This is the chart&apos;s blue line: interest grows the money, then yearly additions join in too.
                </p>
                <div className="mt-6 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/60">Your money</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-blue-700">{formatMoney(compound)}</p>
                  </div>
                  <p className="text-right text-xs font-semibold text-blue-700">
                    +{formatMoney(compound - PRINCIPAL)} total growth
                  </p>
                </div>
                <div className="mt-4 h-4 overflow-hidden bg-blue-100">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.max(4, (compound / maxValue) * 100)}%` }}
                  />
                </div>
              </article>
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-3 border border-blue-100 bg-blue-50 px-5 py-4 text-center sm:flex-row sm:text-left">
              <p className="text-sm font-medium leading-5 text-blue-900">
                {step === 0
                  ? "Both paths begin with the same principal shown on the chart."
                  : difference <= 1
                    ? "At first, the two paths look almost the same."
                    : `Compounding is ahead by ${formatMoney(difference)} because the growth joined the next year's starting amount.`}
              </p>
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-blue-600">
                {age === ENDING_AGE ? "You reached age 60" : "Press ↑ for next age"}
              </p>
            </div>

            <div className="mt-5 flex gap-1.5 overflow-x-auto border-y border-slate-100 py-2" aria-label="Choose a year">
              {Array.from({ length: MAX_STEP + 1 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to year ${index}, age ${STARTING_AGE + index}`}
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => setAge(STARTING_AGE + index)}
                  className={`grid h-8 min-w-8 shrink-0 place-items-center border px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                    index === step
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-400 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                >
                  {index}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}