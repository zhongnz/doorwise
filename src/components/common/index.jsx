import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

/**
 * Button Component
 * Primary interactive element with multiple variants
 */
export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}, ref) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    success: 'btn-success',
    danger: 'btn-danger',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <button
      ref={ref}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * Badge Component
 * Small status indicators and labels
 */
export const Badge = ({ children, variant = 'default', className, ...props }) => {
  const variantClasses = {
    default: 'badge-default',
    blue: 'badge-blue',
    amber: 'badge-amber',
    green: 'badge-green',
    red: 'badge-red',
  };

  return (
    <span
      className={clsx('badge', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * Input Component
 * Form input with validation states
 */
export const Input = forwardRef(({
  label,
  error,
  hint,
  size = 'md',
  className,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: '',
    lg: 'input-lg',
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'input',
          sizeClasses[size],
          error && 'input-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-sm text-red">{error}</span>
      )}
      {hint && !error && (
        <span className="text-sm text-muted">{hint}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Select Component
 * Dropdown selection with custom styling
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  children,
  className,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'input select',
          error && 'input-error',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="text-sm text-red">{error}</span>
      )}
      {hint && !error && (
        <span className="text-sm text-muted">{hint}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * Textarea Component
 * Multi-line text input
 */
export const Textarea = forwardRef(({
  label,
  error,
  hint,
  className,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-secondary uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={clsx(
          'input',
          error && 'input-error',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-sm text-red">{error}</span>
      )}
      {hint && !error && (
        <span className="text-sm text-muted">{hint}</span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Card Component
 * Container with glass morphism styling
 */
export const Card = ({ children, className, elevated = false, ...props }) => {
  return (
    <div
      className={clsx(
        'glass-panel',
        elevated && 'glass-panel-elevated',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx('card-header', className)} {...props}>
      {children}
    </div>
  );
};

export const CardBody = ({ children, className, ...props }) => {
  return (
    <div className={clsx('card-body', className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className, ...props }) => {
  return (
    <div className={clsx('card-footer', className)} {...props}>
      {children}
    </div>
  );
};

/**
 * Spinner Component
 * Loading indicator
 */
export const Spinner = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'spinner-sm',
    md: '',
    lg: 'spinner-lg',
  };

  return (
    <div className={clsx('spinner', sizeClasses[size], className)} />
  );
};

/**
 * Icon Button Component
 * Compact button for icons only
 */
export const IconButton = forwardRef(({
  children,
  variant = 'ghost',
  size = 'md',
  label,
  className,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const variantClasses = {
    ghost: 'btn-ghost',
    secondary: 'btn-secondary',
    primary: 'btn-primary',
  };

  return (
    <button
      ref={ref}
      className={clsx(
        'btn btn-icon',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';

/**
 * Divider Component
 * Visual separator
 */
export const Divider = ({ vertical = false, className }) => {
  return (
    <div
      className={clsx(
        vertical ? 'divider-vertical' : 'divider',
        className
      )}
    />
  );
};

/**
 * Skeleton Component
 * Loading placeholder
 */
export const Skeleton = ({ className, circle = false, width, height, ...props }) => {
  return (
    <div
      className={clsx(
        'skeleton',
        circle && 'skeleton-circle',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
};

/**
 * Alert/Banner Component
 * Contextual feedback messages
 */
export const Alert = ({ children, variant = 'info', icon: Icon, className }) => {
  const variantClasses = {
    info: 'bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.2)] text-[#c9f4ff]',
    warning: 'bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.2)] text-[#fde68a]',
    error: 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-[#fca5a5]',
    success: 'bg-[rgba(16,185,129,0.08)] border-[rgba(16,185,129,0.2)] text-[#6ee7b7]',
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl border',
        variantClasses[variant],
        className
      )}
    >
      {Icon && <Icon size={18} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
};

/**
 * Empty State Component
 * Placeholder when no content is available
 */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={clsx('flex flex-col items-center text-center py-12 px-6', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-4">
          <Icon size={28} className="text-muted" />
        </div>
      )}
      {title && <h4 className="text-lg font-semibold mb-2">{title}</h4>}
      {description && <p className="text-secondary text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

/**
 * Progress Steps Component
 * Multi-step progress indicator
 */
export const ProgressSteps = ({ steps, currentStep, className }) => {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                isActive && 'bg-[var(--accent-blue)] text-black',
                isCompleted && 'bg-[var(--status-verified)] text-white',
                !isActive && !isCompleted && 'bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]'
              )}
            >
              {isCompleted ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'w-8 h-0.5 rounded-full',
                  isCompleted ? 'bg-[var(--status-verified)]' : 'bg-[rgba(255,255,255,0.08)]'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Pill Component
 * Inline tag/label
 */
export const Pill = ({ children, icon: Icon, className }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-[rgba(255,255,255,0.04)] border border-[var(--border-glass)]',
        'text-sm text-[var(--text-primary)]',
        className
      )}
    >
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
};
