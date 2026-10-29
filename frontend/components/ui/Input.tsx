import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  labelClassName?: string;
  helperClassName?: string;
  endAdornment?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, className = "", labelClassName = "", helperClassName = "", endAdornment, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const inputClassName = `bg-[var(--canvas)] text-[var(--ink)] border rounded px-3 py-2 text-sm placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-[var(--accent-text)] transition-colors duration-140 disabled:bg-[var(--surface)] disabled:cursor-not-allowed ${
      error
        ? "border-[var(--status-ditolak)] focus:border-[var(--status-ditolak)]"
        : "border-[var(--line-strong)]"
    } ${className}`;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className={`text-sm font-medium text-[var(--ink)] transition-colors duration-300 ${labelClassName}`}>
            {label}
          </label>
        )}
        {endAdornment ? (
          <div className="relative w-full">
            <input
              id={inputId}
              ref={ref}
              className={`${inputClassName} w-full pr-10`}
              {...props}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {endAdornment}
            </div>
          </div>
        ) : (
          <input id={inputId} ref={ref} className={inputClassName} {...props} />
        )}
        {helper && !error && (
          <span className={`text-xs text-[var(--ink-muted)] transition-colors duration-300 ${helperClassName}`}>{helper}</span>
        )}
        {error && <span className="text-xs text-[var(--status-ditolak)]">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
