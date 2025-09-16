"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {

  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return "healthcare-button secondary";
      case "success":
        return "healthcare-button success";
      default:
        return "healthcare-button primary";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { fontSize: '12px', padding: '8px 16px' };
      case "lg":
        return { fontSize: '16px', padding: '16px 32px' };
      default:
        return { fontSize: '14px', padding: '12px 24px' };
    }
  };

  const isDisabled = disabled || loading;
  const sizeStyles = getSizeStyles();
  const disabledStyles = isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {};

  return (
    <button
      className={`${getVariantClass()} ${className}`}
      style={{ ...sizeStyles, ...disabledStyles }}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}