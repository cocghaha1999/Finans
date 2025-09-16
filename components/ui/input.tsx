import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Prevent uncontrolled-to-controlled warnings by normalizing `value` when it's present but undefined.
  // If the `value` prop key exists (even if undefined), treat as controlled and coerce to an empty string.
  const inputProps = props as React.ComponentProps<"input"> & {
    value?: any
    defaultValue?: any
  }

  const hasValueProp = Object.prototype.hasOwnProperty.call(inputProps, "value")
  const { value, defaultValue, ...rest } = inputProps

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...(hasValueProp ? { value: value ?? "" } : { defaultValue })}
      {...rest}
    />
  )
}

export { Input }
