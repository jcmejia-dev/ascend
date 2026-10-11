"use client";
import type { State, Kind, RecordItem } from "@/lib/model";
import { emptyEducation, type Education } from "@/lib/education";
import { useRef, useState } from "react";
export type LearningProps = {
  state: State;
  save: (state: State) => Promise<void>;
  navigate: (page: string) => void;
  add: (kind: Kind, item?: Partial<RecordItem>) => void;
};
export function useEducation({ state, save }: LearningProps) {
  const current = useRef(state);
  current.current = state;
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function commit(change: (e: Education, state: State) => Education) {
    setBusy(true);
    try {
      const s = current.current;
      await save({
        ...s,
        education: change(structuredClone(s.education ?? emptyEducation()), s),
      });
      setMessage("Progress saved.");
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save progress.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    e: state.education ?? emptyEducation(),
    commit,
    message,
    setMessage,
    busy,
  };
}
export function Feedback({ message }: { message: string }) {
  return message ? (
    <p className="learning-feedback" role="status">
      {message}
    </p>
  ) : null;
}
export function Chips({ items }: { items: string[] }) {
  return (
    <div className="learning-chips">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
