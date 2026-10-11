"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowUpRight, Plus, BookOpenCheck } from "lucide-react";
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  fullscreen = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  fullscreen?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const previous = document.activeElement as HTMLElement;
    d?.showModal();
    return () => {
      d?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${fullscreen ? "fullscreen" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  description,
  action,
  label = "Get started",
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden="true"><BookOpenCheck size={22} strokeWidth={1.65} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button primary" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`badge ${String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      {children}
    </span>
  );
}
export function SectionHead({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function TextLink({
  url,
  children,
}: {
  url: string | undefined;
  children: ReactNode;
}) {
  if (!url) return null;
  return (
    <a
      className="text-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function ActivityChart({
  data,
  label = "Study activity",
  unit = "hours",
}: {
  data: { label: string; value: number; secondary?: number }[];
  label?: string;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value + (d.secondary || 0)));
  return (
    <div
      className="chart"
      role="img"
      aria-label={`${label}: ${data.map((d) => `${d.label}, ${d.value.toFixed(unit === "hours" ? 1 : 0)} ${unit}${d.secondary !== undefined ? `, ${d.secondary.toFixed(1)} assisted ${unit}` : ""}`).join("; ")}`}
    >
      <div className="bars">
        {data.map((d, i) => (
          <div className="bar-column" key={i}>
            <div className="bar-values">
              <span>
                {(d.value + (d.secondary || 0)).toFixed(
                  unit === "hours" ? 1 : 0,
                )}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-stack"
                style={{
                  height: `${((d.value + (d.secondary || 0)) / max) * 100}%`,
                }}
              >
                {d.secondary !== undefined && (
                  <div className="bar assisted" style={{ flex: d.secondary }} />
                )}
                <div className="bar" style={{ flex: d.value }} />
              </div>
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-caption">
        {unit.charAt(0).toUpperCase() + unit.slice(1)} · based on your saved
        records
      </div>
    </div>
  );
}
