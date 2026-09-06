import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "K", description: "Show or hide this shortcut guide" },
  { keys: "1", description: "Toggle Savings-only" },
  { keys: "2", description: "Toggle Compounding-only" },
  { keys: "3", description: "Toggle Compounding + Yearly Investments" },
  { keys: "C", description: "Open the compounding explainer" },
  { keys: "M", description: "Open the money lesson" },
  { keys: "← / →", description: "Move through Introduction slides" },
  { keys: "↑ / ↓", description: "Move the selected age or year" },
  { keys: "Home / End", description: "Jump to the start / end of the chart" },
  { keys: "Enter / Space", description: "Activate a focused chart or table item" },
  { keys: "1–4 (Quiz Mode)", description: "Choose a quiz answer" },
  { keys: "Enter (Quiz Mode)", description: "Continue to the next question" },
  { keys: "Control + scroll", description: "Adjust all yearly investment fields together" },
  { keys: "Escape", description: "Close an open dialog" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

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

  if (!open) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[1px]"
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        tabIndex={-1}
        className="pointer-events-auto relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close shortcuts"
          className="absolute right-4 top-4 rounded-md px-2 py-1 text-xl leading-none text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          ×
        </button>
        <h2
          id="shortcuts-dialog-title"
          className="pr-8 text-lg font-bold text-gray-800"
        >
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Use these keys to move through the compounding tool.
        </p>
        <ul className="mt-5 space-y-2.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <li
              key={keys}
              className="flex items-center justify-between gap-4 text-sm text-gray-700"
            >
              <span>{description}</span>
              <kbd className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-sm font-bold text-gray-600 shadow-sm">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </section>
    </div>,
    document.body,
  );
}