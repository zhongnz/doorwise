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
        'btn',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="spinner" />
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
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
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
    sm: 'input-sm',
    md: '',
    lg: 'input-lg',
  };

  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
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
        <span className="input-error-text">{error}</span>
      )}
      {hint && !error && (
        <span className="input-hint">{hint}</span>
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
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'input',
          error && 'input-error',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span className="input-error-text">{error}</span>
      )}
      {hint && !error && (
        <span className="input-hint">{hint}</span>
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
    <div className="input-group">
      {label && (
        <label className="input-label">
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
        <span className="input-error-text">{error}</span>
      )}
      {hint && !error && (
        <span className="input-hint">{hint}</span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Card Component
 * Container with dark surface styling
 */
export const Card = ({ children, className, elevated = false, ...props }) => {
  return (
    <div
      className={clsx(
        'card',
        elevated && 'card-elevated',
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
    sm: 'btn-icon-sm',
    md: 'btn-icon-md',
    lg: 'btn-icon-lg',
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
    info: 'alert-info',
    warning: 'alert-warning',
    error: 'alert-error',
    success: 'alert-success',
  };

  return (
    <div className={clsx('alert', variantClasses[variant], className)}>
      {Icon && <Icon size={18} className="alert-icon" />}
      <div className="alert-content">{children}</div>
    </div>
  );
};

/**
 * Empty State Component
 * Placeholder when no content is available
 */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => {
  return (
    <div className={clsx('empty-state', className)}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={28} />
        </div>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

/**
 * Progress Steps Component
 * Multi-step progress indicator
 */
export const ProgressSteps = ({ steps, currentStep, className }) => {
  return (
    <div className={clsx('progress-steps', className)}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={step} className="progress-step-item">
            <div
              className={clsx(
                'progress-step-circle',
                isActive && 'active',
                isCompleted && 'completed'
              )}
            >
              {isCompleted ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  'progress-step-line',
                  isCompleted && 'completed'
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
    <span className={clsx('pill', className)}>
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
};
