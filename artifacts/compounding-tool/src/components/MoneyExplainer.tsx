import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  BadgeDollarSign,
  BookOpen,
  Clock3,
  Crown,
  Flag,
  SlidersHorizontal,
} from "lucide-react";

interface MoneyExplainerProps {
  open: boolean;
  onClose: () => void;
}

export function MoneyExplainer({ open, onClose }: MoneyExplainerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  useEffect(() => {
    if (!open) return;

    setDragOffset({ x: 0, y: 0 });
    setDetailsExpanded(false);
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
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
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-transparent p-4 sm:p-6"
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="money-explainer-title"
        aria-describedby="money-explainer-description"
        data-tour="money-explainer"
        tabIndex={-1}
        className={`pointer-events-auto relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-[10px] pb-[20px] shadow-2xl outline-none transition-[max-width] duration-300 ease-out ${
          detailsExpanded ? "max-w-5xl" : "max-w-2xl"
        }`}
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          fontFamily: "inherit",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-10 w-[14px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-10 w-[14px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 z-10 h-[14px] cursor-move touch-none"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
        <header
          className="flex cursor-move touch-none items-start justify-between gap-4 px-6 py-5 sm:px-8"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <h2 id="money-explainer-title" className="text-xl text-slate-900">
            <span className="flex items-center gap-3">
              <BadgeDollarSign
                className="h-6 w-6 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>What is money?</span>
            </span>
          </h2>
          <button
            type="button"
            aria-label="Close money explainer"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="-mr-2 -mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            ×
          </button>
        </header>

        <div
          id="money-explainer-description"
          className="px-6 pb-6 pt-4 text-sm leading-6 text-slate-700 sm:px-8 sm:text-[15px]"
        >
          <p>
            <strong className="font-semibold text-slate-900">
              Money is a way to store and trade value.
            </strong>
          </p>
          <div
            className={`mt-6 grid gap-x-10 gap-y-6 ${
              detailsExpanded ? "sm:grid-cols-[45fr_55fr]" : ""
            }`}
          >
            <div className="space-y-5">
              <p>
                To understand how money works, imagine you are a squirrel. From a
                squirrel’s perspective, nuts are valuable because they represent
                survival and health. That is why squirrels store nuts away for the
                 winter—they are preserving value to use at a later time.
              </p>
              <p>
                People do the same thing. We just don’t measure value in nuts. We
                value five things:{" "}
                <button
                  type="button"
                  aria-label={
                    detailsExpanded
                      ? "Hide details about the five values"
                      : "Show details about the five values"
                  }
                  aria-controls="money-value-details"
                  aria-expanded={detailsExpanded}
                  onClick={() => setDetailsExpanded((expanded) => !expanded)}
                  className="group relative cursor-pointer font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-900 hover:decoration-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                >
                  control, power, freedom, time, and knowledge
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    Learn More
                  </span>
                </button>
                .
                Everything people value fits into one or a combination of these
                five categories. Just as a squirrel values and stores nuts for the
                future, people value and store these five key resources to use
                later on.
              </p>
              <p>
                But people can do something a squirrel cannot. We can trade value.
                That is what money is for. It lets us store value and trade it for
                 another type of value. For example, I can trade my time (mowing my
                neighbour’s lawn) for money. I can then trade that money for
                someone else’s knowledge (buying a dance class).
              </p>
            </div>
            {detailsExpanded && (
              <div
                id="money-value-details"
                role="region"
                className="space-y-4 border-slate-100 sm:border-l sm:pl-8"
                aria-label="Five things people value"
              >
              <p className="flex items-start gap-3">
                <SlidersHorizontal
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-slate-900">Control</strong>{" "}
                  - which way your actions are directed. It is deciding where to aim
                  the garden hose.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Crown
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-slate-900">Power</strong>{" "}
                  - how much your action does. It is how much water comes out of the
                  hose.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Flag
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-slate-900">Freedom</strong>{" "}
                  - whether you get to act at all. It is choosing whether to pick up
                  or put down the garden hose.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <Clock3
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-slate-900">Time</strong> -
                   hours that belong to you. It is the most valuable resource we have. Once
                   it&apos;s gone, we can never get it back. Paying for a bus ride to
                  school saves you the hour you would have spent walking.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <BookOpen
                  className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-slate-900">Knowledge</strong>{" "}
                  - information you can actually use. Reading about how to make a pizza
                   is information. Being able to make it is knowledge. You can spend or
                   trade your time and money to acquire knowledge, then sell that
                   knowledge for more money.
                </span>
              </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}