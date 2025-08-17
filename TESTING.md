# Testing Guide for PetMeds Application

This document provides comprehensive information about the testing setup for both the frontend and backend of the PetMeds application.

## Overview

The PetMeds application has a comprehensive testing setup that covers:

- **Frontend (React + TypeScript)**: Unit tests for components, hooks, and utilities using Vitest and React Testing Library
- **Backend (Express + TypeScript)**: Unit tests for routes, middleware, and services using Jest and Supertest
- **Test Coverage**: Coverage reports for both frontend and backend
- **Mocking**: Comprehensive mocking of external dependencies

## Frontend Testing

### Testing Framework
- **Vitest**: Fast unit test runner that works seamlessly with Vite
- **React Testing Library**: Testing utilities for React components
- **jsdom**: DOM environment for testing React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM elements

### Test Structure
```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts          # Test environment setup
│   │   └── utils.tsx         # Test utilities and custom render
│   ├── components/
│   │   ├── LoadingSpinner.test.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.test.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── utils.test.ts
│   │   └── ...
│   └── App.test.tsx
├── vitest.config.ts          # Vitest configuration
└── package.json              # Testing scripts and dependencies
```

### Running Frontend Tests

```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests once
npm run test:run
```

### Test Scripts
- `test`: Run tests in watch mode
- `test:ui`: Run tests with Vitest UI
- `test:coverage`: Generate coverage report
- `test:run`: Run tests once and exit

### Frontend Test Examples

#### Component Testing
```tsx
import { render, screen } from '../test/utils'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders loading text', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading PetMeds...')).toBeInTheDocument()
  })
})
```

#### Hook Testing
```tsx
import { renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'

describe('useAuth Hook', () => {
  it('should return auth context when used within AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders })
    expect(result.current.user).toBeDefined()
  })
})
```

#### Utility Testing
```tsx
import { cn } from './utils'

describe('cn utility function', () => {
  it('combines class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500')
  })
})
```

## Backend Testing

### Testing Framework
- **Jest**: JavaScript testing framework
- **ts-jest**: TypeScript support for Jest
- **Supertest**: HTTP assertion library for testing Express apps
- **@types/jest**: TypeScript definitions for Jest

### Test Structure
```
backend/
├── src/
│   ├── test/
│   │   ├── setup.ts          # Test environment setup
│   │   └── utils.ts          # Test utilities and mocks
│   ├── routes/
│   │   ├── auth.test.ts
│   │   ├── pets.test.ts
│   │   ├── medications.test.ts
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.test.ts
│   │   ├── errorHandler.test.ts
│   │   └── ...
│   └── index.test.ts         # Main app tests
├── jest.config.js            # Jest configuration
└── package.json              # Testing scripts and dependencies
```

### Running Backend Tests

```bash
# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Scripts
- `test`: Run tests in watch mode
- `test:watch`: Run tests in watch mode (alias)
- `test:coverage`: Generate coverage report
- `test:ci`: Run tests once with coverage for CI

### Backend Test Examples

#### Route Testing
```tsx
import request from 'supertest'
import { petRoutes } from './pets'

describe('Pet Routes', () => {
  it('should return pets for authenticated user', async () => {
    const response = await request(app)
      .get('/api/pets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body).toHaveProperty('pets')
  })
})
```

#### Middleware Testing
```tsx
import { authMiddleware } from './auth'

describe('Auth Middleware', () => {
  it('should return 401 when no authorization header is provided', async () => {
    await authMiddleware(mockReq as Request, mockRes as Response, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
  })
})
```

#### App Testing
```tsx
describe('Express App', () => {
  it('should return health status and timestamp', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toHaveProperty('status', 'OK')
  })
})
```

## Test Configuration

### Frontend (Vitest)
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'dist/']
    }
  }
})
```

### Backend (Jest)
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/scripts/**/*.ts'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts']
}
```

## Mocking Strategy

### Frontend Mocks
- **Browser APIs**: IntersectionObserver, ResizeObserver, matchMedia
- **PWA Features**: Service Worker, Push Notifications, Install Prompt
- **Storage**: localStorage, sessionStorage
- **External Services**: API calls, authentication

### Backend Mocks
- **Database**: PostgreSQL connection pool
- **External Services**: Google OAuth, Push Notifications
- **Authentication**: JWT verification
- **File System**: File uploads, static file serving

## Test Utilities

### Frontend Test Utils
```tsx
// Custom render with providers
export const render = (ui: ReactElement, options?: RenderOptions) => {
  return customRender(ui, { wrapper: AllTheProviders, ...options })
}

// Mock data
export const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' }
```

### Backend Test Utils
```tsx
// JWT token creation
export const createTestToken = (user: any = mockUser): string => {
  return jwt.sign({ userId: user.id, email: user.email }, 'test-secret', { expiresIn: '1h' })
}

// Authenticated requests
export const authenticatedRequest = (app: Express, token?: string) => {
  return request(app).set('Authorization', `Bearer ${token || createTestToken()}`)
}
```

## Coverage Reports

### Frontend Coverage
- **Provider**: V8 (built into Vitest)
- **Reporters**: Text, JSON, HTML
- **Output**: `coverage/` directory
- **Exclusions**: Test files, config files, build artifacts

### Backend Coverage
- **Provider**: Jest built-in coverage
- **Reporters**: Text, LCOV, HTML
- **Output**: `coverage/` directory
- **Exclusions**: Scripts, type definitions

## Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests focused** on a single piece of functionality

### Mocking Guidelines
1. **Mock external dependencies** to isolate the unit under test
2. **Use realistic mock data** that represents actual data structures
3. **Reset mocks** between tests to avoid test interference
4. **Verify mock calls** when testing interactions

### Assertion Patterns
1. **Test behavior, not implementation** details
2. **Use specific assertions** rather than generic ones
3. **Test error conditions** and edge cases
4. **Verify side effects** when testing functions with external impact

## Troubleshooting

### Common Issues

#### Frontend Tests
- **Module not found**: Ensure all dependencies are installed
- **TypeScript errors**: Check tsconfig.json and type definitions
- **Component rendering issues**: Verify test setup and provider wrapping

#### Backend Tests
- **Database connection errors**: Check mock setup and environment variables
- **JWT verification failures**: Ensure proper token mocking
- **Route not found**: Verify route registration and middleware setup

### Debugging Tests
1. **Use `console.log`** in tests for debugging (will show in test output)
2. **Run single test** by using `.only` on describe or it blocks
3. **Check coverage reports** to identify untested code
4. **Review test setup** files for configuration issues

## Continuous Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:coverage
```

### Coverage Thresholds
- **Frontend**: Minimum 80% coverage
- **Backend**: Minimum 85% coverage
- **Critical paths**: 100% coverage for authentication and data validation

## Performance Considerations

### Test Execution
- **Parallel execution** for independent tests
- **Mock heavy operations** like database queries and API calls
- **Use test databases** for integration tests when needed
- **Optimize test setup** to minimize overhead

### Coverage Analysis
- **Focus on critical paths** rather than achieving 100% coverage
- **Exclude utility functions** that are trivial to test
- **Prioritize business logic** over framework boilerplate

## Future Enhancements

### Planned Improvements
1. **Integration tests** for critical user workflows
2. **E2E tests** using Playwright or Cypress
3. **Performance testing** for API endpoints
4. **Visual regression testing** for UI components
5. **Accessibility testing** integration

### Testing Tools
1. **MSW (Mock Service Worker)** for API mocking
2. **Testing Library queries** for better component testing
3. **Jest snapshots** for regression testing
4. **Code coverage badges** for repository status

---

For more information about testing specific components or features, refer to the individual test files or contact the development team.
