import { describe, expect, it } from 'vitest'
import { evalAssignedInput } from './assign-expression'

describe('evalAssignedInput', () => {
  const cur = 100_000 // $100.00

  it('plain numbers set the value', () => {
    expect(evalAssignedInput('150', cur)).toBe(150_000)
    expect(evalAssignedInput('$1,200.50', cur)).toBe(1_200_500)
    expect(evalAssignedInput('0', cur)).toBe(0)
    expect(evalAssignedInput('.5', cur)).toBe(500)
  })

  it('leading operators apply to the current value', () => {
    expect(evalAssignedInput('+50', cur)).toBe(150_000)
    expect(evalAssignedInput('-20', cur)).toBe(80_000)
    expect(evalAssignedInput('*2', cur)).toBe(200_000)
    expect(evalAssignedInput('/4', cur)).toBe(25_000)
    expect(evalAssignedInput('-150', cur)).toBe(-50_000)
  })

  it('evaluates expressions with precedence and parentheses', () => {
    expect(evalAssignedInput('100+25.5', cur)).toBe(125_500)
    expect(evalAssignedInput('10+2*3', cur)).toBe(16_000)
    expect(evalAssignedInput('(10+2)*3', cur)).toBe(36_000)
    expect(evalAssignedInput('100/3', cur)).toBe(33_333)
  })

  it('treats cleared input as zero', () => {
    expect(evalAssignedInput('', cur)).toBe(0)
    expect(evalAssignedInput('  ', cur)).toBe(0)
  })

  it('rejects invalid input', () => {
    expect(evalAssignedInput('abc', cur)).toBeNull()
    expect(evalAssignedInput('1+', cur)).toBeNull()
    expect(evalAssignedInput('1/0', cur)).toBeNull()
    expect(evalAssignedInput('(1+2', cur)).toBeNull()
    expect(evalAssignedInput('1 2 x', cur)).toBeNull()
    expect(evalAssignedInput('alert(1)', cur)).toBeNull()
  })
})
