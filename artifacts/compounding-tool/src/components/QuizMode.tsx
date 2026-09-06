import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";

interface QuizQuestion {
  question: string;
  choices: string[];
  answer: number;
  why: string;
}

function buildQuestions(principal: number, annualRate: number): QuizQuestion[] {
  const money = `$${principal.toLocaleString()}`;
  const decimalRate = annualRate / 100;
  const rateAsDecimal = String(Number(decimalRate.toFixed(4)));
  const yearlyInterest = Math.round(principal * decimalRate);
  const doubleYears = Math.ceil(Math.log(2) / Math.log(1 + decimalRate));

  const questions: QuizQuestion[] = [
  {
    question: "What is the principal?",
    choices: [
      "The money you start with, before it grows at all",
      "The money you make in the very last year",
      "A person who runs a school",
      "The money you take out at the end",
    ],
    answer: 0,
    why: "The principal is your starting money. On this chart it is the number in the box at the top, and all three lines begin there.",
  },
  {
    question: "What is money?",
    choices: [
      "A way to store and trade value",
      "A type of interest your money earns",
      "The amount you invest every year",
      "A fee you pay to keep your money safe",
    ],
    answer: 0,
    why: "Money lets people store value for later and trade it for another type of value. It is how we exchange things like time, freedom, knowledge, control, and power.",
  },
  {
    question: "What are the 5 things people value?",
    choices: [
      "Control, power, freedom, time, and knowledge",
      "Money, interest, savings, debt, and taxes",
      "Food, shelter, transport, work, and leisure",
      "Principal, rate, growth, deposits, and profit",
    ],
    answer: 0,
    why: "People value control, power, freedom, time, and knowledge. Money helps us store and trade these kinds of value.",
  },
  {
    question: "What is compounding?",
    choices: [
      "Adding the same amount of money every single year",
      "Your growth gets added back in, so next year you grow on a bigger pile",
      "Taking your growth out and spending it",
      "Splitting your money into three jars",
    ],
    answer: 1,
    why: "Compounding means growth gets put back in. Because the pile is bigger, next year's growth is bigger too. Growth on top of growth.",
  },
  {
    question: "One line on the chart is almost straight. Which one is it?",
    choices: [
      "The blue line, compounding plus yearly investing",
      "The black line, compounding only",
      "The pink line, savings only with no compounding",
      "All three lines are straight",
    ],
    answer: 2,
    why: "The pink line just adds money to a pile. Nothing is earned on what is already there, so it climbs by the same step every year and stays straight.",
  },
  {
    question: "What shape does compounded growth make on the chart?",
    choices: [
      "A straight line going up",
      "A flat line",
      "A line that goes up and then back down",
      "A hockey stick, slow at first and then shooting up",
    ],
    answer: 3,
    why: "It looks almost flat for years, then it curves up hard. That slow start is why people give up too early.",
  },
  {
    question: "What does interest mean on this chart?",
    choices: [
      "Money your investment earns while it stays invested",
      "How much you like investing",
      "A fee you have to pay every year",
      "The money you put in yourself",
    ],
    answer: 0,
    why: "Interest is what your money earns for being invested. On the table it is the Yearly Int. column, and it gets bigger every year because your pile is bigger.",
  },
  {
    question:
      "Why is compounding plus yearly investing better than compounding on its own?",
    choices: [
      "Because you get a higher interest rate",
      "You add new money each year, and that new money compounds too",
      "Because it takes less time",
      "It is not better, it just looks bigger",
    ],
    answer: 1,
    why: "You get both engines at once. The money already there keeps compounding, and every new amount you add starts compounding as well.",
  },
  {
    question:
      "Two friends both invest the same amount each year. One starts at 10 and one starts at 25. Who ends up with more, and why?",
    choices: [
      "The one who started at 25, because they earn more money as an adult",
      "They finish the same, because they put in the same each year",
      "The one who started at 10, because their money had more years to grow on itself",
      "Nobody can tell",
    ],
    answer: 2,
    why: "Extra years matter more than extra money. The early starter's first dollars get to compound over and over, and the late starter never catches up.",
  },
  {
    question:
      "What happens to your money when you stop adding new dollars but leave your original investment compounding?",
    choices: [
      "It stops growing completely",
      "It slowly disappears",
      "It stays exactly the same",
      "It still grows, just not as fast as if you kept adding",
    ],
    answer: 3,
    why: "That is the black line. It never gets new money, but it still curves upward, because the interest it earns keeps compounding.",
  },
  {
    question: "What is the big lesson of this whole chart?",
    choices: [
      "Time and patience beat putting in a big pile of money later",
      "You need a lot of money to start",
      "Check your money every single day",
      "Take your growth out as soon as you can",
    ],
    answer: 0,
    why: "Starting early and leaving it alone is the most powerful thing you can do. Time is doing most of the work, not the size of what you put in.",
  },
  {
    question: "What is growth?",
    choices: [
      "Change over time",
      "Money you keep in a jar",
      "Spending less than you earn",
      "The same amount, every year, forever",
    ],
    answer: 0,
    why: "Growth is change over time. Compounding is one kind of growth, the kind where the change gets bigger the longer you leave it.",
  },
  {
    question: `Your money is ${money} and the rate is ${annualRate}%. How do you work out your interest for one year?`,
    choices: [
      `${money} × ${rateAsDecimal}`,
      `${money} + ${rateAsDecimal}`,
      `${money} ÷ ${rateAsDecimal}`,
      `${money} × ${annualRate}`,
    ],
    answer: 0,
    why: `Turn the percent into a decimal and multiply. ${money} × ${rateAsDecimal} = $${yearlyInterest.toLocaleString()} of interest for that year.`,
  },
  ];

  // Only ask about doubling when there is a rate to double at.
  if (decimalRate > 0) {
    questions.push({
      question: `At ${annualRate}% a year, about how long does it take for your money to double?`,
      choices: [
        `About ${doubleYears} years`,
        "About 1 year",
        `About ${doubleYears * 3} years`,
        "About 50 years",
      ],
      answer: 0,
      why: `Around ${doubleYears} years. Then it doubles again, and again. Each double is bigger than the last one because it starts from a bigger pile.`,
    });
  }

  return questions;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function renderChoice(choice: string) {
  return choice.split(/([÷+×])/).map((part, index) =>
    /^[÷+×]$/.test(part) ? (
      <span
        key={`${part}-${index}`}
        className="text-lg"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// Fresh order every run: questions shuffled, and the choices inside each one
// shuffled too, with the correct index moved to wherever it landed.
function buildDeck(principal: number, annualRate: number): QuizQuestion[] {
  return shuffle(buildQuestions(principal, annualRate)).map((question) => {
    const order = shuffle(question.choices.map((_, index) => index));
    return {
      ...question,
      choices: order.map((index) => question.choices[index]),
      answer: order.indexOf(question.answer),
    };
  });
}

interface QuizModeProps {
  open: boolean;
  principal: number;
  annualRate: number;
  onClose: () => void;
}

export function QuizMode({ open, principal, annualRate, onClose }: QuizModeProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [deck, setDeck] = useState<QuizQuestion[]>([]);
  const deckLengthRef = useRef(0);
  const [step, setStep] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const restart = () => {
    const nextDeck = buildDeck(principal, annualRate);
    deckLengthRef.current = nextDeck.length;
    setDeck(nextDeck);
    setStep(0);
    setWrongPicks([]);
    setSolved(false);
    setScore(0);
    setFinished(false);
  };

  useEffect(() => {
    if (!open) return;
    restart();
    setDragOffset({ x: 0, y: 0 });

    const previousFocus = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        setStep((currentStep) =>
          Math.min(
            Math.max(currentStep + delta, 0),
            Math.max(0, deckLengthRef.current - 1),
          ),
        );
        setWrongPicks([]);
        setSolved(false);
        setFinished(false);
        return;
      }

      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        ["1", "2", "3", "4"].includes(event.key)
      ) {
        const choiceIndex = Number(event.key) - 1;
        const choiceButton = dialogRef.current?.querySelector<HTMLButtonElement>(
          `[data-quiz-choice-index="${choiceIndex}"]`,
        );
        if (choiceButton && !choiceButton.disabled) {
          event.preventDefault();
          choiceButton.click();
        }
        return;
      }

      if (event.key === "Enter") {
        const nextButton = dialogRef.current?.querySelector<HTMLButtonElement>(
          "[data-quiz-next]",
        );
        if (nextButton && event.target !== nextButton) {
          event.preventDefault();
          nextButton.click();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, principal, annualRate, onClose]);

  if (!open || deck.length === 0) return null;

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

  const current = deck[step];
  const isLast = step === deck.length - 1;

  const choose = (index: number) => {
    if (solved || wrongPicks.includes(index)) return;
    if (index === current.answer) {
      if (wrongPicks.length === 0) setScore((prev) => prev + 1);
      setSolved(true);
      return;
    }
    setWrongPicks((prev) => [...prev, index]);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setStep((prev) => prev + 1);
    setWrongPicks([]);
    setSolved(false);
  };

  const scoreMessage =
    score === deck.length
      ? "Perfect. You understand compounding."
      : score >= 8
        ? "Really strong. You have got this."
        : score >= 5
          ? "Good start. Try the ones you missed again."
          : "Give the chart another look, then try again.";

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-transparent p-3 sm:p-0"
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-mode-title"
        tabIndex={-1}
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          fontFamily: "inherit",
        }}
        className="pointer-events-auto relative max-h-[94vh] w-[calc(90%+9px)] max-w-[46rem] overflow-y-auto border border-slate-200 bg-white p-[30px] shadow-2xl outline-none md:w-[calc(56%+9px)]"
      >
        {/* The 30px padding frame is all drag handle: top, sides and bottom. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-30 h-[30px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-30 w-[30px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-30 w-[30px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 z-30 h-[30px] cursor-move touch-none"
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
          <div className="flex items-start justify-between gap-4">
            <h2 id="quiz-mode-title" className="text-lg text-gray-900 md:text-xl">
              Quiz Mode
            </h2>
            <button
              type="button"
              aria-label="Close quiz"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center text-xl leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              ×
            </button>
          </div>
          {!finished && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Question {step + 1} of {deck.length}
            </p>
          )}
        </header>

        <div className="px-5 pb-6 pt-2 sm:px-9">
          {finished ? (
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {score} out of {deck.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{scoreMessage}</p>
              <div className="mt-6 flex items-center gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                >
                  Back to the chart
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-base leading-6 text-gray-900">{current.question}</p>

              <div className="mt-4 flex flex-col gap-2">
                {current.choices.map((choice, index) => {
                  const isRuledOut = wrongPicks.includes(index);
                  const isWinner = solved && index === current.answer;

                  let tone =
                    "border-slate-200 text-gray-700 hover:border-slate-400 hover:bg-gray-50 hover:text-blue-600";
                  if (isWinner) {
                    tone = "border-green-500 bg-green-50 text-green-800";
                  } else if (isRuledOut) {
                    tone = "border-red-300 bg-red-50 text-red-400 line-through";
                  } else if (solved) {
                    tone = "border-slate-200 text-slate-400";
                  }

                  const locked = solved || isRuledOut;

                  return (
                    <button
                      key={index}
                      type="button"
                      data-testid={`quiz-choice-${index}`}
                      data-quiz-choice-index={index}
                      onClick={() => choose(index)}
                      disabled={locked}
                      className={`border px-4 py-3 text-left text-sm leading-snug transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${tone} ${locked ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="group relative inline-flex shrink-0">
                          <span
                            data-testid={`quiz-choice-key-${index + 1}`}
                            aria-hidden="true"
                            className="grid h-6 w-6 place-items-center border border-current/30 text-xs font-semibold leading-none"
                          >
                            {index + 1}
                          </span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
                          >
                            Shortcut: {index + 1}
                          </span>
                        </span>
                        <span>{renderChoice(choice)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {!solved && wrongPicks.length > 0 && (
                <p className="mt-4 text-sm font-semibold text-red-600">
                  Not quite. Guess again.
                </p>
              )}

              {solved && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-green-700">
                    {wrongPicks.length === 0 ? "Correct" : "That's the one"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{current.why}</p>
                  <button
                    type="button"
                    data-quiz-next
                    onClick={next}
                    className="mt-4 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                  >
                    {isLast ? "See my score" : "Next question"}
                  </button>
                  <span
                    data-testid="quiz-enter-shortcut"
                    className="ml-1 inline-block whitespace-nowrap rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-semibold leading-5 text-slate-600"
                  >
                    Enter key
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}