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
          iconBg: "hsl(var(--secondary-light))",
          iconColor: "hsl(var(--secondary-dark))",
          gradient: "var(--gradient-secondary)"
        };
      case "orange":
        return {
          iconBg: "hsl(var(--warning))",
          iconColor: "hsl(var(--warning-foreground))",
          gradient: "linear-gradient(135deg, hsl(var(--warning)) 0%, hsl(var(--warning-dark)) 100%)"
        };
      default:
        return {
          iconBg: "hsl(var(--primary-light))",
          iconColor: "hsl(var(--primary-dark))",
          gradient: "var(--gradient-primary)"
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
    <div className={`healthcare-stat-card group cursor-pointer ${className}`}>
      <div className="flex items-center justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
          style={{ background: styles.gradient }}
        >
          <Icon size={32} style={{ color: 'white' }} />
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-4xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
            {value}
          </span>
          {getTrendIcon()}
        </div>

        <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-slate-900 transition-colors">
          {title}
        </h3>

        {subtitle && (
          <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}