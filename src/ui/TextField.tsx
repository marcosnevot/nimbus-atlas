// src/ui/TextField.tsx
import React from "react";

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextField: React.FC<TextFieldProps> = ({
  className,
  ...rest
}) => {
  const classes = ["na-text-field__input", className]
    .filter(Boolean)
    .join(" ");

  return <input className={classes} {...rest} />;
};
