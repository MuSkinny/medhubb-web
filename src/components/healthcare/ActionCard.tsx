"use client";

import { ReactNode } from "react";

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  buttonText: string;
  onClick: () => void;
  variant?: "doctor" | "patient" | "default";
  className?: string;
  disabled?: boolean;
}

export default function ActionCard({
  title,
  description,
  icon,
  buttonText,
  onClick,
  variant = "default",
  className = "",
  disabled = false
}: ActionCardProps) {

  const getVariantStyles = () => {
    switch (variant) {
      case "doctor":
        return {
          iconBg: "hsl(var(--primary-light))",
          iconColor: "hsl(var(--primary-dark))",
          gradient: "var(--gradient-primary)",
          cardBorder: "border-blue-200",
          cardHover: "hover:border-blue-300 hover:bg-blue-50/50"
        };
      case "patient":
        return {
          iconBg: "hsl(var(--secondary-light))",
          iconColor: "hsl(var(--secondary-dark))",
          gradient: "var(--gradient-secondary)",
          cardBorder: "border-green-200",
          cardHover: "hover:border-green-300 hover:bg-green-50/50"
        };
      default:
        return {
          iconBg: "hsl(var(--muted))",
          iconColor: "hsl(var(--muted-foreground))",
          gradient: "linear-gradient(135deg, hsl(var(--muted-foreground)) 0%, hsl(var(--foreground)) 100%)",
          cardBorder: "border-slate-200",
          cardHover: "hover:border-slate-300 hover:bg-slate-50/50"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`healthcare-card group cursor-pointer ${styles.cardBorder} ${styles.cardHover} ${className}`}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
        style={{ background: styles.gradient }}
      >
        <div className="text-white">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-slate-900 transition-colors">{title}</h3>
      <p className="text-slate-600 mb-6 text-sm leading-relaxed group-hover:text-slate-700 transition-colors">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="healthcare-button primary w-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonText}
      </button>
    </div>
  );
}