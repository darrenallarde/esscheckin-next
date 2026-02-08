"use client";

import { forwardRef } from "react";
import { DynamicIcon as LucideDynamicIcon } from "lucide-react/dynamic";
import { Dog, type LucideProps } from "lucide-react";

interface DynamicIconProps extends Omit<LucideProps, "name"> {
  name?: string | null;
}

export const DynamicIcon = forwardRef<SVGSVGElement, DynamicIconProps>(
  ({ name, ...props }, ref) => {
    if (!name) return <Dog ref={ref} {...props} />;
    return (
      <LucideDynamicIcon
        ref={ref}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name={name as any}
        fallback={() => <Dog {...props} />}
        {...props}
      />
    );
  },
);

DynamicIcon.displayName = "DynamicIcon";
