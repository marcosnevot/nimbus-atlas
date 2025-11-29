// src/ui/Skeleton.tsx
import React from "react";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className, style, ...rest }) => {
  const classes = ["na-skeleton", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      aria-hidden="true"
      style={style}
      {...rest}
    />
  );
};
