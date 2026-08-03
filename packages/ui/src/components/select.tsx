import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "../lib/cn";

/** Bewust een gestylede native <select> i.p.v. het volledige base-ui Select-component —
 * bestaande formulieren geven gewoon <option>-children door, dat hoeft niet te
 * veranderen. Visueel gelijk aan de HR-portal SelectTrigger. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative inline-block">
      <select
        data-slot="select"
        className={cn(
          "h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-7 pl-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { Select };
