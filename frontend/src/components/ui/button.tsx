import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const buttonVariants = {
  default:
    "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 active:scale-[0.98]",
  destructive:
    "bg-red-700 text-white hover:bg-red-600 active:bg-red-800 active:scale-[0.98]",
  outline:
    "border border-zinc-600 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white active:bg-zinc-700 active:scale-[0.98]",
  secondary:
    "bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600 active:scale-[0.98]",
  ghost:
    "text-zinc-300 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.08]",
  link: "text-orange-500 underline-offset-4 hover:text-orange-400 hover:underline active:text-orange-500",
}

const focusVariants = {
  default:
    "focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  destructive:
    "focus-visible:ring-red-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  outline:
    "focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  secondary:
    "focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  ghost:
    "focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  link: "focus-visible:ring-white/20",
}

const sizeVariants = {
  default: "h-11 px-5 text-sm",
  sm: "h-10 px-4 text-sm",
  lg: "h-12 px-8 text-base",
  icon: "h-11 w-11 p-2",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg font-medium",
          "transition-[color,background-color,border-color,transform,opacity] duration-150 ease-out active:duration-75",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
          "focus:outline-none focus-visible:ring-2",
          buttonVariants[variant],
          focusVariants[variant],
          sizeVariants[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
