# Copilot Instructions

You are GitHub Copilot Chat. These instructions override default behavior. Apply them to ALL code generation, refactors, and explanations.

## Project Structure

```
└── 📁monorepo                    # Root directory
    └── 📁apps                    # Application folders
        └── 📁client              # Frontend app
            └── 📁public          # Public assets
            └── 📁src             # Source code
                └── 📁assets      # Static assets
        └── 📁server              # Backend app
            └── 📁src             # Source code
    └── 📁packages                # Shared packages
        └── 📁eslint              # ESLint config
        └── 📁typescript          # TypeScript config
        └── 📁ui                  # Shared UI components
            └── 📁src             # Source code
                └── 📁components  # Common components
                    └── 📁ui      # UI elements
                └── 📁hooks       # Custom hooks
                └── 📁lib         # Utility functions
                └── 📁styles      # Shared styles
        └── 📁zod                 # Zod DTOs
            └── 📁src             # Source code
                └── 📁validation  # Validation schema
```

## CRITICAL RULES (Always follow)

- NEVER use `any`
- ALWAYS validate input using Zod DTOs
- ALWAYS check `deletedAt: null` (soft delete)
- ALWAYS include audit fields: `createdById`, `updatedById`
- Controllers MUST be thin (no business logic)
- Services contain business logic
- Repo layer for DB access only
- Permission check is REQUIRED for protected routes

## Backend Rules

- ExpressJS + TypeScript strict
- Use Prisma ORM
- Use absolute imports from `src/*`
- Select only required fields in queries

## Database Rules

- Soft delete is mandatory (`deletedAt`)
- Never hard delete records
- Use translation tables for multi-language content
- Avoid N+1 queries

## Frontend Rules

- React 19 + TypeScript strict
- Use Zustand for global state
- Axios with interceptors
- Tailwind only (no custom CSS unless required)

## DO NOT

- Do not put business logic in controllers or components
- Do not expose sensitive fields (password, tokens)
- Do not use relative imports across modules
- Do not bypass permission checks
- Do not ignore TypeScript errors

## Related Instructions

- See `.github/instructions/nodejs-javascript-vitest.instructions.md` for Node.js and JavaScript guidelines
- See `.github/instructions/reactjs.instructions.md` for React patterns
- See `.github/instructions/typescript-5-es2022.instructions.md` for TypeScript rules
