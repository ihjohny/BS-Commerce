import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";

import type { NormField } from "@/lib/schema";
import { RelationInput, UploadInput } from "@/components/fields/FieldInputs";
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

function SimpleField({ field, value, onChange, disabled }: FieldProps) {
  const id = `f-${field.name}`;
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
            disabled={disabled}
            maxLength={field.max}
            onChange={(e) => onChange(e.target.value)}
          />
          <Description text={field.description} />
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
            disabled={disabled}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
          />
          <Description text={field.description} />
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
            disabled={disabled}
            autoComplete={
              field.type === "password" ? "new-password" : undefined
            }
            onChange={(e) => onChange(e.target.value)}
          />
          <Description text={field.description} />
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
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <Label field={field} />
          <Description text={field.description} />
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
            disabled={disabled}
          >
            <SelectTrigger id={id} className="w-full">
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
        </Field>
      );
    }
    case "date": {
      // Payload stores full ISO; datetime-local needs "YYYY-MM-DDTHH:mm".
      const local = str ? str.slice(0, 16) : "";
      return (
        <Field>
          <Label field={field} />
          <Input
            id={id}
            type="datetime-local"
            value={local}
            disabled={disabled}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />
          <Description text={field.description} />
        </Field>
      );
    }
    case "json":
    case "richtext": {
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
            className="font-mono text-xs"
            value={text}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <Description
            text={
              field.description ??
              (field.type === "richtext"
                ? "Lexical rich text, edited as JSON."
                : "JSON value.")
            }
          />
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
          <Description
            text={
              field.description ?? `Field type “${field.type}” edited as JSON.`
            }
          />
        </Field>
      );
  }
}

// ─── Containers ────────────────────────────────────────────────────────────────

function GroupField(props: FieldProps) {
  const { field, value, onChange, disabled } = props;
  const group = (value ?? {}) as FieldValues;
  const setValue = (name: string, v: unknown) =>
    onChange({ ...group, [name]: v });

  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{field.label}</legend>
      <div className="grid gap-4">
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
    </fieldset>
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
        render={<Button variant="ghost" className="w-full justify-between" />}
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

function ArrayField({ field, value, onChange, disabled }: FieldProps) {
  const items: FieldValues[] = Array.isArray(value)
    ? (value as FieldValues[])
    : [];

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

  return (
    <Field>
      <div className="flex items-center justify-between">
        <Label field={field} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...items, newItem()])}
        >
          <Plus />
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            No items yet.
          </p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">#{idx + 1}</span>
              <div className="flex items-center gap-0.5">
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
                  aria-label="Remove"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <div className="grid gap-3">
              {(field.fields ?? [])
                .filter((f) => !f.hidden)
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
          </div>
        ))}
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

  switch (field.type) {
    case "tabs":
      return <TabsField {...props} />;
    case "group":
      return <GroupField {...props} />;
    case "collapsible":
      return <CollapsibleField {...props} />;
    case "array":
      return <ArrayField {...props} />;
    case "blocks":
      return <BlocksField {...props} />;
    case "relationship":
      return (
        <RelationInput {...props} relationTo={field.relationTo ?? "media"} />
      );
    case "upload":
      return <UploadInput {...props} />;
    default:
      return <SimpleField {...props} />;
  }
}

/** Recursively convert editor state into an API-ready value. */
export function serializeForSave(field: NormField, value: unknown): unknown {
  switch (field.type) {
    case "richtext":
    case "json":
    case "textarea":
    case "text":
      if (field.type === "richtext" || field.type === "json") {
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
