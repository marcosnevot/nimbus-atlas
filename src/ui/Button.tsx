// src/ui/Button.tsx
import React from "react";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  type,
  ...rest
}) => {
  const classes = [
    "na-button",
    `na-button--${variant}`,
    `na-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} type={type || "button"} {...rest} />;
};
