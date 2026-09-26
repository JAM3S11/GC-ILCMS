import React from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

export interface SelectOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Shown when `value` matches none of the options. */
  placeholder?: string;
  /** xs for toolbars and table rows, sm for dense forms, md (default) for full-size forms. */
  size?: 'xs' | 'sm' | 'md';
  /** Replaces the default button styling entirely (for surfaces with their own look, e.g. the landing page). */
  buttonClassName?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  invalid?: boolean;
  disabled?: boolean;
}

const SIZE = {
  xs: 'h-8 pl-2.5 pr-8 text-xs',
  sm: 'py-1.5 pl-3 pr-9 text-xs',
  md: 'py-2.5 pl-3.5 pr-10 text-sm',
};

/**
 * Accessible dropdown built on Headless UI's Listbox — use in place of a native `<select>`.
 * Options render in a portal anchored to the button, so they are never clipped by panels or modals.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'md',
  buttonClassName,
  className = '',
  id,
  'aria-label': ariaLabel,
  invalid,
  disabled,
}: SelectProps<T>) {
  const selected = options.find((o) => o.value === value);

  const defaultButton = `w-full rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none dark:bg-slate-950 dark:text-white ${
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-500/60'
      : 'border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700'
  }`;

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        <ListboxButton
          id={id}
          aria-label={ariaLabel}
          className={`relative cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50 ${SIZE[size]} ${
            buttonClassName ?? defaultButton
          }`}
        >
          <span className={`block truncate ${selected ? '' : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        </ListboxButton>

        <ListboxOptions
          anchor={{ to: 'bottom start', gap: 4 }}
          transition
          className="z-[100] max-h-64 w-(--button-width) min-w-44 overflow-auto rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg ring-1 ring-black/5 transition duration-100 ease-in focus:outline-none data-closed:opacity-0 dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((opt) => (
            <ListboxOption
              key={opt.value}
              value={opt.value}
              className="group relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-slate-700 data-focus:bg-amber-500/10 data-focus:text-slate-900 data-selected:font-semibold dark:text-slate-200 dark:data-focus:text-white"
            >
              <CheckIcon
                aria-hidden="true"
                className="invisible absolute left-2 h-4 w-4 text-amber-500 group-data-selected:visible"
              />
              <span className="block truncate">{opt.label}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
