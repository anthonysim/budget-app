import { describe, expect, it } from 'vitest'
import {
  parseTransferPayee,
  resolveTransferCategories,
  transferLabel,
} from './transfers'
import type { TransferSide } from './transfers'

const accounts = [
  { id: 'a1', name: 'Savings' },
  { id: 'a2', name: 'Visa' },
]

const checking = (amount: number): TransferSide => ({
  onBudget: true,
  type: 'checking',
  amount,
  paymentCategoryId: null,
})
const visa = (amount: number): TransferSide => ({
  onBudget: true,
  type: 'credit_card',
  amount,
  paymentCategoryId: 'pay-visa',
})
const house = (amount: number): TransferSide => ({
  onBudget: false,
  type: 'asset',
  amount,
  paymentCategoryId: null,
})

describe('transfer payees', () => {
  it('round-trips labels case-insensitively', () => {
    expect(transferLabel('Savings')).toBe('Transfer: Savings')
    expect(parseTransferPayee('transfer: savings', accounts)).toBe('a1')
    expect(parseTransferPayee('Transfer: Visa', accounts)).toBe('a2')
    expect(parseTransferPayee('Transfer: Nope', accounts)).toBeNull()
    expect(parseTransferPayee('Savings', accounts)).toBeNull()
  })
})

describe('resolveTransferCategories', () => {
  it('on-budget to on-budget is neutral', () => {
    expect(
      resolveTransferCategories(checking(-5000), checking(5000), 'x'),
    ).toEqual({ a: null, b: null })
  })
  it('paying a credit card categorizes the paying side as the payment category', () => {
    expect(
      resolveTransferCategories(checking(-5000), visa(5000), null),
    ).toEqual({
      a: 'pay-visa',
      b: null,
    })
    // same pair seen from the card side
    expect(
      resolveTransferCategories(visa(5000), checking(-5000), null),
    ).toEqual({
      a: null,
      b: 'pay-visa',
    })
  })
  it('cash advance from a card has no payment category', () => {
    expect(
      resolveTransferCategories(checking(5000), visa(-5000), null),
    ).toEqual({ a: null, b: null })
  })
  it('on-budget to tracking uses the user category on the on-budget side', () => {
    expect(
      resolveTransferCategories(checking(-5000), house(5000), 'cat'),
    ).toEqual({ a: 'cat', b: null })
    expect(
      resolveTransferCategories(house(5000), checking(-5000), 'cat'),
    ).toEqual({ a: null, b: 'cat' })
  })
  it('tracking to tracking has no categories', () => {
    expect(resolveTransferCategories(house(-1), house(1), 'cat')).toEqual({
      a: null,
      b: null,
    })
  })
})
