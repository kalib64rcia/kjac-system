import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea, FieldError } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  q: string;
  a: string;
}

export function parseFaq(raw: string): { items: FaqItem[]; error: string | null } {
  if (!raw.trim()) return { items: [], error: null };
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return { items: [], error: "FAQ data is not a list." };
    const items = v
      .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
      .map((e) => ({ q: String(e.q ?? ""), a: String(e.a ?? "") }))
      .filter((e) => e.q.trim() || e.a.trim());
    return { items, error: null };
  } catch {
    return { items: [], error: "Saved FAQ data is invalid and cannot be edited." };
  }
}

/** FAQ editor: show toggle + collapsible items + add form.
 *  Serializes to the faq_items JSON string via onChange. */
export function FAQSection({
  value,
  onChange,
  showValue,
  onShowChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  showValue: boolean;
  onShowChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { items, error } = useMemo(() => parseFaq(value), [value]);
  const [open, setOpen] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<number | null>(null);
  const [draftQ, setDraftQ] = useState("");
  const [draftA, setDraftA] = useState("");
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const commit = (next: FaqItem[]) => onChange(JSON.stringify(next));

  const startEdit = (i: number) => {
    setEditing(i);
    setDraftQ(items[i].q);
    setDraftA(items[i].a);
  };

  const saveEdit = () => {
    if (editing === null || !draftQ.trim() || !draftA.trim()) return;
    const next = [...items];
    next[editing] = { q: draftQ.trim(), a: draftA.trim() };
    commit(next);
    setEditing(null);
  };

  const add = () => {
    if (!newQ.trim() || !newA.trim() || disabled) return;
    commit([...items, { q: newQ.trim(), a: newA.trim() }]);
    setNewQ("");
    setNewA("");
  };

  const remove = (i: number) => {
    commit(items.filter((_, j) => j !== i));
    if (editing === i) setEditing(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label id="faq-show-label">Show on site</Label>
          <p className="mt-0.5 text-xs text-gray-600">Toggles the whole FAQ section on the landing page.</p>
        </div>
        <Switch
          checked={showValue}
          onCheckedChange={onShowChange}
          disabled={disabled}
          aria-labelledby="faq-show-label"
        />
      </div>

      <FieldError message={error ?? undefined} />

      {items.length > 0 && (
        <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
          {items.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">
                <span className="min-w-0 flex-1 truncate">{item.q || "(Empty question)"}</span>
              </AccordionTrigger>
              <AccordionContent>
                {editing === i ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`faq-q-${i}`}>Question</Label>
                    <Textarea id={`faq-q-${i}`} rows={2} maxLength={500} value={draftQ} onChange={(e) => setDraftQ(e.target.value)} disabled={disabled} />
                    <Label htmlFor={`faq-a-${i}`}>Answer</Label>
                    <Textarea id={`faq-a-${i}`} rows={3} maxLength={2000} value={draftA} onChange={(e) => setDraftA(e.target.value)} disabled={disabled} />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={saveEdit} disabled={disabled || !draftQ.trim() || !draftA.trim()}>
                        Done
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm whitespace-pre-wrap text-gray-700">{item.a}</p>
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(i)} disabled={disabled}>
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => remove(i)} disabled={disabled}>
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="rounded-lg border border-gray-200 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Plus size={14} aria-hidden="true" /> Add FAQ
        </p>
        <p className="mt-0.5 text-xs text-gray-600">One entry in the public FAQ list.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="faq-new-q">Question</Label>
            <Textarea id="faq-new-q" rows={2} maxLength={500} value={newQ} onChange={(e) => setNewQ(e.target.value)} disabled={disabled} placeholder="e.g. How do I book?" />
          </div>
          <div>
            <Label htmlFor="faq-new-a">Answer</Label>
            <Textarea id="faq-new-a" rows={2} maxLength={2000} value={newA} onChange={(e) => setNewA(e.target.value)} disabled={disabled} placeholder="e.g. Use the Book Service page…" />
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={add} disabled={disabled || !newQ.trim() || !newA.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
