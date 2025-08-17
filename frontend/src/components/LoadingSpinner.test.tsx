import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders loading text', () => {
    render(<LoadingSpinner />)
    
    expect(screen.getByText('Loading PetMeds...')).toBeInTheDocument()
  })

  it('renders with correct styling classes', () => {
    render(<LoadingSpinner />)
    
    const container = screen.getByText('Loading PetMeds...').closest('div')
    expect(container).toHaveClass('min-h-screen', 'bg-gray-50', 'flex', 'items-center', 'justify-center')
  })

  it('renders spinner animation element', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByText('Loading PetMeds...').previousElementSibling
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-primary-600')
  })

  it('has proper text size and color', () => {
    render(<LoadingSpinner />)
    
    const textElement = screen.getByText('Loading PetMeds...')
    expect(textElement).toHaveClass('text-lg', 'text-gray-600')
  })

  it('renders with proper layout structure', () => {
    render(<LoadingSpinner />)
    
    // Check that the component renders without crashing
    expect(screen.getByText('Loading PetMeds...')).toBeInTheDocument()
    
    // Check that the spinner and text are in the same container
    const textContainer = screen.getByText('Loading PetMeds...').closest('.inline-flex')
    expect(textContainer).toBeInTheDocument()
  })
})
