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
}

export interface LearnStep {
  /** matches a data-tour="..." attribute on the page */
  target: string;
  title: string;
  body: string;
  stage?: LearnStageState;
  /** where the callout sits relative to the target */
  place?: "below" | "above" | "insideBottomRight";
  /** fine tuning, in pixels, applied after placement */
  nudge?: { x?: number; y?: number };
  /** extra data-tour targets to outline alongside the main one */
  alsoOutline?: string[];
}

const STEPS: LearnStep[] = [
  {
    target: "title",
    title: "Your Starting Principal",
    body: "This is your starting money, called the principal. Everything on this page grows out of this one number. Change it and watch every line move.",
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
    body: "How fast it grows. It is the percentage amount your money earns each year for staying invested. A small change here makes a huge difference after many years.",
    place: "below",
  },
  {
    target: "chart",
    title: "The Shape of Growth",
    body: "Age 10 on the left, age 60 on the right. Right now only the pink savings line is showing, and it is almost straight. That is money added to a pile with nothing earned on top.",
    place: "insideBottomRight",
    nudge: { y: -90 },
  },
  {
    target: "inputs",
    title: "What You Add Each Year",
    body: "These five boxes are how much you invest each year during your teens, twenties, thirties, forties and fifties. Most people can add more as they get older.",
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "green",
    title: "Your Lifetime Investments",
    body: "The green box adds up every dollar you invest across your whole life. Keep an eye on it. It stays surprisingly small compared to what you end up with.",
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "valuecard",
    title: "Savings Only",
    body: "Right now only plain Savings is switched on, so this box is pink. It shows what your pile is worth at the age you have picked, with nothing earned on top of what you've added over the years.",
    stage: { showSavings: true, showBlack: false, showBlue: false, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-savings"],
  },
  {
    target: "valuecard",
    title: "The Power of Compounding",
    body: "Now switch on the grey Compounding button. Same money, same years, but your money starts earning on top of what it already earned. This box turns grey and shows how much bigger that is than just savings alone.",
    stage: { showSavings: true, showBlack: true, showBlue: false, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-compounding"],
  },
  {
    target: "valuecard",
    // non-breaking space keeps "Yearly Investments" together on the second line
    title: "Compounding + Yearly Investments",
    body: "Now add your yearly investments on top. Compounding alone only grows the money you started with. This grows that money and every new dollar you add, because each one starts compounding the moment it goes in. That is why the blue number is so much bigger.",
    stage: { showSavings: true, showBlack: true, showBlue: true, ageIndex: 50 },
    place: "above",
    nudge: { y: -15 },
    alsoOutline: ["btn-blue"],
  },
  {
    target: "modes",
    title: "Three Ways to Grow Money",
    body: "This grey box shows all three side by side at the age you picked. Pink is plain saving, black is compounding on its own, and blue is compounding plus what you add each year.",
    place: "above",
    nudge: { y: -15 },
  },
  {
    target: "delta1",
    title: "What Compounding Is Worth",
    body: "This first difference is compounding on its own minus plain saving. It is the money you get purely from letting growth build on growth, without adding a single extra dollar.",
    stage: { showDelta: "blackPink", ageIndex: 50 },
    place: "above",
  },
  {
    target: "delta2",
    title: "What Adding Money Is Worth",
    body: "This second difference is compounding plus yearly investing minus compounding on its own. It is what your yearly additions are worth once they have compounded too.",
    stage: { showDelta: "blueBlack", ageIndex: 50 },
    place: "above",
  },
  {
    target: "lessons",
    title: "The Lessons",
    body: "Six short ideas worth remembering. The most important one is the third: start as early as you can, because time does most of the work.",
    stage: { lessonsSummaryOpen: true, showDelta: null, growthVisible: true },
    place: "above",
  },
  {
    target: "summary",
    title: "The Quick Summary",
    body: "Your interest and your total at three points in life, and how long your money takes to double, triple and quadruple at this rate.",
    stage: { lessonsSummaryOpen: true },
    place: "above",
  },
  {
    target: "growth",
    title: "Year by Year",
    body: "Every single year from age 10 to 60. The bars show the same story as the chart, growing slowly at first and then racing away. Click any row to jump the chart to that age.",
    stage: { growthTableOpen: true, explainerOpen: false },
    place: "insideBottomRight",
  },
  {
    target: "whatis",
    title: "Same Start, Three Kinds of Growth",
    body: "Click this any time to open the three jars. All of them begin with the same money, and the arrows step you through the years so you can watch the three numbers pull apart.",
    stage: { lessonsSummaryOpen: true, explainerOpen: true },
    place: "above",
    alsoOutline: ["explainer"],
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

interface LearnModeProps {
  open: boolean;
  onClose: () => void;
  onStage: (stage: LearnStageState) => void;
}

export function LearnMode({ open, onClose, onStage }: LearnModeProps) {
  const [step, setStep] = useState(0);
  const [spots, setSpots] = useState<
    { top: number; left: number; width: number; height: number }[]
  >([]);
  const [callout, setCallout] = useState<{ x: number; y: number } | null>(null);

  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

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

    if (current.stage) onStageRef.current(current.stage);

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

  // Keep the outline glued to the target if the window moves under it.
  useEffect(() => {
    if (!open) return;
    const remeasure = () =>
      measure(current.target, current.place, current.nudge, current.alsoOutline);
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const goNext = useCallback(() => {
    setStep((prev) => (prev >= STEPS.length - 1 ? prev : prev + 1));
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120]" role="presentation">
      {/* Outline around whatever this step is talking about */}
      {spots.map((spot, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute rounded-md border-2 border-blue-400"
          style={{
            top: spot.top - 6,
            left: spot.left - 6,
            width: spot.width + 12,
            height: spot.height + 12,
          }}
        />
      ))}

      {callout && (
        <section
          ref={calloutRef}
          role="dialog"
          aria-labelledby="learn-mode-title"
          className="pointer-events-auto absolute w-[340px] border border-slate-200 bg-white p-[22px] shadow-2xl"
          style={{ left: callout.x, top: callout.y }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="learn-mode-title" className="text-base text-gray-900">
              {current.title}
            </h2>
            <button
              type="button"
              aria-label="Close the walkthrough"
              onClick={onClose}
              className="-mr-2 -mt-2 grid h-8 w-8 shrink-0 place-items-center text-lg leading-none text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{current.body}</p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {step + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
              >
                Close
              </button>
              {!isLast && (
                <button
                  type="button"
                  onClick={goNext}
                  className="bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>,
    document.body
  );
}
