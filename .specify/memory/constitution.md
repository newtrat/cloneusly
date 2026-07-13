<!--
Sync Impact Report
- Version change: template → 1.0.0
- Modified principles: template placeholders → I. Readable by Default; II. Small,
  Collaborative Changes; III. Deployable Without Drama; IV. Verify What Changes;
  V. Prefer the Simplest Working Design
- Added sections: Delivery Constraints; Development Workflow
- Removed sections: none
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md
  ✅ .specify/templates/spec-template.md
  ✅ .specify/templates/tasks-template.md
  ✅ .specify/templates/commands/*.md (directory not present)
- Follow-up TODOs: none
-->
# Cloneusly Constitution

## Core Principles

### I. Readable by Default
Every change MUST make its purpose and behavior understandable to a collaborator
without relying on hidden context. Use domain-specific names, focused modules and
functions, and straightforward control flow. Public interfaces, non-obvious
decisions, and setup steps MUST be documented where they are introduced; comments
explain why, not restate code. Rationale: hackathon teams move quickly only when
each contributor can safely understand and extend another person's work.

### II. Small, Collaborative Changes
Work MUST be organized into small, independently understandable increments with a
clear owner or handoff. Each increment MUST state its user-visible outcome and
avoid unrelated refactors. Changes that affect shared interfaces, data formats, or
configuration MUST document the compatibility impact. Rationale: a small team can
review, merge, and recover from focused work faster than from large coupled changes.

### III. Deployable Without Drama
The application MUST be deployable from a clean checkout through documented,
repeatable commands. Runtime configuration MUST be externalized, documented, and
safe to omit locally through sensible defaults or explicit validation. Every
deployment-affecting change MUST update the required environment variables, build,
run, and rollback instructions. Rationale: deployment is secondary to code clarity,
but it must not depend on one collaborator's machine or memory.

### IV. Verify What Changes
Every change MUST include proportionate verification of the behavior it affects:
automated tests when practical, plus a documented manual check when automation is
not justified for hackathon scope. Bug fixes MUST include a reproduction or
regression check. Contributors MUST run the formatter, linter, and relevant tests
before handoff when those tools exist. Rationale: fast feedback preserves momentum
without imposing ceremony that exceeds the project’s needs.

### V. Prefer the Simplest Working Design
Features MUST begin with the smallest implementation that meets the current
acceptance criteria. New dependencies, abstractions, services, and infrastructure
require a written justification and a statement of the simpler alternative that was
rejected. Rationale: unnecessary complexity reduces readability and makes a
hackathon project harder to deploy and hand off.

## Delivery Constraints

Secrets MUST never be committed. Provide an example configuration file that lists
required variables without real values. A feature is not ready to demo until a
collaborator can follow the documented setup and run instructions from a clean
checkout. Production-grade scaling, observability, and availability work are out of
scope unless they are required for the feature being delivered.

## Development Workflow

Before implementation, define the user outcome, the files or interfaces expected to
change, and how the outcome will be verified. During review or handoff, contributors
MUST explain the change in plain language and identify configuration or deployment
effects. Before demo or deployment, run the documented build and startup path and
record any known limitations in the project documentation.

## Governance

This constitution supersedes conflicting project practices. Any collaborator may
propose an amendment; it takes effect after the small team agrees and the change is
documented with its version impact. Use semantic versioning for this document:
MAJOR for removed or incompatible principles, MINOR for new or materially expanded
principles or sections, and PATCH for clarifications that preserve meaning.

Plans, specifications, tasks, reviews, and deployment notes MUST check applicable
principles before work is considered complete. Compliance reviews focus first on
readability, then on repeatable deployment, and may grant an explicit, documented
exception when hackathon constraints require it.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
