# AGENTS.md

## Project Overview

This repository contains **Interface Doctor AI**, an AI-powered website and app interface improvement tool developed by **Team DebugMD**.

Users can upload a website or app screenshot, receive an AI-powered design diagnosis, view highlighted issues, generate an improved interface preview, run measurable verification checks, and save their projects and reports.

### Core Features

- Screenshot upload with file validation and sample screenshots.
- AI-powered UI/UX diagnosis with prioritized findings and suggested fixes.
- Visual highlighting of detected problem areas.
- Improved, responsive interface generation.
- Before-and-after comparison.
- Genuine verification checks with honest results.
- Persistent project and report storage.

### Technology Stack

- Frontend: Next.js, React, TypeScript, and Tailwind CSS.
- AI: Vision-capable AI model accessed through a secure server-side API.
- Database and authentication: Supabase or the service already configured in the project.
- Deployment: Vercel or a compatible hosting platform.

## Setup & Build

- Inspect `package.json` and the existing project structure before running commands.
- Install dependencies using the package manager indicated by the lockfile.
- Start the development server using the existing development script.
- Run the available lint, type-check, test, and production-build scripts when relevant.
- Check `.env.example` and existing configuration to identify required environment variables.
- Never overwrite existing configuration or replace working integrations without a clear reason.

Use the scripts actually available in the repository rather than assuming that every standard command exists.

## Code Conventions

- Use TypeScript and follow the existing Next.js architecture.
- Write clean, maintainable, reusable components.
- Use Tailwind CSS and follow the existing design system.
- Keep components and business logic organized by responsibility.
- Validate user inputs and external API responses.
- Build responsive and accessible interfaces.
- Reuse existing dependencies and components where practical.
- Avoid unnecessary dependencies, duplicated code, and unrelated refactoring.
- Handle loading, empty, success, and error states.
- Never introduce placeholder buttons or fake functionality as a substitute for working features.

## AI and Security Requirements

- Inspect the existing implementation before modifying or rebuilding any feature.
- Use a real vision-capable AI model for genuine screenshot diagnosis.
- Never fabricate AI findings or present sample data as real analysis.
- Keep API keys and privileged credentials on the server.
- Validate AI-generated findings, coordinates, and interface output.
- Never execute arbitrary AI-generated JavaScript using `eval`, `Function`, or equivalent mechanisms.
- Render generated interfaces through controlled components or an appropriately sandboxed environment.
- Run genuine verification checks and report passed, failed, inconclusive, or untested results accurately.
- Protect uploaded screenshots, saved projects, and user data through appropriate access controls.
- Handle API failures, invalid uploads, and database errors gracefully.

## Testing Instructions

- Run relevant linting and TypeScript checks.
- Test the main user workflow: upload screenshot, diagnose issues, highlight findings, generate a preview, verify results, and save the project.
- Test invalid uploads and failed AI requests.
- Check that generated previews render safely.
- Verify database access controls and project ownership when persistence is implemented.
- Test responsive layouts and important interactions.
- Run the production build when practical.
- Report tests that were not run or that failed. Never claim success without verification.

## Contribution & PR Guidelines

- Use clear, descriptive commit and pull request titles.
- Keep changes focused on the requested feature or bug fix.
- Preserve existing working functionality and unrelated user changes.
- Review modified files before committing.
- Include relevant testing information in pull requests.
- Document new environment variables, dependencies, and setup requirements.
- Do not commit API keys, credentials, or other secrets.

## Usage Notes

- Read `SKILLS.md` for detailed technical guidance on AI integration, screenshot analysis, UI generation, verification, security, and database operations.
- Follow the existing repository structure and conventions.
- Do not assume a feature is missing until the relevant code has been inspected.
- Prefer incremental improvements over unnecessary rewrites.
- Do not introduce new libraries or services when existing project functionality is sufficient.
- If an essential requirement is unclear, ask for clarification rather than making risky assumptions.

## Reminders for Agents

- Prioritize working MVP functionality, security, reliability, and development speed.
- Inspect before editing.
- Preserve existing work.
- Keep implementations simple and maintainable.
- Do not fabricate AI findings, verification results, or completed functionality.
- Run relevant checks after making changes.
- Clearly summarize what changed, which files were modified, what was tested, and what remains incomplete.

**Final goal:** Build a functional AI-powered interface improvement tool, not merely a frontend demonstration. Every core feature should work as implemented, and every reported result must reflect what the application actually performed.
