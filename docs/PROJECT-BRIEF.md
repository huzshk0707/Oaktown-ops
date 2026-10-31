# Oaktown Ops: project brief

**Historical discovery baseline:** For current implementation status, priorities and outstanding validation, use [the current roadmap](ROADMAP.md). Later releases supersede the original architecture, storage and module-status statements below. Unresolved business decisions remain unresolved unless explicitly confirmed.

Status: v0.1 implementation underway under the user's subsequent instruction. The original discovery baseline remains below for context. Last updated: 2026-10-25.

## Introduction

Oaktown Ops is a planned operations application. The recoverable source material concerns rental-property notices, mailing preparation, and an attorney-related eviction workflow. This describes the scope visible in the available material; it is not a complete specification of every module envisioned in the original discussion.

The immediate area of interest is a notice generator based on existing past-due notice examples. A firm mailing book is also part of the existing process. Two later steps in an eviction workflow are explicitly documented.

## Updated direction

The user has instructed us to begin building with available information, then refine through use, tests, and feedback. v0.1 uses a provisional buildless browser app with in-memory sample data and GitHub Pages hosting. See [release notes](RELEASE-0.1.md). This supersedes the earlier pause on implementation; missing source decisions remain unknown.

## Original documentation-phase instructions

- Keep project files and future code directly on GitHub, with no local project checkout.
- The repository is public.
- Gather requirements and create project documentation now.
- Do not begin the software build yet.
- Use the referenced discussion as source material, preserving recoverable decisions and explicitly identifying gaps.

## Scope supported by the available evidence

1. Notice preparation: investigate generating notices matching the supplied examples.
2. Mailing preparation: document the supplied firm mailing book and its relationship to outgoing notices.
3. Eviction follow-up: preserve the confirmed attorney-email filing confirmation and court-date/reminder practices.

These are discovery areas, not approval for implementation or automation.

## Decisions still open

The source user asked whether to start with standalone HTML or the broader software. The corresponding assistant response could not be recovered. Therefore the architecture choice is unresolved in this baseline.

No verified decision is available for hosting, framework, database, authentication, integrations, user roles, billing, deployment, or a full module list. GitHub is the chosen source repository; that does not select an application hosting or data-storage solution.

## Project disclaimer

This repository contains an early working prototype and an incomplete discovery baseline. It is not a complete reconstruction of the original conversation or a production-ready application. Confirmed user statements, observations from supplied documents, and proposed requirements are distinguished throughout.

Existing notice language is a historical source example. Its inclusion in requirements does not establish legal validity, current statutory compliance, correct service, an enforceable deadline, or authorization to send a notice or initiate an eviction. No legal or postal rules have been independently validated in this documentation pass. Appropriate review is needed before any future operational use.

The public repository contains abstract document structures and workflow notes. Completed tenant documents, personal addresses, balances linked to people, attorney correspondence, and other live case information are not included.

## Reading order

- [Requirements and decisions](REQUIREMENTS.md)
- [Document requirements](DOCUMENT-REQUIREMENTS.md)
- [Source coverage](SOURCE-COVERAGE.md)
- [Open questions and next steps](OPEN-QUESTIONS.md)
