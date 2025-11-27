// src/ui/IconButton.tsx
import React from "react";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton: React.FC<IconButtonProps> = ({
  className,
  type,
  children,
  ...rest
}) => {
  const classes = ["na-icon-button", className].filter(Boolean).join(" ");

  return (
    <button className={classes} type={type || "button"} {...rest}>
      {children}
    </button>
  );
};
