import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Lightbulb } from "lucide-react";

interface WhyExplainerProps {
  open: boolean;
  onClose: () => void;
}

export function WhyExplainer({ open, onClose }: WhyExplainerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;

    setDragOffset({ x: 0, y: 0 });
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
        aria-labelledby="why-explainer-title"
        aria-describedby="why-explainer-description"
        data-tour="why-explainer"
        tabIndex={-1}
        className="pointer-events-auto relative max-h-[90vh] w-full max-w-[61.6rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-[10px] pb-[20px] shadow-2xl outline-none"
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
          <h2 id="why-explainer-title" className="text-xl text-slate-900">
            <span className="flex items-center gap-3">
              <Lightbulb
                className="h-6 w-6 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>The most important question: Why?</span>
            </span>
          </h2>
          <button
            type="button"
            aria-label="Close why explainer"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="-mr-2 -mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl leading-none text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            ×
          </button>
        </header>

        <div
          id="why-explainer-description"
          className="px-6 pb-6 pt-4 text-sm leading-6 text-slate-700 sm:px-8 sm:text-[15px]"
        >
          <blockquote className="border-l-2 border-slate-200 pl-4 text-[15px] leading-7 text-slate-500 italic sm:text-[17px]">
            <p>“Why is any of this important for me to know?</p>
            <p>
              I’ll just do well in school and get a good paying job when I grow
              up.”
            </p>
          </blockquote>

          <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <div className="space-y-5">
              <p>
                <strong className="font-semibold text-slate-900">
                  Money is not the goal. Freedom is.
                </strong>
              </p>
              <p>
                Because money buys choices. Enough of it buys the freedom to
                spend your life on work you actually care about.
              </p>
              <p>
                “I’ll do well in school, get a good job, and earn a good salary.”
                That’s a fine plan and it works. A salary pays for your life.
              </p>
              <p>
                But a salary has a catch. It only arrives when you are present.
                The salary stops showing up when you stop showing up.
              </p>
              <p>
                Money you invest works differently. It keeps growing whether you
                show up or not. That’s what the blue line on this chart is. Every
                dollar you invest early in your life becomes your employee later on
                in your life, a worker that never sleeps, never quits, and never
                asks for a raise.
              </p>
              <p>
                Financial freedom is the point where the money you earn from your
                investments covers what your life costs. Not rich in the sports
                car sense. Free in the sense that nobody else decides how you
                spend your time.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p>That changes what you can say yes and no to:</p>
                <ul className="mt-3 space-y-2">
                  {[
                    "Take the job you find meaningful instead of the one that pays most",
                    "Leave a job that’s bad for you without worrying",
                    "Start your own business",
                    "Spend time on the people and things that matter to you",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                Here’s the part worth remembering. When you get to choose your
                work, and you choose something you love, it stops being work. Most
                people never get that choice, because they put themselves into a
                position where they are dependent on the next pay cheque.
              </p>
              <p>
                That’s why starting at 10 beats starting at 30. Not because you
                need money at 10, but because time is the one thing you can never
                buy back. So go to school and get good grades, but don’t do that
                to get a high-paying job, do that because getting good grades
                means you are expanding your mind and learning how to learn.{" "}
                <strong className="font-semibold text-slate-900">
                  The point of school is not to get a job. It is to build a
                  strong mind, develop curiosity and learn how to solve problems.
                </strong>{" "}
                These skills increase the number of options you can do with your
                life. Investing is what keeps that life and your
                time from being owned by someone else.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
