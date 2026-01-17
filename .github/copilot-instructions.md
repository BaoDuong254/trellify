# Copilot Instructions - Trellify

You are GitHub Copilot Chat. These instructions override default behavior. Apply them to ALL code generation, refactors, and explanations.

## Project Structure

```
└── 📁trellify                    # Root directory (monorepo)
    └── 📁apps                    # Application folders
        └── 📁client              # Frontend app (React + Vite)
            └── 📁public          # Public assets (favicon, images)
            └── 📁src             # Source code
                └── 📁apis        # API clients & mock data
                └── 📁assets      # Static assets (SVG, images)
                └── 📁components  # React components
                └── 📁config      # Configuration files
                └── 📁hooks       # Custom React hooks
                └── 📁pages       # Page components
                └── 📁redux       # Redux store & slices
                └── 📁types       # TypeScript type definitions
                └── 📁utils       # Utility functions
        └── 📁server              # Backend app (Express.js)
            └── 📁src             # Source code
                └── 📁config      # Configuration files
                └── 📁controllers # Request handlers (thin layer)
                └── 📁middlewares # Express middlewares
                └── 📁models      # Database models (MongoDB)
                └── 📁providers   # External service providers
                └── 📁routes      # Express routes
                    └── 📁v1      # API v1 routes
                └── 📁services    # Business logic layer
                └── 📁sockets     # Socket.io handlers
                └── 📁utils       # Utility functions
                └── 📁validations # Request validation schemas
    └── 📁packages                # Shared packages
        └── 📁eslint              # ESLint config (base, react, node)
        └── 📁typescript          # TypeScript config presets
        └── 📁ui                  # Shared UI components library
            └── 📁src             # Source code
                └── 📁components  # Reusable components
                    └── 📁ui      # UI primitives (shadcn/ui style)
                └── 📁hooks       # Shared React hooks
                └── 📁lib         # Utility functions (cn, etc.)
                └── 📁styles      # Global styles
        └── 📁shared              # Common shared code
            └── 📁src             # Source code
                └── 📁schemas     # Zod schemas
                └── 📁utils       # Shared utilities
```

## Architecture & Design Patterns

### Backend Architecture (Layered Architecture)

```
Request → Controller → Service → Model → Database
         (thin)      (business)  (data)
```

1. **Controller Layer** (`controllers/`)
   - Handle HTTP requests/responses
   - Call service methods
   - Return standardized responses
   - MUST NOT contain business logic
   - MUST pass errors to `next()`

2. **Service Layer** (`services/`)
   - Contain ALL business logic
   - Validate business rules
   - Orchestrate multiple model calls
   - Transform data
   - Throw specific ApiError instances

3. **Model Layer** (`models/`)
   - Direct database access ONLY
   - CRUD operations
   - Query building
   - MUST validate with Zod before insert/update
   - MUST check `_destroy: false` in queries

4. **Validation Layer** (`validations/`)
   - Express route-level validation
   - Use Zod schemas from `@workspace/shared`
   - Validate request body, params, query

### Frontend Architecture (Component-Based)

```
Page → Container Components → Presentational Components → UI Primitives
                            ↓
                         Redux Store
```

1. **Pages** (`pages/`)
   - Top-level route components
   - Connect to Redux store
   - Orchestrate data fetching
   - Handle page-level state

2. **Components** (`components/`)
   - Reusable UI components
   - Accept props, avoid internal state
   - Use MUI components
   - Style with `sx` prop (CSS-in-JS)

3. **Redux Store** (`redux/`)
   - Global state management
   - Slices for features
   - Async thunks for API calls
   - Use Redux Toolkit

4. **API Layer** (`apis/`)
   - Axios instances with interceptors
   - Centralized API calls
   - Error handling
   - Mock data for development

## CRITICAL RULES (Always Follow)

### Type Safety

- ✅ NEVER use `any` type (use `unknown` if needed)
- ✅ ALWAYS use strict TypeScript
- ✅ ALWAYS define explicit return types
- ✅ ALWAYS validate input with Zod schemas
- ✅ Use type guards for narrowing
- ❌ NEVER use type assertions (`as`) unless absolutely necessary

### Validation

- ✅ ALWAYS validate with Zod schemas from `@workspace/shared`
- ✅ Validate at route level (middleware)
- ✅ Validate at model level (before DB operations)
- ✅ Return typed validation errors
- ❌ NEVER trust user input

### Database Operations

- ✅ ALWAYS check `_destroy: false` in queries
- ✅ NEVER hard delete (use soft delete: `_destroy: true`)
- ✅ Select only required fields (`project` in MongoDB)
- ✅ Use indexes for frequently queried fields
- ✅ Avoid N+1 queries (use aggregation pipelines)
- ❌ NEVER expose `_destroy` to frontend

### Error Handling

- ✅ ALWAYS use `try-catch` in controllers
- ✅ ALWAYS pass errors to `next(error)`
- ✅ Use `ApiError` class with proper status codes
- ✅ Use error messages as i18n keys (e.g., "Error.BoardNotFound")
- ❌ NEVER expose stack traces in production
- ❌ NEVER expose sensitive information in errors

### Import Rules

- ✅ ALWAYS use absolute imports with `src/*` alias
- ✅ Use workspace protocol for packages: `@workspace/*`
- ✅ Import shared schemas from `@workspace/shared/schemas`
- ❌ NEVER use relative imports across modules (../../../)

### Security

- ❌ NEVER expose sensitive fields (password, tokens, secrets)
- ❌ NEVER bypass permission checks
- ❌ NEVER log sensitive data
- ✅ ALWAYS sanitize user input
- ✅ ALWAYS use environment variables for secrets

## Related Instructions

- See [./instructions/nodejs-javascript-vitest.instructions.md](./instructions/nodejs-javascript-vitest.instructions.md) for Node.js and JavaScript guidelines
- See [./instructions/reactjs.instructions.md](./instructions/reactjs.instructions.md) for React patterns
- See [./instructions/typescript-5-es2022.instructions.md](./instructions/typescript-5-es2022.instructions.md) for TypeScript rules
