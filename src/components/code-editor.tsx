"use client";
import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
export default function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    view.current = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        javascript(),
        syntaxHighlighting(
          HighlightStyle.define([
            {
              tag: [
                tags.keyword,
                tags.number,
                tags.bool,
                tags.null,
                tags.operator,
                tags.function(tags.variableName),
              ],
              color: "var(--accent)",
            },
            { tag: [tags.string, tags.regexp], color: "var(--success)" },
            { tag: tags.comment, color: "var(--muted)" },
            {
              tag: [tags.variableName, tags.propertyName, tags.punctuation],
              color: "var(--text)",
            },
          ]),
        ),
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": "JavaScript solution",
          spellcheck: "false",
        }),
        EditorView.theme({
          "&": {
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            fontSize: "14px",
          },
          ".cm-content": {
            fontFamily: "Consolas, monospace",
            minHeight: "230px",
          },
          ".cm-gutters": {
            backgroundColor: "var(--surface)",
            color: "var(--muted)",
            borderColor: "var(--border)",
          },
          ".cm-cursor": { borderLeftColor: "var(--text)" },
          ".cm-activeLine,.cm-activeLineGutter": {
            backgroundColor: "var(--hover)",
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) change.current(update.state.doc.toString());
        }),
      ],
      parent: host.current,
    });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, []); // value updates reconciled below
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
  }, [value]);
  return <div ref={host} className="academy-editor" />;
}
