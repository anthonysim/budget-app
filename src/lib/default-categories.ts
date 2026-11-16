/** Default category groups created for every new budget. */
export const DEFAULT_CATEGORY_GROUPS: ReadonlyArray<{
  name: string
  categories: ReadonlyArray<string>
}> = [
  {
    name: 'Bills',
    categories: ['Rent / Mortgage', 'Electric', 'Water', 'Internet', 'Phone'],
  },
  {
    name: 'Needs',
    categories: ['Groceries', 'Transportation', 'Medical', 'Household'],
  },
  {
    name: 'Wants',
    categories: ['Dining Out', 'Entertainment', 'Shopping', 'Hobbies'],
  },
  { name: 'Savings', categories: ['Emergency Fund', 'Vacation'] },
]

/** Hidden system group holding the income category (feeds Ready to Assign in PR 9). */
export const INFLOW_GROUP_NAME = 'Inflow'
export const INFLOW_CATEGORY_NAME = 'Ready to Assign'
