import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Parse an ISO string into a Date, or undefined when empty/invalid. */
function parseIso(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Combine a calendar date with an "HH:mm" time string into an ISO string. */
function combineIso(date: Date, time: string): string {
  const d = new Date(date);
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

function timePart(iso: string | null | undefined): string {
  const d = parseIso(iso);
  return d ? format(d, "HH:mm") : "00:00";
}

/**
 * Calendar-based picker for Payload `date` fields (datetime).
 * Value is a full ISO string or null; picking a day keeps the existing time.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const [time, setTime] = useState(() => timePart(value));

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-start font-normal"
            >
              <CalendarIcon className="text-muted-foreground" />
              {selected ? format(selected, "PPP p") : "Pick a date"}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (!d) return;
              setTime(timePart(value));
              onChange(combineIso(d, timePart(value)));
              setOpen(false);
            }}
            autoFocus
          />
          <div className="flex items-center gap-2 border-t p-2">
            <Input
              type="time"
              value={time}
              disabled={disabled}
              step={60}
              onChange={(e) => {
                setTime(e.target.value);
                if (selected) onChange(combineIso(selected, e.target.value));
              }}
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setTime("00:00");
                  onChange(null);
                  setOpen(false);
                }}
              >
                <X />
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Calendar range picker for dashboard date presets.
 * Dates are "YYYY-MM-DD" strings (or empty when unset).
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  disabled,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const range: DateRange | undefined = {
    from: parseIso(from) ?? undefined,
    to: parseIso(to) ?? undefined,
  };
  const label =
    from && to
      ? `${format(parseIso(from)!, "MMM d, yyyy")} – ${format(parseIso(to)!, "MMM d, yyyy")}`
      : "Pick a range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="justify-start font-normal"
          >
            <CalendarIcon className="text-muted-foreground" />
            {label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={range}
          defaultMonth={range.from}
          onSelect={(r) => {
            if (!r?.from) return;
            onChange(
              format(r.from, "yyyy-MM-dd"),
              r.to ? format(r.to, "yyyy-MM-dd") : "",
            );
            if (r.to) setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
