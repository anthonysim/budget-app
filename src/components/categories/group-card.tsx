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
import {
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { CategoryItem } from '#/components/categories/category-row'
import { ConfirmDialog } from '#/components/categories/confirm-dialog'
import { NameDialog } from '#/components/categories/name-dialog'
import { DragHandle, SortableItem } from '#/components/categories/sortable'
import { useRunner } from '#/components/categories/use-runner'
import { cn } from '#/lib/utils'
import {
  createCategory,
  deleteCategoryGroup,
  reorderCategories,
  updateCategoryGroup,
} from '#/server/categories'
import type { CategoryGroupRow } from '#/server/categories-query'

export function GroupCard({
  budgetId,
  group,
  groups,
  canEdit,
}: {
  budgetId: string
  group: CategoryGroupRow
  groups: Array<CategoryGroupRow>
  canEdit: boolean
}) {
  const { run, refresh } = useRunner()
  const [renameOpen, setRenameOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [cats, setOptimisticCats] = useOptimistic(group.categories)
  const [, startReorder] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = cats.findIndex((c) => c.id === active.id)
    const to = cats.findIndex((c) => c.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(cats, from, to)
    startReorder(async () => {
      setOptimisticCats(next)
      try {
        await reorderCategories({
          data: {
            budgetId,
            groupId: group.id,
            categoryIds: next.map((c) => c.id),
          },
        })
      } catch {
        toast.error('Could not reorder categories')
      }
      await refresh()
    })
  }

  return (
    <SortableItem id={group.id} className="bg-card rounded-lg border">
      <div className="flex items-center gap-1 px-2 py-2">
        {canEdit ? <DragHandle label={`Reorder group ${group.name}`} /> : null}
        <h2
          className={cn(
            'flex-1 truncate font-medium',
            group.hidden && 'text-muted-foreground italic',
          )}
        >
          {group.name}
          {group.hidden ? ' (hidden)' : ''}
        </h2>
        {canEdit ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Category
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for group ${group.name}`}
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                  <PencilIcon /> Rename group
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    run(
                      () =>
                        updateCategoryGroup({
                          data: {
                            budgetId,
                            groupId: group.id,
                            hidden: !group.hidden,
                          },
                        }),
                      group.hidden ? 'Group shown' : 'Group hidden',
                    )
                  }
                >
                  {group.hidden ? <EyeIcon /> : <EyeOffIcon />}
                  {group.hidden ? 'Unhide group' : 'Hide group'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2Icon /> Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      {cats.length === 0 ? (
        <p className="text-muted-foreground border-t px-4 py-3 text-sm">
          No categories in this group.
        </p>
      ) : (
        <DndContext
          id={`categories-${group.id}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={cats.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cats.map((c) => (
              <CategoryItem
                key={c.id}
                budgetId={budgetId}
                category={c}
                groups={groups}
                currentGroupId={group.id}
                canEdit={canEdit}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {canEdit ? (
        <>
          <NameDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            title={`Add category to ${group.name}`}
            label="Category name"
            submitLabel="Add category"
            onSubmit={async (name) => {
              await createCategory({
                data: { budgetId, groupId: group.id, name },
              })
              await refresh('Category added')
            }}
          />
          <NameDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            title="Rename group"
            label="Group name"
            initialValue={group.name}
            submitLabel="Save"
            onSubmit={async (name) => {
              await updateCategoryGroup({
                data: { budgetId, groupId: group.id, name },
              })
              await refresh('Group renamed')
            }}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete “${group.name}”?`}
            description={
              group.categories.length > 0
                ? `This permanently deletes the group and its ${group.categories.length} categor${group.categories.length === 1 ? 'y' : 'ies'}.`
                : 'This permanently deletes the group.'
            }
            confirmLabel="Delete group"
            onConfirm={() =>
              run(
                () =>
                  deleteCategoryGroup({
                    data: { budgetId, groupId: group.id },
                  }),
                'Group deleted',
              )
            }
          />
        </>
      ) : null}
    </SortableItem>
  )
}
