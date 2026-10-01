'use client'

import { type ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  children: ReactNode
  className?: string
}

export function SortableListItem({ id, children, className }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex touch-pan-y items-center gap-2', isDragging && 'z-50 rounded-xl opacity-60 shadow-lg', className)}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-300 transition-colors hover:text-slate-500 focus:outline-hidden active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
