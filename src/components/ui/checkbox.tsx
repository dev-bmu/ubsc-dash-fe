'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface CustomCheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CustomCheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    return (
      <CheckboxPrimitive.Root
        data-indeterminate={indeterminate ? '' : undefined}
        className={cn(
          'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
          indeterminate && 'bg-muted text-muted-foreground', // misal ada style khusus
          className
        )}
        ref={ref}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current transition-none">
          {indeterminate ? (
            <div className="h-0.5 w-2 rounded-sm bg-current" /> // garis horizontal
          ) : (
            <CheckIcon className="size-3.5" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
