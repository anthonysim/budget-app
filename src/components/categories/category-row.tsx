import { useState } from 'react'
import {
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  StickyNoteIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { NoteDialog } from '#/components/categories/note-dialog'
import { DeleteCategoryDialog } from '#/components/categories/delete-category-dialog'
import { NameDialog } from '#/components/categories/name-dialog'
import { DragHandle, SortableItem } from '#/components/categories/sortable'
import { useRunner } from '#/components/categories/use-runner'
import { cn } from '#/lib/utils'
import { deleteCategory, updateCategory } from '#/server/categories'
import type { CategoryGroupRow, CategoryRow } from '#/server/categories-query'

export function CategoryItem({
  budgetId,
  category,
  groups,
  currentGroupId,
  canEdit,
}: {
  budgetId: string
  category: CategoryRow
  groups: Array<CategoryGroupRow>
  currentGroupId: string
  canEdit: boolean
}) {
  const { run, refresh } = useRunner()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const otherGroups = groups.filter((g) => g.id !== currentGroupId)

  return (
    <SortableItem
      id={category.id}
      className="bg-background flex items-center gap-1 border-t px-2 py-1.5"
    >
      {canEdit ? <DragHandle label={`Reorder ${category.name}`} /> : null}
      <span
        className={cn(
          'flex-1 truncate text-sm',
          category.hidden && 'text-muted-foreground italic',
        )}
      >
        {category.name}
        {category.hidden ? ' (hidden)' : ''}
        {category.note ? (
          <span
            className="text-muted-foreground ml-2 text-xs font-normal not-italic"
            title={category.note}
          >
            <StickyNoteIcon className="mr-1 inline size-3" aria-hidden />
            <span className="sr-only">Note: </span>
            {category.note.length > 48
              ? `${category.note.slice(0, 48)}…`
              : category.note}
          </span>
        ) : null}
      </span>

      {canEdit ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${category.name}`}
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <PencilIcon /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
                <StickyNoteIcon /> {category.note ? 'Edit note' : 'Add note'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () =>
                      updateCategory({
                        data: {
                          budgetId,
                          categoryId: category.id,
                          hidden: !category.hidden,
                        },
                      }),
                    category.hidden ? 'Category shown' : 'Category hidden',
                  )
                }
              >
                {category.hidden ? <EyeIcon /> : <EyeOffIcon />}
                {category.hidden ? 'Unhide' : 'Hide'}
              </DropdownMenuItem>
              {otherGroups.length > 0 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move to group</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {otherGroups.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onSelect={() =>
                          run(
                            () =>
                              updateCategory({
                                data: {
                                  budgetId,
                                  categoryId: category.id,
                                  groupId: g.id,
                                },
                              }),
                            `Moved to ${g.name}`,
                          )
                        }
                      >
                        {g.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NameDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            title="Rename category"
            label="Category name"
            initialValue={category.name}
            submitLabel="Save"
            onSubmit={async (name) => {
              await updateCategory({
                data: { budgetId, categoryId: category.id, name },
              })
              await refresh('Category renamed')
            }}
          />
          {noteOpen ? (
            <NoteDialog
              open
              onOpenChange={setNoteOpen}
              title={`Note for ${category.name}`}
              initialValue={category.note ?? ''}
              onSave={async (note) => {
                await updateCategory({
                  data: { budgetId, categoryId: category.id, note },
                })
                await refresh('Note saved')
              }}
            />
          ) : null}
          <DeleteCategoryDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            category={category}
            groups={groups}
            onConfirm={(reassignToCategoryId) =>
              run(
                () =>
                  deleteCategory({
                    data: {
                      budgetId,
                      categoryId: category.id,
                      reassignToCategoryId,
                    },
                  }),
                'Category deleted',
              )
            }
          />
        </>
      ) : null}
    </SortableItem>
  )
}
