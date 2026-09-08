import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

/**
 * Lightweight visual editor for Payload's Lexical rich-text values.
 * Converts the stored Lexical JSON to HTML for editing, and converts the
 * edited HTML back to Lexical JSON on change — no raw JSON is ever shown.
 * Unsupported/exotic node types fall back to plain-text editing.
 */

type LexNode = Record<string, unknown> & { children?: LexNode[] };

// Lexical TextFormat bitfield.
const BOLD = 1;
const ITALIC = 2;
const STRIKE = 4;
const UNDERLINE = 8;
const CODE = 16;

const INLINE_TAGS: Record<string, number> = {
  strong: BOLD,
  b: BOLD,
  em: ITALIC,
  i: ITALIC,
  s: STRIKE,
  strike: STRIKE,
  del: STRIKE,
  u: UNDERLINE,
  code: CODE,
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(n: LexNode): string {
  let t = esc(String(n.text ?? ""));
  const f = Number(n.format ?? 0);
  if (f & CODE) t = `<code>${t}</code>`;
  if (f & BOLD) t = `<strong>${t}</strong>`;
  if (f & ITALIC) t = `<em>${t}</em>`;
  if (f & STRIKE) t = `<s>${t}</s>`;
  if (f & UNDERLINE) t = `<u>${t}</u>`;
  return t;
}

function nodesToHtml(nodes?: LexNode[]): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      switch (n.type) {
        case "linebreak":
          return "<br>";
        case "text":
          return textToHtml(n);
        case "paragraph":
          return `<p>${nodesToHtml(n.children) || "<br>"}</p>`;
        case "heading": {
          const tag = /^(h[1-6])$/.test(String(n.tag ?? "h2"))
            ? String(n.tag)
            : "h2";
          return `<${tag}>${nodesToHtml(n.children) || "<br>"}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${nodesToHtml(n.children) || "<br>"}</blockquote>`;
        case "list": {
          const tag = n.listType === "number" ? "ol" : "ul";
          return `<${tag}>${nodesToHtml(n.children)}</${tag}>`;
        }
        case "listitem":
          return `<li>${nodesToHtml(n.children)}</li>`;
        case "link":
          return `<a href="${esc(String(n.url ?? "#"))}">${nodesToHtml(n.children)}</a>`;
        default: {
          // Unknown block types degrade to their text content.
          const inner = nodesToHtml(n.children);
          return inner;
        }
      }
    })
    .join("");
}

/** Returns HTML when the value is a Lexical doc, else null. */
export function lexicalToHtml(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const root = (value as { root?: LexNode }).root;
  if (!root || typeof root !== "object" || !Array.isArray(root.children))
    return null;
  return nodesToHtml(root.children);
}

export function lexicalToPlainText(value: unknown): string {
  const out: string[] = [];
  const walk = (nodes?: LexNode[], depth = 0) => {
    if (!nodes) return;
    for (const n of nodes) {
      if (n.type === "text") out.push(String(n.text ?? ""));
      else if (n.type === "linebreak") out.push("\n");
      else if (
        n.type === "paragraph" ||
        n.type === "heading" ||
        n.type === "quote" ||
        n.type === "listitem"
      ) {
        walk(n.children, depth);
        out.push("\n");
      } else if (n.type === "list") {
        walk(n.children, depth + 1);
        if (depth === 0) out.push("\n");
      } else walk(n.children, depth);
    }
  };
  const root = (value as { root?: LexNode } | null)?.root;
  if (root) {
    walk(root.children);
    return out
      .join("")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  // Non-Lexical value: salvage readable text instead of showing serialized JSON.
  const parts: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v).forEach(collect);
  };
  collect(value);
  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectInline(node: Node, format: number, out: LexNode[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text) {
      out.push({
        type: "text",
        mode: "normal",
        format,
        style: "",
        text,
        version: 1,
      });
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") {
    out.push({ type: "linebreak", version: 1 });
    return;
  }
  if (tag === "a") {
    const children: LexNode[] = [];
    el.childNodes.forEach((c) => collectInline(c, format, children));
    out.push({
      type: "link",
      url: el.getAttribute("href") ?? "#",
      children: children.length
        ? children
        : [
            {
              type: "text",
              mode: "normal",
              format: 0,
              style: "",
              text: String(el.textContent ?? ""),
              version: 1,
            },
          ],
      version: 1,
    });
    return;
  }
  const f = format | (INLINE_TAGS[tag] ?? 0);
  el.childNodes.forEach((c) => collectInline(c, f, out));
}

function inlineContainerToParagraph(el: HTMLElement): LexNode {
  const children: LexNode[] = [];
  el.childNodes.forEach((c) => collectInline(c, 0, children));
  return {
    type: "paragraph",
    format: "",
    indent: 0,
    direction: null,
    children,
    version: 1,
  };
}

function htmlToLexical(html: string): Record<string, unknown> {
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  const body = doc.body;
  const children: LexNode[] = [];

  body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text) {
        children.push({
          type: "paragraph",
          format: "",
          indent: 0,
          direction: null,
          children: [
            {
              type: "text",
              mode: "normal",
              format: 0,
              style: "",
              text,
              version: 1,
            },
          ],
          version: 1,
        });
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const base = { format: "", indent: 0, direction: null, version: 1 };

    if (/^h[1-6]$/.test(tag)) {
      const ch: LexNode[] = [];
      el.childNodes.forEach((c) => collectInline(c, 0, ch));
      children.push({ type: "heading", tag, children: ch, ...base });
    } else if (tag === "blockquote") {
      const ch: LexNode[] = [];
      el.childNodes.forEach((c) => collectInline(c, 0, ch));
      children.push({ type: "quote", children: ch, ...base });
    } else if (tag === "ul" || tag === "ol") {
      const items: LexNode[] = [];
      el.querySelectorAll(":scope > li").forEach((li, i) => {
        const ch: LexNode[] = [];
        li.childNodes.forEach((c) => collectInline(c, 0, ch));
        items.push({
          type: "listitem",
          checked: undefined,
          value: tag === "ol" ? i + 1 : undefined,
          children: ch,
          format: "",
          indent: 0,
          direction: null,
          version: 1,
        });
      });
      children.push({
        type: "list",
        listType: tag === "ol" ? "number" : "bullet",
        start: 1,
        tag,
        children: items,
        format: "",
        indent: 0,
        direction: null,
        version: 1,
      });
    } else if (tag === "p" || tag === "div" || tag === "span") {
      children.push(inlineContainerToParagraph(el));
    } else {
      // Unknown element: salvage its text as a paragraph.
      const text = (el.textContent ?? "").trim();
      if (text) {
        children.push({
          type: "paragraph",
          format: "",
          indent: 0,
          direction: null,
          children: [
            {
              type: "text",
              mode: "normal",
              format: 0,
              style: "",
              text,
              version: 1,
            },
          ],
          version: 1,
        });
      }
    }
  });

  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      direction: null,
      children,
      version: 1,
    },
  };
}

function plainTextToLexical(text: string): Record<string, unknown> {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  const children: LexNode[] = (blocks.length ? blocks : [""]).map((b) => ({
    type: "paragraph",
    format: "",
    indent: 0,
    direction: null,
    children: b.split("\n").flatMap<LexNode>((line, i) => {
      const tn: LexNode = {
        type: "text",
        mode: "normal",
        format: 0,
        style: "",
        text: line,
        version: 1,
      };
      return i === 0 ? [tn] : [{ type: "linebreak", version: 1 }, tn];
    }),
    version: 1,
  }));
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      direction: null,
      children,
      version: 1,
    },
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface RichTextInputProps {
  field: {
    name?: string;
    label?: string;
    required?: boolean;
    description?: string;
    readOnly?: boolean;
  };
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  error?: string | null;
}

export function RichTextInput({
  field,
  value,
  onChange,
  disabled,
  error,
}: RichTextInputProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  const debounceRef = useRef<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const html = useMemo(() => lexicalToHtml(value), [value]);
  const isEmpty = value === null || value === undefined || value === "";
  const visual = html !== null || isEmpty;

  const signature = useMemo(() => JSON.stringify(value) ?? "", [value]);

  useEffect(() => {
    if (!visual || showFallback) return;
    const el = editableRef.current;
    if (!el) return;
    if (signature !== lastEmitted.current) {
      el.innerHTML = html ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, visual, showFallback]);

  const emit = () => {
    const el = editableRef.current;
    if (!el) return;
    const json = htmlToLexical(el.innerHTML);
    lastEmitted.current = JSON.stringify(json);
    onChange(json);
  };

  const scheduleEmit = () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(emit, 600);
  };

  const exec = (cmd: string, arg?: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, arg);
    scheduleEmit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (url) exec("createLink", url);
  };

  const id = `f-${field.name}`;
  const errCls = error ? "border-destructive" : "";

  if (!visual || showFallback) {
    // Readable plain-text fallback for values that are not Lexical JSON.
    const text = typeof value === "string" ? value : lexicalToPlainText(value);
    return (
      <Field>
        <FieldLabel>
          {field.label ?? field.name}
          {field.required ? " *" : ""}
        </FieldLabel>
        <textarea
          id={id}
          rows={8}
          disabled={disabled}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${errCls}`}
          value={text}
          onChange={(e) => onChange(plainTextToLexical(e.target.value))}
        />
        <FieldDescription>
          {field.description ??
            (visual
              ? "Plain text mode. Switch back to rich text to keep formatting."
              : "Plain text (value is not rich-text JSON).")}
        </FieldDescription>
        {visual && !disabled ? (
          <button
            type="button"
            className="self-start px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Force the reseed effect: the contentEditable remounts empty,
              // so clear the last-emitted signature to restore its content.
              lastEmitted.current = "";
              setShowFallback(false);
            }}
          >
            Edit as rich text
          </button>
        ) : null}
        {error ? (
          <p className="text-xs font-medium text-destructive">{error}</p>
        ) : null}
      </Field>
    );
  }

  const tools: Array<[string, React.ReactNode, string]> = [
    ["bold", <Bold className="size-4" />, "Bold"],
    ["italic", <Italic className="size-4" />, "Italic"],
    ["underline", <Underline className="size-4" />, "Underline"],
    ["strikeThrough", <Strikethrough className="size-4" />, "Strikethrough"],
    ["insertUnorderedList", <List className="size-4" />, "Bulleted list"],
    ["insertOrderedList", <ListOrdered className="size-4" />, "Numbered list"],
    ["formatBlock", <Quote className="size-4" />, "Quote"],
  ];

  return (
    <Field>
      <FieldLabel>
        {field.label ?? field.name}
        {field.required ? " *" : ""}
      </FieldLabel>
      <div className={`overflow-hidden rounded-md border ${errCls}`}>
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1 py-1">
          {tools.map(([cmd, icon, title]) => (
            <Button
              key={cmd}
              type="button"
              variant="ghost"
              size="icon-sm"
              title={title}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                cmd === "formatBlock"
                  ? exec("formatBlock", "<blockquote>")
                  : exec(cmd)
              }
            >
              {icon}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Link"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
          >
            <Link2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Code"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("formatBlock", "<pre>")}
          >
            <Code className="size-4" />
          </Button>
          {!disabled && (
            <button
              type="button"
              className="ml-auto px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (debounceRef.current !== null)
                  window.clearTimeout(debounceRef.current);
                setShowFallback(true);
              }}
            >
              Edit as text
            </button>
          )}
        </div>
        <div
          ref={editableRef}
          id={id}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          className="prose-sm min-h-[200px] bg-background px-3 py-2 text-sm outline-none [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:min-h-5 [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs [&_ul]:list-disc"
          onInput={scheduleEmit}
          onBlur={emit}
        />
      </div>
      <FieldDescription>
        {field.description ?? "Rich text (stored as Lexical JSON)."}
      </FieldDescription>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </Field>
  );
}
