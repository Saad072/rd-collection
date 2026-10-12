import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Label + control + validation message wrapper.
 * Error text is announced via role="alert".
 */
export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-sale" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-sale">
          {error}
        </p>
      )}
    </div>
  );
}
