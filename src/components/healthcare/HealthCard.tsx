"use client";

// import { ReactNode } from "react";
// import { LucideIcon } from "lucide-react";

interface HealthCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'orange';
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  className?: string;
}

export default function HealthCard({
  title,
  value,
  subtitle,
  trend,
  color = 'blue',
  icon: Icon,
  className = ""
}: HealthCardProps) {

  const getColorStyles = () => {
    switch (color) {
      case "green":
        return {
          iconBg: "rgba(52, 199, 89, 0.1)",
          iconColor: "#34C759",
        };
      case "orange":
        return {
          iconBg: "rgba(255, 149, 0, 0.1)",
          iconColor: "#FF9500",
        };
      default:
        return {
          iconBg: "rgba(0, 122, 255, 0.1)",
          iconColor: "#007AFF",
        };
    }
  };

  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null;

    return trend === 'up' ? (
      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
      </svg>
    ) : (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
      </svg>
    );
  };

  const styles = getColorStyles();

  return (
    <div className={`healthcare-card healthcare-stat-card animate-fade-in ${className}`}>
      <div className="flex items-center justify-center mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: styles.iconBg }}
        >
          <Icon size={28} style={{ color: styles.iconColor }} />
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {getTrendIcon()}
        </div>

        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>

        {subtitle && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}