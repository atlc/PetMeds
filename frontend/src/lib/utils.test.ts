import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    
    expect(cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    )).toBe('base-class active-class')
  })

  it('handles undefined and null values', () => {
    expect(cn('base-class', undefined, null, 'valid-class')).toBe('base-class valid-class')
  })

  it('handles empty strings', () => {
    expect(cn('base-class', '', 'valid-class')).toBe('base-class valid-class')
  })

  it('handles arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
  })

  it('handles objects with boolean values', () => {
    expect(cn({
      'class1': true,
      'class2': false,
      'class3': true
    })).toBe('class1 class3')
  })
})
