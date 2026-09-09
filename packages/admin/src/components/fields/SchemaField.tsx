import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";

import type { NormField } from "@/lib/schema";
import {
  ImagesArrayField,
  RelationInput,
  UploadInput,
} from "@/components/fields/FieldInputs";
import { RichTextInput } from "@/components/fields/RichTextInput";
import { DateTimePicker } from "@/components/fields/DatePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type FieldValues = Record<string, unknown>;

interface FieldProps {
  field: NormField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string | null;
  /** Context-aware message shown when an array field has no rows. */
  emptyHint?: string;
  /** Subfield names hidden from array rows (UI-only; row data is preserved). */
  hideSubNames?: string[];
}

function Description({ text }: { text?: string }) {
  if (!text) return null;
  return <FieldDescription>{text}</FieldDescription>;
}

function Label({ field }: { field: NormField }) {
  return (
    <FieldLabel>
      {field.label ?? field.name}
      {field.required ? " *" : ""}
      {field.localized ? (
        <Badge variant="outline" className="ml-2 px-1 py-0 text-[10px]">
          L
        </Badge>
      ) : null}
    </FieldLabel>
  );
}

// ─── Simple inputs ──────────────────────────────────────────────────────────────

function ErrorText({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="text-xs font-medium text-destructive">{error}</p>;
}

function SimpleField({ field, value, onChange, disabled, error }: FieldProps) {
  const id = `f-${field.name}`;
  // readOnly fields (e.g. aggregated stats) render disabled even with edit rights.
  const dis = disabled || Boolean(field.readOnly);
  const errCls = error ? "border-destructive" : undefined;
  const str = value === null || value === undefined ? "" : String(value);

  switch (field.type) {
    case "textarea":
      return (
        <Field>
          <Label field={field} />
          <Textarea
            id={id}
            rows={4}
            value={str}
            disabled={dis}
            maxLength={field.max}
            className={errCls}
            onChange={(e) => onChange(e.target.value)}
          />
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    case "number": {
      const num = value === null || value === undefined ? "" : String(value);
      return (
        <Field>
          <Label field={field} />
          <Input
            id={id}
            type="number"
            value={num}
            min={field.min}
            max={field.max}
            disabled={dis}
            className={errCls}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
          />
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    }
    case "email":
    case "password":
    case "text":
      return (
        <Field>
          <Label field={field} />
          <Input
            id={id}
            type={
              field.type === "email"
                ? "email"
                : field.type === "password"
                  ? "password"
                  : "text"
            }
            value={str}
            disabled={dis}
            className={errCls}
            autoComplete={
              field.type === "password" ? "new-password" : undefined
            }
            onChange={(e) => onChange(e.target.value)}
          />
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    case "checkbox":
      return (
        <Field orientation="horizontal">
          <input
            id={id}
            type="checkbox"
            className="size-4 accent-primary"
            checked={Boolean(value)}
            disabled={dis}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Label field={field} />
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    case "select":
    case "radio": {
      const options = field.options ?? [];
      const NONE = "__none__";
      if (field.hasMany) {
        const arr = Array.isArray(value) ? value.map(String) : [];
        return (
          <Field>
            <Label field={field} />
            <div className="flex flex-wrap gap-1">
              {options.map((o) => {
                const active = arr.includes(o.value);
                return (
                  <Badge
                    key={o.value}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      onChange(
                        active
                          ? arr.filter((v) => v !== o.value)
                          : [...arr, o.value],
                      )
                    }
                  >
                    {o.label}
                  </Badge>
                );
              })}
            </div>
            <Description text={field.description} />
          </Field>
        );
      }
      return (
        <Field>
          <Label field={field} />
          <Select
            value={str || NONE}
            onValueChange={(v) => onChange(v === NONE ? null : v)}
            disabled={dis}
          >
            <SelectTrigger id={id} className={`w-full ${errCls ?? ""}`}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {!field.required && (
                <SelectItem value={NONE}>— None —</SelectItem>
              )}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    }
    case "date":
      // Calendar picker; Payload stores full ISO.
      return (
        <Field>
          <Label field={field} />
          <DateTimePicker
            id={id}
            value={str || null}
            onChange={onChange}
            disabled={dis}
          />
          <Description text={field.description} />
          <ErrorText error={error} />
        </Field>
      );
    case "richText":
    case "richtext":
      // Visual editor: renders stored Lexical JSON as rich text (never raw JSON).
      return (
        <RichTextInput
          field={field}
          value={value}
          onChange={onChange}
          disabled={dis}
          error={error}
        />
      );
    case "json": {
      const text =
        typeof value === "string"
          ? value
          : value
            ? JSON.stringify(value, null, 2)
            : "";
      return (
        <Field>
          <Label field={field} />
          <Textarea
            id={id}
            rows={8}
            spellCheck={false}
            className={`font-mono text-xs ${errCls ?? ""}`}
            value={text}
            disabled={dis}
            onChange={(e) => onChange(e.target.value)}
          />
          <Description text={field.description ?? "JSON value."} />
          <ErrorText error={error} />
        </Field>
      );
    }
    default:
      // Fallback for exotic field types: JSON editing keeps data intact.
      return (
        <Field>
          <Label field={field} />
          <Textarea
            id={id}
            rows={4}
            spellCheck={false}
            className="font-mono text-xs"
            value={value ? JSON.stringify(value, null, 2) : ""}
            disabled={disabled}
            onChange={(e) => {
              try {
                onChange(
                  e.target.value.trim() ? JSON.parse(e.target.value) : null,
                );
              } catch {
                // keep text as-is; serializeForSave will pass the raw string
                onChange(e.target.value);
              }
            }}
          />
          <Description text={field.description} />
        </Field>
      );
  }
}

// ─── Containers ────────────────────────────────────────────────────────────────

function GroupField(props: FieldProps) {
  const { field, value, onChange, disabled } = props;
  const group = (value ?? {}) as FieldValues;
  const subs = (field.fields ?? []).filter((f) => !f.hidden);
  const setValue = (name: string, v: unknown) =>
    onChange({ ...group, [name]: v });

  // Borderless stack: the surrounding section provides the heading, so the
  // group itself stays visually flat (no fieldset-in-card chrome).
  return (
    <div className="grid gap-4">
      {subs.map((sub) => (
        <SchemaField
          key={sub.name}
          field={sub}
          value={group[sub.name ?? ""]}
          onChange={(v) => sub.name && setValue(sub.name, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function CollapsibleField(props: FieldProps) {
  const { field, value, onChange, disabled } = props;
  const group = (value ?? {}) as FieldValues;
  const setValue = (name: string, v: unknown) =>
    onChange({ ...group, [name]: v });

  return (
    <Collapsible className="rounded-lg border">
      <CollapsibleTrigger
        render={
          <Button
            id={field.name ? `${field.name}-toggle` : undefined}
            variant="ghost"
            className="w-full justify-between"
          />
        }
      >
        <span>{field.label ?? "More"}</span>
        <span className="text-xs text-muted-foreground">toggle</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 p-4 pt-0">
          {(field.fields ?? [])
            .filter((f) => !f.hidden)
            .map((sub) => (
              <SchemaField
                key={sub.name}
                field={sub}
                value={group[sub.name ?? ""]}
                onChange={(v) => sub.name && setValue(sub.name, v)}
                disabled={disabled}
              />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArrayField({
  field,
  value,
  onChange,
  disabled,
  error,
  emptyHint,
  hideSubNames,
}: FieldProps) {
  const items: FieldValues[] = Array.isArray(value)
    ? (value as FieldValues[])
    : [];
  const [openRows, setOpenRows] = useState<ReadonlySet<number>>(new Set());

  const baseLabel = field.label ?? "Item";

  // First text value inside the row gives a meaningful collapsed summary.
  // Prefer human-named fields (label/title/name) over raw keys so technical
  // values like "screen_size" never become the visible row title.
  const rowDetail = (item: FieldValues): string | null => {
    const subs = field.fields ?? [];
    for (const preferred of ["label", "title", "name"]) {
      const v = item[preferred];
      if (typeof v === "string" && v.trim()) return v;
    }
    for (const sub of subs) {
      if (
        sub.name &&
        (sub.type === "text" || sub.type === "textarea" || sub.type === "email")
      ) {
        const v = item[sub.name];
        if (typeof v === "string" && v.trim()) return v;
      }
    }
    return null;
  };

  const toggleRow = (idx: number, open: boolean) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (open) next.add(idx);
      else next.delete(idx);
      return next;
    });

  const setItem = (idx: number, v: FieldValues) =>
    onChange(items.map((it, i) => (i === idx ? v : it)));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const newItem = (): FieldValues => {
    const out: FieldValues = {};
    for (const sub of field.fields ?? []) {
      if (sub.name && !sub.hidden && sub.defaultValue !== undefined)
        out[sub.name] = sub.defaultValue;
    }
    return out;
  };

  const addItem = () => {
    onChange([...items, newItem()]);
    setOpenRows((prev) => new Set(prev).add(items.length));
  };

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label field={field} />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || items.length === 0}
            onClick={() => setOpenRows(new Set())}
            title="Collapse all items"
          >
            <ChevronsDownUp />
            Collapse
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || items.length === 0}
            onClick={() => setOpenRows(new Set(items.map((_, i) => i)))}
            title="Expand all items"
          >
            <ChevronsUpDown />
            Expand
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addItem}
          >
            <Plus />
            {`Add ${baseLabel}`}
          </Button>
        </div>
      </div>
      <ErrorText error={error} />
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {emptyHint ?? `No ${baseLabel.toLowerCase()} yet.`}
          </p>
        )}
        {items.map((item, idx) => {
          const open = openRows.has(idx);
          const detail = rowDetail(item);
          return (
            <Collapsible
              key={idx}
              open={open}
              onOpenChange={(o) => toggleRow(idx, o)}
              className="rounded-lg border bg-background"
            >
              <div className="flex items-center gap-1 py-1 pl-2 pr-1">
                <CollapsibleTrigger
                  render={
                    <button
                      type="button"
                      id={`${field.name}-row-${idx}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left"
                    />
                  }
                >
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                      open ? "" : "-rotate-90"
                    }`}
                  />
                  <Badge
                    variant="outline"
                    className="shrink-0 px-1.5 font-mono text-[10px]"
                  >
                    {baseLabel} {String(idx + 1).padStart(2, "0")}
                  </Badge>
                  {detail ? (
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {detail}
                    </span>
                  ) : null}
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  title="Move up"
                  aria-label="Move up"
                  disabled={idx === 0 || disabled}
                  onClick={() => move(idx, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  title="Move down"
                  aria-label="Move down"
                  disabled={idx === items.length - 1 || disabled}
                  onClick={() => move(idx, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  title="Duplicate"
                  aria-label="Duplicate"
                  disabled={disabled}
                  onClick={() =>
                    onChange([
                      ...items.slice(0, idx + 1),
                      JSON.parse(JSON.stringify(item)),
                      ...items.slice(idx + 1),
                    ])
                  }
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 text-destructive hover:text-destructive"
                  title="Remove"
                  aria-label="Remove"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 />
                </Button>
              </div>
              <CollapsibleContent>
                <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-2">
                  {(field.fields ?? [])
                    .filter(
                      (f) =>
                        !f.hidden &&
                        !(hideSubNames ?? []).includes(f.name ?? ""),
                    )
                    .map((sub) => (
                      <SchemaField
                        key={sub.name}
                        field={sub}
                        value={item[sub.name ?? ""]}
                        onChange={(v) =>
                          sub.name && setItem(idx, { ...item, [sub.name]: v })
                        }
                        disabled={disabled}
                      />
                    ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <Description text={field.description} />
    </Field>
  );
}

function BlocksField({ field, value, onChange, disabled }: FieldProps) {
  const items: FieldValues[] = Array.isArray(value)
    ? (value as FieldValues[])
    : [];
  const blocks = field.blocks ?? [];
  const [nextBlock, setNextBlock] = useState("");

  const setItem = (idx: number, v: FieldValues) =>
    onChange(items.map((it, i) => (i === idx ? v : it)));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const addBlock = (slug: string) => {
    const def = blocks.find((b) => b.slug === slug);
    if (!def) return;
    const item: FieldValues = { blockType: slug, blockName: "" };
    for (const sub of def.fields) {
      if (sub.name && !sub.hidden && sub.defaultValue !== undefined)
        item[sub.name] = sub.defaultValue;
    }
    onChange([...items, item]);
  };

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label field={field} />
        <div className="flex items-center gap-1">
          <Select
            value={nextBlock}
            onValueChange={(v) => setNextBlock(v ?? "")}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Block type…" />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((b) => (
                <SelectItem key={b.slug} value={b.slug}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nextBlock || disabled}
            onClick={() => {
              if (nextBlock) {
                addBlock(nextBlock);
                setNextBlock("");
              }
            }}
          >
            <Plus />
            Add block
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            No blocks yet.
          </p>
        )}
        {items.map((item, idx) => {
          const def = blocks.find((b) => b.slug === item.blockType);
          return (
            <Collapsible
              key={typeof item.id === "string" ? item.id : idx}
              className="rounded-lg border"
              defaultOpen={idx === items.length - 1}
            >
              <div className="flex items-center justify-between pr-1">
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start font-normal"
                    />
                  }
                >
                  <Badge variant="secondary">
                    {def?.label ?? String(item.blockType)}
                  </Badge>
                  <span className="truncate text-xs text-muted-foreground">
                    {String(item.blockName || def?.label || "")}
                  </span>
                </CollapsibleTrigger>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={idx === 0 || disabled}
                    onClick={() => move(idx, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={idx === items.length - 1 || disabled}
                    onClick={() => move(idx, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove"
                    disabled={disabled}
                    onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <CollapsibleContent>
                <div className="grid gap-3 p-3 pt-0">
                  {(def?.fields ?? [])
                    .filter((f) => !f.hidden && f.name !== "id")
                    .map((sub) => (
                      <SchemaField
                        key={sub.name}
                        field={sub}
                        value={item[sub.name ?? ""]}
                        onChange={(v) =>
                          sub.name && setItem(idx, { ...item, [sub.name]: v })
                        }
                        disabled={disabled}
                      />
                    ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <Description text={field.description} />
    </Field>
  );
}

function TabsField({ field, value, onChange, disabled }: FieldProps) {
  const { tabs } = field;
  if (!tabs || tabs.length === 0) return null;

  // Named tabs nest their data under the tab name; unnamed tabs are inline.
  const named = tabs.some((t) => t.name);

  if (!named) {
    return (
      <Tabs defaultValue="0">
        <TabsList>
          {tabs.map((t, i) => (
            <TabsTrigger key={i} value={String(i)}>
              {t.label ?? `Tab ${i + 1}`}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t, i) => (
          <TabsContent key={i} value={String(i)} className="grid gap-4 pt-2">
            {t.fields
              .filter((f) => !f.hidden)
              .map((sub) => (
                <SchemaField
                  key={sub.name}
                  field={sub}
                  value={(value as FieldValues)?.[sub.name ?? ""]}
                  onChange={(v) =>
                    sub.name &&
                    onChange({ ...(value as FieldValues), [sub.name!]: v })
                  }
                  disabled={disabled}
                />
              ))}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue="0">
      <TabsList>
        {tabs.map((t, i) => (
          <TabsTrigger key={i} value={String(i)}>
            {t.label ?? t.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t, i) => (
        <TabsContent key={i} value={String(i)} className="grid gap-4 pt-2">
          {t.fields
            .filter((f) => !f.hidden)
            .map((sub) => (
              <SchemaField
                key={sub.name}
                field={sub}
                value={
                  ((value as FieldValues)?.[t.name ?? ""] as FieldValues)?.[
                    sub.name ?? ""
                  ]
                }
                onChange={(v) =>
                  sub.name &&
                  onChange({
                    ...(value as FieldValues),
                    [t.name!]: {
                      ...(((value as FieldValues)?.[t.name!] as FieldValues) ??
                        {}),
                      [sub.name]: v,
                    },
                  })
                }
                disabled={disabled}
              />
            ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────────

export function SchemaField(props: FieldProps) {
  const { field } = props;

  if (field.hidden) return null;

  // Schema-level readOnly applies regardless of the user's permissions.
  const merged: FieldProps = field.readOnly
    ? { ...props, disabled: true }
    : props;

  switch (field.type) {
    case "tabs":
      return <TabsField {...merged} />;
    case "group":
      return <GroupField {...merged} />;
    case "collapsible":
      return <CollapsibleField {...merged} />;
    case "array": {
      // Purpose-built editors for the common single-subfield array shapes.
      const subs = (field.fields ?? []).filter((f) => !f.hidden && f.name);
      if (
        subs.length === 1 &&
        subs[0].type === "upload" &&
        subs[0].name === "image"
      )
        return <ImagesArrayField {...merged} />;
      return <ArrayField {...merged} />;
    }
    case "blocks":
      return <BlocksField {...merged} />;
    case "relationship":
      return (
        <RelationInput {...merged} relationTo={field.relationTo ?? "media"} />
      );
    case "upload":
      return <UploadInput {...merged} />;
    default:
      return <SimpleField {...merged} />;
  }
}

/** Recursively convert editor state into an API-ready value. */
export function serializeForSave(field: NormField, value: unknown): unknown {
  switch (field.type) {
    case "richText":
    case "richtext":
    case "json":
    case "textarea":
    case "text":
      if (
        field.type === "richText" ||
        field.type === "richtext" ||
        field.type === "json"
      ) {
        if (typeof value === "string") {
          if (!value.trim()) return null;
          try {
            return JSON.parse(value);
          } catch {
            return value; // let the API report the validation error
          }
        }
        return value ?? null;
      }
      return value === "" ? (field.required ? "" : null) : (value ?? null);
    case "group":
    case "collapsible": {
      if (!value || typeof value !== "object") return value ?? null;
      const out: FieldValues = { ...(value as FieldValues) };
      for (const sub of field.fields ?? []) {
        if (!sub.name) continue;
        out[sub.name] = serializeForSave(sub, out[sub.name]);
      }
      return out;
    }
    case "array": {
      if (!Array.isArray(value)) return value ?? null;
      return value.map((item) => {
        if (!item || typeof item !== "object") return item;
        const out: FieldValues = { ...(item as FieldValues) };
        for (const sub of field.fields ?? []) {
          if (!sub.name) continue;
          out[sub.name] = serializeForSave(sub, out[sub.name]);
        }
        return out;
      });
    }
    case "blocks": {
      if (!Array.isArray(value)) return value ?? null;
      return value.map((item) => {
        if (!item || typeof item !== "object") return item;
        const rec = item as FieldValues;
        const def = (field.blocks ?? []).find((b) => b.slug === rec.blockType);
        const out: FieldValues = { ...rec };
        for (const sub of def?.fields ?? []) {
          if (!sub.name) continue;
          out[sub.name] = serializeForSave(sub, out[sub.name]);
        }
        // Strip client-side reordering keys? Payload accepts its own shape;
        // blockType + fields + id + blockName are all valid.
        return out;
      });
    }
    case "tabs": {
      // Values for tab fields live at their (possibly nested) paths already;
      // nothing extra to transform at this level.
      return value ?? null;
    }
    default:
      return value === undefined ? null : value;
  }
}
