import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORY_GROUPS } from './default-categories'
import { createCategorySchema, updateGroupSchema } from './categories'

const id = '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b'

describe('categories', () => {
  it('default groups are non-empty and unique', () => {
    const names = DEFAULT_CATEGORY_GROUPS.map((g) => g.name)
    expect(new Set(names).size).toBe(names.length)
    for (const g of DEFAULT_CATEGORY_GROUPS) {
      expect(g.categories.length).toBeGreaterThan(0)
      expect(new Set(g.categories).size).toBe(g.categories.length)
    }
  })

  it('validates create category input', () => {
    expect(
      createCategorySchema.parse({ budgetId: id, groupId: id, name: ' Gas ' })
        .name,
    ).toBe('Gas')
    expect(
      createCategorySchema.safeParse({ budgetId: id, groupId: id, name: '' })
        .success,
    ).toBe(false)
  })

  it('update group allows partial changes', () => {
    expect(
      updateGroupSchema.safeParse({ budgetId: id, groupId: id, hidden: true })
        .success,
    ).toBe(true)
  })
})
