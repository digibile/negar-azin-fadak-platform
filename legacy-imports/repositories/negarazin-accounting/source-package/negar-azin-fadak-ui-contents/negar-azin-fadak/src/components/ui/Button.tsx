import React from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 shadow-sm",
  secondary: "bg-secondary-500 text-white hover:bg-secondary-600",
  outline: "border border-border bg-surface hover:bg-primary-50 text-text",
  ghost: "bg-transparent hover:bg-primary-50 text-text",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
  success: "bg-success-500 text-white hover:bg-success-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary", size = "md", icon, loading, fullWidth, className = "", children, disabled, ...rest
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-[0.97] focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : icon}
      {children}
    </button>
  );
};
