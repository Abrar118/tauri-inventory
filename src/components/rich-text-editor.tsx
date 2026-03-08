"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [toolbarTick, setToolbarTick] = useState(0);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      editorRef.current &&
      selection.anchorNode &&
      editorRef.current.contains(selection.anchorNode)
    ) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (!savedSelectionRef.current) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(savedSelectionRef.current);
    return true;
  };

  const handleSelectionChange = useCallback(() => {
    setToolbarTick((prev) => prev + 1);
    saveSelection();
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const isFormatActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const applyFormat = (command: string, commandValue?: string) => {
    if (disabled) return;
    saveSelection();
    if (!restoreSelection()) {
      editorRef.current?.focus();
    }

    if (command === "createLink") {
      const url = prompt("Enter URL:");
      if (!url?.trim()) return;
      let finalUrl = url.trim();
      if (
        !finalUrl.startsWith("http://") &&
        !finalUrl.startsWith("https://") &&
        !finalUrl.startsWith("mailto:")
      ) {
        finalUrl = `https://${finalUrl}`;
      }
      document.execCommand("createLink", false, finalUrl);
    } else {
      document.execCommand(command, false, commandValue);
    }

    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML ?? "");
    setToolbarTick((prev) => prev + 1);
  };

  return (
    <div className="relative rounded-md border p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-popover p-1.5 shadow-sm">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("bold")}
          className={`rounded px-2 py-1 text-sm font-bold ${
            isFormatActive("bold") ? "bg-chart-2/20 text-chart-2" : "hover:bg-muted"
          }`}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("italic")}
          className={`rounded px-2 py-1 text-sm italic ${
            isFormatActive("italic") ? "bg-chart-2/20 text-chart-2" : "hover:bg-muted"
          }`}
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("underline")}
          className={`rounded px-2 py-1 text-sm underline ${
            isFormatActive("underline") ? "bg-chart-2/20 text-chart-2" : "hover:bg-muted"
          }`}
        >
          U
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("justifyLeft")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          Left
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("justifyCenter")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          Center
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("justifyRight")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          Right
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("insertUnorderedList")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          • List
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("insertOrderedList")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          1. List
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFormat("createLink")}
          className="rounded px-2 py-1 text-xs hover:bg-muted"
        >
          Link
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-editor-toolbar-tick={toolbarTick}
        className="demand-rich-editor min-h-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
      <style>{`
        .demand-rich-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .demand-rich-editor ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin: 0.35rem 0;
        }
        .demand-rich-editor ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin: 0.35rem 0;
        }
      `}</style>
    </div>
  );
}
