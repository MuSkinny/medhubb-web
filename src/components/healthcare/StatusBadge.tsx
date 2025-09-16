"use client";

interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info";
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function StatusBadge({
  status,
  text,
  size = "md",
  className = ""
}: StatusBadgeProps) {

  const getStatusStyles = () => {
    switch (status) {
      case "success":
        return {
          badgeClass: "healthcare-status-badge success",
          defaultText: "Completato"
        };
      case "warning":
        return {
          badgeClass: "healthcare-status-badge warning",
          defaultText: "In Attesa"
        };
      case "error":
        return {
          badgeClass: "healthcare-status-badge error",
          defaultText: "Errore"
        };
      case "info":
        return {
          badgeClass: "healthcare-status-badge info",
          defaultText: "Info"
        };
      default:
        return {
          badgeClass: "healthcare-status-badge info",
          defaultText: "Sconosciuto"
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { fontSize: '10px', padding: '2px 8px' };
      case "lg":
        return { fontSize: '14px', padding: '6px 16px' };
      default:
        return { fontSize: '12px', padding: '4px 12px' };
    }
  };

  const styles = getStatusStyles();
  const sizeStyles = getSizeStyles();
  const displayText = text || styles.defaultText;

  return (
    <span
      className={`${styles.badgeClass} ${className}`}
      style={sizeStyles}
    >
      {displayText}
    </span>
  );
}