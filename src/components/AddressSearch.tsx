import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export interface AddressSuggestion {
  label: string;
  street: string;
  postalCode: string;
  city: string;
  /** false = hors de la zone d'intervention ; null/absent = inconnu */
  inZone?: boolean | null;
}

interface Props {
  id: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
}

/** Address field with suggestions from the national address base (keyboard and screen-reader friendly). */
export const AddressSearch: React.FC<Props> = ({ id, value, onChange, onSelect, placeholder, className = '', autoFocus, size = 'md' }) => {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const timer = useRef<number>();
  const reqId = useRef(0);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    window.clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      const mine = ++reqId.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        if (mine !== reqId.current) return; // a newer keystroke already replaced this answer
        setItems(Array.isArray(data.suggestions) ? data.suggestions : []);
        setOpen(true);
        setActive(-1);
      } catch {
        setItems([]);
      } finally {
        if (mine === reqId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer.current);
  }, [value]);

  const choose = (s: AddressSuggestion) => {
    skipNext.current = true;
    setOpen(false);
    setItems([]);
    onSelect(s);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const pad = size === 'lg' ? 'py-4 text-base' : 'py-2.5 text-sm';

  return (
    <div className={`relative ${className}`}>
      <MapPin className={`w-5 h-5 text-stone-400 absolute left-4 ${size === 'lg' ? 'top-4' : 'top-3'}`} aria-hidden />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="street-address"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => items.length > 0 && setOpen(true)}
        className={`w-full pl-12 pr-10 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-500 ${pad}`}
      />
      {loading && <Loader2 className="w-4 h-4 animate-spin text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" aria-hidden />}
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl text-left"
        >
          {items.map((s, i) => (
            <li
              key={s.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm ${i === active ? 'bg-amber-50' : ''}`}
            >
              <MapPin className="w-4 h-4 text-stone-400 shrink-0" aria-hidden />
              <span className="text-stone-900">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
