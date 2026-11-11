import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

// Ink primary + bordered white secondary (Stripe/Linear light). Orange stays a brand mark,
// not a button fill, so white-on-orange never has to carry 14px text.
const buttonVariants = {
  default:
    "bg-ink text-ink-foreground shadow-raised hover:bg-ink-hover active:bg-ink-active",
  destructive:
    "bg-danger-solid text-white shadow-raised hover:bg-danger-solid-hover active:bg-danger-solid-active",
  outline:
    "border border-border-strong bg-surface-card text-foreground shadow-raised hover:bg-surface-hover active:bg-surface-pressed",
  secondary:
    "bg-surface-hover text-foreground hover:bg-surface-pressed active:bg-border-subtle",
  ghost:
    "text-text-secondary hover:bg-surface-hover hover:text-foreground active:bg-surface-pressed",
  link: "h-auto px-0 text-brand-text underline-offset-4 hover:underline",
}

const sizeVariants = {
  default: "h-9 px-3.5 text-sm",
  sm: "h-8 px-3 text-[13px]",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-9 w-9 p-0",
}

/** Button look for elements that are not <button>, e.g. a Next <Link> that navigates. */
export function buttonStyles({
  variant = "default",
  size = "default",
  className,
}: Pick<ButtonProps, "variant" | "size" | "className"> = {}) {
  return cn(
    "inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium",
    "transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-out",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    sizeVariants[size],
    buttonVariants[variant],
    className
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={buttonStyles({ variant, size, className })}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
