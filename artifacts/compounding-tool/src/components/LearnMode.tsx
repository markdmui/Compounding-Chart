import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/**
 * Page state a step wants in place before its callout opens. The page owns the
 * actual setters; the tour just says what it needs.
 */
export interface LearnStageState {
  reset?: boolean;
  showSavings?: boolean;
  showBlack?: boolean;
  showBlue?: boolean;
  lessonsSummaryOpen?: boolean;
  growthTableOpen?: boolean;
  ageIndex?: number;
  /** force one of the two difference popups open */
  showDelta?: "blackPink" | "blueBlack" | null;
  /** hide the whole growth-over-time panel, not just collapse it */
  growthVisible?: boolean;
  /** open or close the "What is compounding?" explainer dialog */
  explainerOpen?: boolean;
  /** open or close the "What is money?" explainer dialog */
  moneyExplainerOpen?: boolean;
  /** let the page's keyboard shortcuts work while the guide is still open */
  allowShortcuts?: boolean;
}

export interface LearnStep {
  /** matches a data-tour="..." attribute on the page */
  target: string;
  title: string;
  body: string;
  /** alternate copy when the chart is displaying elapsed years */
  yearBody?: string;
  stage?: LearnStageState;
  /** where the callout sits relative to the target */
  place?: "below" | "above" | "insideBottomRight";
  /** fine tuning, in pixels, applied after placement */
  nudge?: { x?: number; y?: number };
  /** extra data-tour targets to outline alongside the main one */
  alsoOutline?: string[];
}

/**
 * Index of the first step that tells the reader about a keyboard shortcut.
 * From here on the page's shortcuts stay live so they can try them without
 * closing the guide. Derived from the index, so stepping backwards turns
 * them off again.
 */
const SHORTCUTS_FROM_STEP = 5;

const STEPS: LearnStep[] = [
  {
    target: "title",
    title: "Your Starting Principal",
    body: "This is your starting money, called the principal. Everything on this page grows out of this one number. Change it and watch every line move. (Scroll to change)",
    stage: {
      reset: true,
      showSavings: true,
      showBlack: false,
      showBlue: false,
      lessonsSummaryOpen: false,
      growthTableOpen: false,
      ageIndex: 0,
      showDelta: null,
      growthVisible: false,
      explainerOpen: false,
    },
    place: "below",
  },
  {
    target: "rate",
    title: "This Is the Interest Rate",
    body: "How fast your money grows. It is the percentage amount your money earns each year for staying invested. A small change here makes a huge difference after many years. Interest changes the compounding lines (grey line), it doesn't affect savings. (Scroll to change)",
    stage: { showSavings: true, showBlack: true, showBlue: false },
    place: "below",
  },
  {
    target: "chart",
    title: "The Shape of Growth",
    body: "The chart runs from age 10 to age 60. Pink savings line is your starting money plus deposits. Grey compounding line is that same money left to grow with interest. Blue line is compounding plus new money added every year. Watch how they diverge as the years go by. (Shortcut key: up and down arrow keys)",
    yearBody: "The chart runs from year 1 to year 50. Pink savings line is your starting money plus deposits. Grey compounding line is that same money left to grow with interest. Blue line is compounding plus new money added every year. Watch how they diverge as the years go by. (Shortcut key: up and down arrow keys)",
    stage: { showSavings: true, showBlack: true, showBlue: true },
    place: "insideBottomRight",
    nudge: { y: -90 },
  },
  {
    target: "inputs",
    title: "What You Add Each Year",
    body: "These boxes are how much you invest each year across your lifetime. Change these values to see how your investments change over time. (Scroll to change)",
    stage: { showSavings: true, showBlack: true, showBlue: true },
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "green",
    title: "Your Lifetime Investments",
    body: "The green box adds up every dollar you invest across your whole life. It stays small compared to what that same money could become through compounding.",
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "valuecard",
    title: "Savings Only",
    body: "With Savings-only turned on, this pink box shows your starting money plus all your deposits. You don’t earn any interest if all you do is save. (Shortcut key: 1)",
    stage: { showSavings: true, showBlack: false, showBlue: false, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-savings"],
  },
  {
    target: "valuecard",
    title: "The Power of Compounding",
    body: "With Compounding-only turned on, this grey box shows your starting money grown with interest each year. Notice how much larger it is compared to Savings alone. (Shortcut key: 2)",
    stage: { showSavings: true, showBlack: true, showBlue: false, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-compounding"],
  },
  {
    target: "valuecard",
    // non-breaking space keeps "Yearly Investments" together on the second line
    title: "Compounding + Yearly Investments",
    body: "This box shows how powerful compounding is when you pair it with additional investments each year on top of compounding. Notice how much larger it is than Compounding alone and how it dwarfs Savings. (Shortcut key: 3)",
    stage: { showSavings: true, showBlack: true, showBlue: true, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-blue"],
  },
  {
    target: "modes",
    title: "Three Ways to Grow Money",
    body: "This box on the chart shows all three side-by-side at the age you have selected. Pink is plain savings, black is compounding on its own, and blue is compounding plus what you add each year.",
    yearBody: "This box on the chart shows all three side-by-side at the year you have selected. Pink is plain savings, black is compounding on its own, and blue is compounding plus what you add each year.",
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "delta1",
    title: "What Compounding Is Worth",
    body: "This first delta/difference is compounding on its own minus savings. It is the money you get purely from letting growth build on growth, without adding a single extra dollar.",
    stage: { showDelta: "blackPink", ageIndex: 50 },
    place: "above",
  },
  {
    target: "delta2",
    title: "What Adding Money Is Worth",
    body: "This second delta/difference is compounding plus yearly investing minus compounding on its own. It is what your yearly additions are worth once they have compounded too.",
    stage: { showDelta: "blueBlack", ageIndex: 50 },
    place: "above",
  },
  {
    target: "lessons",
    title: "The Lessons",
    body: "Seven key ideas worth remembering. The most important one is the first: knowing what money is at its core is key to being a good investor and achieving financial independence.",
    stage: { lessonsSummaryOpen: true, showDelta: null, growthVisible: true },
    place: "above",
  },
  {
    target: "summary",
    title: "The Quick Summary",
    body: "The money you earn from interest each year, how much you have at that year, and how long it takes your money to double, triple, and quadruple at this rate.",
    stage: { lessonsSummaryOpen: true },
    place: "above",
  },
  {
    target: "growth",
    title: "Year by Year",
    body: "Every single year from age 10 to 60. The bars show the same story as the chart, growing slowly at first and then racing away. Click any row to jump the chart to that age.",
    yearBody: "Every single year from year 1 to 50. The bars show the same story as the chart, growing slowly at first and then racing away. Click any row to jump the chart to that year.",
    stage: { growthTableOpen: true, explainerOpen: false },
    place: "insideBottomRight",
  },
  {
    target: "whatis",
    title: "Same Start, 3 Kinds of Growth",
    body: "A side by side comparison is a helpful tool when trying to understand complicated things. Use the up and down arrows to see how each changes in relation to one another. (Shortcut key: C)",
    stage: { lessonsSummaryOpen: true, explainerOpen: true },
    place: "above",
    alsoOutline: ["explainer"],
  },
  {
    target: "money-link",
    title: "An Intro to Money",
    body: "Many kids never learn what money is or why it matters. They learn that money is something you spend, that it lets you buy things, and that you should save it. All of that is true - but those ideas describe what you do with money, not what money is. When you start with first principles - understanding what money actually represents - you can make better decisions with it. That is the foundation for becoming a responsible saver, spender, and investor. (Shortcut key: M)",
    stage: {
      lessonsSummaryOpen: true,
      explainerOpen: false,
      moneyExplainerOpen: true,
    },
    place: "above",
    alsoOutline: ["money-explainer"],
  },
];

function readRect(target: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
}

const CALLOUT_WIDTH = 340;
const CALLOUT_HEIGHT = 200;
const CALLOUT_GAP = 16;
const CALLOUT_INSET = 24;
/**
 * Footer navigation. Deliberately as faint as the "3 of 16" counter beside it:
 * there when the reader wants it, never competing with the slide copy.
 */
function FooterLink({
  label,
  keyHint,
  onClick,
  disabled,
  emphasis,
  done,
}: {
  label: string;
  keyHint: string;
  onClick: () => void;
  disabled?: boolean;
  /** one shade darker, for the link that carries the walkthrough forward */
  emphasis?: boolean;
  done?: boolean;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`rounded-md px-2 py-1 text-xs transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 ${
          done
            ? "text-slate-900 hover:text-slate-950 focus-visible:text-slate-950"
            : emphasis
            ? "text-slate-500 hover:text-slate-800 focus-visible:text-slate-800"
            : "text-slate-400 hover:text-slate-600 focus-visible:text-slate-600"
        }`}
      >
        {label}
      </button>
      {/* Above the link: the callout clips its own overflow, so a tooltip
          hanging below the footer gets cut off at the bottom edge. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {keyHint}
      </span>
    </span>
  );
}

const SHORTCUT_TIP_CLASSES =
  "inline-block whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-slate-600";

interface LearnModeProps {
  open: boolean;
  onClose: () => void;
  onStage: (stage: LearnStageState) => void;
  timeMode: "age" | "year";
  onChartNavigate?: (delta: number) => void;
}

export function LearnMode({
  open,
  onClose,
  onStage,
  timeMode,
  onChartNavigate,
}: LearnModeProps) {
  const [step, setStep] = useState(0);
  const [spots, setSpots] = useState<
    { top: number; left: number; width: number; height: number }[]
  >([]);
  const [callout, setCallout] = useState<{ x: number; y: number } | null>(null);

  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;
  const onChartNavigateRef = useRef(onChartNavigate);
  onChartNavigateRef.current = onChartNavigate;

  const current = STEPS[step];
  const currentTargetRef = useRef("");
  currentTargetRef.current = current.target;

  const isLast = step === STEPS.length - 1;
  const currentBody =
    timeMode === "year" && current.yearBody ? current.yearBody : current.body;
  const shortcutMatch = currentBody.match(
    /^(.*?)(\((?:Shortcut key): [^)]+\)|\(Scroll to change\))$/,
  );

  const calloutRef = useRef<HTMLElement | null>(null);

  const measure = useCallback(
    (
      target: string,
      place?: LearnStep["place"],
      nudge?: LearnStep["nudge"],
      extras: string[] = []
    ) => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (!el) {
        setSpots([]);
        setCallout(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const boxes = [rect, ...extras.map(readRect)]
        .filter((r): r is DOMRect => r !== null)
        .map((r) => ({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        }));
      setSpots(boxes);

      // Use the callout's real height once it exists, so a taller box never
      // ends up sitting on top of the thing it is pointing at.
      const height = calloutRef.current?.offsetHeight ?? CALLOUT_HEIGHT;
      const nudgeX = nudge?.x ?? 0;
      const nudgeY = nudge?.y ?? 0;

      const clampX = (x: number) =>
        Math.max(
          CALLOUT_GAP,
          Math.min(window.innerWidth - CALLOUT_WIDTH - CALLOUT_GAP, x + nudgeX)
        );
      const clampY = (y: number) =>
        Math.max(
          CALLOUT_GAP,
          Math.min(window.innerHeight - height - CALLOUT_GAP, y + nudgeY)
        );

      if (place === "insideBottomRight") {
        // tucked into the bottom right corner of the target itself
        setCallout({
          x: clampX(rect.right - CALLOUT_WIDTH - CALLOUT_INSET),
          y: clampY(rect.bottom - height - CALLOUT_INSET),
        });
        return;
      }

      if (place === "above") {
        // never let the bottom edge cover the target
        const ceiling = rect.top - height - CALLOUT_GAP;
        setCallout({ x: clampX(rect.left), y: Math.min(clampY(ceiling), ceiling) });
        return;
      }

      setCallout({ x: clampX(rect.left), y: clampY(rect.bottom + CALLOUT_GAP) });
    },
    []
  );

  // Put the page into the state this step needs, bring the target on screen,
  // then measure it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    onStageRef.current({
      ...(current.stage ?? {}),
      allowShortcuts: step >= SHORTCUTS_FROM_STEP,
    });

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${current.target}"]`
      );
      el?.scrollIntoView({ behavior: "auto", block: "center" });
      measure(current.target, current.place, current.nudge, current.alsoOutline);
    }, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, current, measure]);

  // The first pass positions with an estimate; this second pass uses the real
  // rendered height.
  useLayoutEffect(() => {
    if (!open || !callout) return;
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${current.target}"]`
    );
    const height = calloutRef.current?.offsetHeight;
    if (!el || !height) return;
    if (current.place === "above") {
      const wanted = Math.max(
        CALLOUT_GAP,
        el.getBoundingClientRect().top -
          height -
          CALLOUT_GAP +
          (current.nudge?.y ?? 0)
      );
      if (Math.abs(wanted - callout.y) > 1) {
        setCallout((prev) => (prev ? { ...prev, y: wanted } : prev));
      }
    }
  }, [open, callout, current]);

  // Keep the outline glued to the target if the window moves under it, or if
  // the target changes size on its own — the money dialog grows when its
  // "control, power, freedom, time, and knowledge" link opens the five values
  // panel, and the outline has to grow with it.
  useEffect(() => {
    if (!open) return;
    const remeasure = () =>
      measure(current.target, current.place, current.nudge, current.alsoOutline);
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    const observer = new ResizeObserver(remeasure);
    // The step's stage paints first, so wait a tick for the targets to exist.
    const timer = window.setTimeout(() => {
      for (const name of [current.target, ...(current.alsoOutline ?? [])]) {
        const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
        if (el) observer.observe(el);
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [open, current, measure]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setStep((prev) => Math.max(prev - 1, 0));
      } else if (
        (event.key === "ArrowUp" || event.key === "ArrowDown") &&
        currentTargetRef.current === "chart"
      ) {
        event.preventDefault();
        onChartNavigateRef.current?.(event.key === "ArrowUp" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const goNext = useCallback(() => {
    setStep((prev) => (prev >= STEPS.length - 1 ? prev : prev + 1));
  }, []);

  const goPrev = useCallback(() => {
    setStep((prev) => (prev <= 0 ? prev : prev - 1));
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120]" role="presentation">
      {/* Outline around whatever this step is talking about */}
      {spots.map((spot, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-xl border border-blue-500/70 bg-blue-50/20"
          style={{
            top: spot.top - 6,
            left: spot.left - 6,
            width: spot.width + 12,
            height: spot.height + 12,
            boxShadow:
              "0 0 0 4px rgba(59, 130, 246, 0.10), 0 8px 24px rgba(30, 64, 175, 0.10)",
          }}
        />
      ))}

      {callout && (
        <section
          ref={calloutRef}
          role="dialog"
          aria-labelledby="learn-mode-title"
          className="pointer-events-auto absolute w-[340px] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl"
          style={{
            left: callout.x,
            top: callout.y,
            boxShadow:
              "0 18px 45px rgba(15, 23, 42, 0.16), 0 0 0 4px rgba(59, 130, 246, 0.08)",
          }}
        >
          <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500" />
          <div className="p-[22px]">
            <div className="flex items-start justify-between gap-3">
              <h2 id="learn-mode-title" className="text-base text-gray-900">
                {current.title}
              </h2>
              <button
                type="button"
                aria-label="Close the walkthrough"
                onClick={onClose}
                className="-mr-2 -mt-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg leading-none text-slate-400 transition hover:bg-blue-50 hover:text-slate-900"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {shortcutMatch ? (
                <>
                  {shortcutMatch[1].trimEnd()}{" "}
                  <span className={SHORTCUT_TIP_CLASSES}>
                    {shortcutMatch[2]}
                  </span>
                </>
              ) : (
                currentBody
              )}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div
                className="h-full rounded-full bg-blue-400 transition-[width] duration-200"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {step + 1} of {STEPS.length}
              </span>
              <div className="flex items-center gap-1">
                <FooterLink label="Close" keyHint="Esc" onClick={onClose} />
                <FooterLink
                  label="Previous"
                  keyHint="←"
                  onClick={goPrev}
                  disabled={step === 0}
                />
                <FooterLink
                  label={isLast ? "Done" : "Next"}
                  keyHint={isLast ? "Esc" : "→"}
                  onClick={isLast ? onClose : goNext}
                  emphasis={!isLast}
                  done={isLast}
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>,
    document.body
  );
}