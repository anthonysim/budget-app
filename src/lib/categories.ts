import { z } from 'zod'

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(60, 'Name must be 60 characters or fewer')

const budgetId = z.uuid()

export const createGroupSchema = z.object({
  budgetId,
  name: categoryNameSchema,
})

export const updateGroupSchema = z.object({
  budgetId,
  groupId: z.uuid(),
  name: categoryNameSchema.optional(),
  hidden: z.boolean().optional(),
})

export const groupRefSchema = z.object({ budgetId, groupId: z.uuid() })

export const reorderGroupsSchema = z.object({
  budgetId,
  groupIds: z.array(z.uuid()).min(1).max(200),
})

export const createCategorySchema = z.object({
  budgetId,
  groupId: z.uuid(),
  name: categoryNameSchema,
})

export const updateCategorySchema = z.object({
  budgetId,
  categoryId: z.uuid(),
  name: categoryNameSchema.optional(),
  hidden: z.boolean().optional(),
  /** Move to another group (appended at the end). */
  groupId: z.uuid().optional(),
})

export const categoryRefSchema = z.object({ budgetId, categoryId: z.uuid() })

export const deleteCategorySchema = z.object({
  budgetId,
  categoryId: z.uuid(),
  /** Move this category's transactions here first. Omit to leave them uncategorized. */
  reassignToCategoryId: z.uuid().optional(),
})

export const reorderCategoriesSchema = z.object({
  budgetId,
  groupId: z.uuid(),
  categoryIds: z.array(z.uuid()).min(1).max(500),
})
