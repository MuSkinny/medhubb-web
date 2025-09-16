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
          iconBg: "rgba(74, 144, 226, 0.1)",
          iconColor: "#4A90E2",
          buttonBg: "linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)",
          buttonHover: "hover:opacity-90"
        };
      case "patient":
        return {
          iconBg: "rgba(39, 174, 96, 0.1)",
          iconColor: "#27AE60",
          buttonBg: "linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)",
          buttonHover: "hover:opacity-90"
        };
      default:
        return {
          iconBg: "rgba(107, 114, 128, 0.1)",
          iconColor: "#6B7280",
          buttonBg: "#6B7280",
          buttonHover: "hover:bg-gray-600"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all hover:shadow-md ${className}`}>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ background: styles.iconBg }}
      >
        <div style={{ color: styles.iconColor }}>
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 text-sm">{description}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all ${styles.buttonHover} disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{
          background: disabled ? "#D1D5DB" : styles.buttonBg
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}