import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

type SortableApi = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'setActivatorNodeRef'
>

const SortableContext = createContext<SortableApi | null>(null)

/** Makes its children sortable; render <DragHandle /> inside to show the grip. */
export function SortableItem({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <SortableContext value={{ attributes, listeners, setActivatorNodeRef }}>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(isDragging && 'relative z-10 opacity-80', className)}
      >
        {children}
      </div>
    </SortableContext>
  )
}

/** Table-row variant of SortableItem, for use inside a <tbody>. */
export function SortableRow({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <SortableContext value={{ attributes, listeners, setActivatorNodeRef }}>
      <tr
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          isDragging && 'bg-background relative z-10 opacity-80 shadow-md',
          className,
        )}
      >
        {children}
      </tr>
    </SortableContext>
  )
}

export function DragHandle({ label }: { label: string }) {
  const api = use(SortableContext)
  if (!api) throw new Error('DragHandle must be inside SortableItem')
  return (
    <button
      type="button"
      ref={api.setActivatorNodeRef}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded p-1 active:cursor-grabbing"
      {...api.attributes}
      {...api.listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )
}
