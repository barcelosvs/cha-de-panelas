import React from 'react';

const VARIANTS = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  danger: 'btn-danger',
  ghost: 'btn-base bg-transparent hover:bg-emerald-100 dark:hover:bg-emerald-800/40',
};

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  className = '',
  children,
  loading = false,
  disabled,
  ...rest
}) {
  const cls = [
    VARIANTS[variant] || VARIANTS.primary,
    className,
    loading ? 'cursor-wait' : '',
  ]
    .join(' ')
    .trim();
  return (
    <Tag className={cls} disabled={disabled || loading} {...rest}>
      {loading && (
        <span
          className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
          aria-hidden="true"
        />
      )}
      {children}
    </Tag>
  );
}
