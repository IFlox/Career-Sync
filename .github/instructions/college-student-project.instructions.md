---
applyTo: "**"
description: "Guidelines for local LLM agents working on this project: keep solutions simple, readable, maintainable, and safe; avoid unnecessary complexity and clearly surface uncertainty."
---

# Local LLM Project Guidelines

## Student-Friendly Working Style

Work on this project at the level of a first- or second-year computer science
student:

- Prefer simple, conventional solutions over clever or highly abstract designs.
- Use clear names, small functions, and straightforward control flow.
- Introduce one concept at a time instead of combining many advanced patterns.
- Prefer standard tools and libraries commonly taught in coursework.
- Keep the code readable enough that a student can study it later.
- Explain new concepts briefly when they are important to understanding the change.
- Avoid premature optimization, unnecessary microservices, complex infrastructure,
  and advanced design patterns unless the requirement truly needs them.
- Break large tasks into small, testable steps and verify each step before moving on.

## Core Principles

- Prefer clean, readable code over clever optimizations.
- Use standard libraries and familiar patterns before introducing niche tools.
- Make changes easy to understand, test, maintain, and extend.
- Read the existing code and related documentation before editing.
- Follow the project's current architecture and conventions unless the task
  explicitly requires changing them.
- Make precise, complete, surgical changes. Do not modify unrelated files or
  fix unrelated pre-existing issues.

## Keep in mind

- Check the actual requirement before choosing an implementation.
- Search for existing helpers, services, schemas, and tests before adding new logic.
- Preserve type safety, validation, error handling, and existing behavior.
- Explain non-obvious decisions briefly in code or in the final response.
- Update directly related documentation and tests when behavior changes.
- Validate changes with the smallest relevant test, lint, or type-check command.
- Surface failures explicitly. Do not hide errors behind broad catches, silent
  defaults, fabricated success responses, or invalid-input fallbacks.
- Protect secrets, personal data, credentials, tokens, and API keys.
- Keep temporary files and generated artifacts out of the project unless required.

## Beginner-Friendly Project Decisions

- Follow the existing project stack instead of adding a new framework.
- Use the simplest database, storage, and deployment option that satisfies the
  approved project plan.
- Prefer a direct service or utility function before introducing a new abstraction.
- Use comments to explain why non-obvious code exists, not to restate every line.
- Provide a runnable example or focused test when adding an unfamiliar feature.
- Preserve a clear path from input to processing to output so behavior is easy to
  trace and debug.

## What not to do

- Do not guess when requirements are ambiguous and the decision materially
  affects behavior, architecture, data, or user experience; ask for clarification.
- Do not rewrite or delete unrelated user changes.
- Do not use destructive commands or reset the worktree without explicit approval.
- Do not add dependencies unless the existing project cannot meet the requirement.
- Do not introduce complex architecture, abstraction, or infrastructure without a
  clear need.
- Do not hardcode secrets, credentials, machine-specific paths, or production
  configuration.
- Do not claim that code works without running appropriate validation.
- Do not change public APIs, schemas, database behavior, or persisted data formats
  silently.
- Do not use `as any`, broad casts, or disabled type checks to hide errors.
- Do not create planning or notes files unless the user explicitly requests them.
- Do not use advanced terminology without explaining it when communicating with the
  project owner.
- Do not turn a small feature into a large framework or configuration system.

## Code quality

- Use descriptive names and conventional structure.
- Keep functions focused and easy to test.
- Add comments only when they explain why non-obvious logic exists.
- Prefer explicit control flow over clever one-liners.
- Reuse existing patterns and shared utilities.
- Add regression tests for bugs and tests for new behavior where practical.

## Learning and implementation process

- Before editing, identify the relevant files and explain the intended small change
  internally through the implementation steps.
- Implement the smallest complete version first, then improve it only if needed.
- Prefer focused tests that demonstrate the expected behavior.
- When a command fails, read the error carefully and fix the root cause instead of
  suppressing it.
- Keep setup and run instructions understandable for a student using VS Code and
  the project's normal package manager.

## Communication

- Be concise and factual.
- State what changed and what was validated.
- Mention assumptions, limitations, and remaining failures clearly.
- If blocked, provide the exact reason and the smallest decision needed to continue.
