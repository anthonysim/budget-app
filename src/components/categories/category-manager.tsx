import { useOptimistic, useState, useTransition } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { GroupCard } from '#/components/categories/group-card'
import { NameDialog } from '#/components/categories/name-dialog'
import { useRunner } from '#/components/categories/use-runner'
import { createCategoryGroup, reorderCategoryGroups } from '#/server/categories'
import type { CategoryGroupRow } from '#/server/categories-query'

export function CategoryManager({
  budgetId,
  groups: serverGroups,
  canEdit,
}: {
  budgetId: string
  groups: Array<CategoryGroupRow>
  canEdit: boolean
}) {
  const { refresh } = useRunner()
  const [addOpen, setAddOpen] = useState(false)
  const [groups, setOptimisticGroups] = useOptimistic(serverGroups)
  const [, startReorder] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = groups.findIndex((g) => g.id === active.id)
    const to = groups.findIndex((g) => g.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(groups, from, to)
    startReorder(async () => {
      setOptimisticGroups(next)
      try {
        await reorderCategoryGroups({
          data: { budgetId, groupIds: next.map((g) => g.id) },
        })
      } catch {
        toast.error('Could not reorder groups')
      }
      await refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon /> Add group
          </Button>
          <NameDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            title="Add category group"
            label="Group name"
            submitLabel="Add group"
            onSubmit={async (name) => {
              await createCategoryGroup({ data: { budgetId, name } })
              await refresh('Group added')
            }}
          />
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">No category groups yet.</p>
      ) : (
        <DndContext
          id="category-groups"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={groups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <GroupCard
                  key={g.id}
                  budgetId={budgetId}
                  group={g}
                  groups={groups}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
