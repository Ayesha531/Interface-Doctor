# SKILLS.md

## Project Overview

This file defines the technical skills and implementation approaches required to develop and maintain **Interface Doctor AI**, an AI-powered website and app interface improvement tool developed by Team DebugMD.

The agent should apply the relevant skills when implementing features, fixing bugs, improving the UI, and maintaining the existing codebase.

## 1. Frontend Development

### Required Skills
- Next.js and React
- TypeScript
- Tailwind CSS
- Responsive web design
- Reusable component development
- State management and form handling
- Accessible UI development

### Usage
Use these skills to build the dashboard, screenshot upload interface, diagnosis results, issue highlighting, redesigned previews, and comparison screens.

Follow the existing project architecture and installed framework versions.

## 2. AI Integration and Prompt Engineering

### Required Skills
- Vision-capable AI model integration
- Secure API requests
- Prompt engineering
- Structured AI responses
- Runtime response validation
- Error handling and retry logic

### Usage
Use these skills to analyze uploaded screenshots and generate prioritized UI/UX findings with explanations and suggested fixes.

AI findings must be based on actual model responses. Never fabricate diagnoses or claim that the model performed tests it did not perform.

## 3. Image Processing and Visualization

### Required Skills
- Image upload and validation
- Image preview and scaling
- Image dimensions and aspect ratios
- Bounding boxes and coordinate mapping
- Canvas, SVG, or CSS overlays where appropriate

### Usage
Use these skills to display uploaded screenshots and highlight detected problem areas.

Keep markers aligned with the screenshot when its displayed dimensions change. Do not invent precise issue locations when reliable coordinates are unavailable.

## 4. UI/UX Design and Analysis

### Required Skills
- Visual hierarchy
- Spacing and alignment
- Typography and readability
- Color contrast
- Accessibility principles
- Responsive design
- Usability evaluation

### Usage
Use these skills to identify interface design problems, prioritize recommendations, and guide improvements to generated previews.

Distinguish between issues visible in a screenshot and properties that require source-code inspection or interactive testing.

## 5. AI-Powered Interface Generation

### Required Skills
- React component development
- HTML and CSS
- Tailwind CSS
- Reusable design systems
- Responsive layout generation
- Safe preview rendering
- Generated-output validation

### Usage
Use these skills to transform diagnosis findings into an improved, renderable webpage.

Preserve the original interface's purpose and important content unless a redesign requires changes.

Never execute arbitrary AI-generated JavaScript. Use controlled components or an appropriately sandboxed preview environment.

## 6. Testing and Verification

### Required Skills
- TypeScript and build validation
- DOM inspection
- Automated browser testing
- Color contrast calculations
- Responsive viewport testing
- Accessibility checks
- Unit, integration, and end-to-end testing

### Usage
Use these skills to verify measurable properties of generated interfaces and report genuine results.

Clearly distinguish between passed, failed, inconclusive, and untested checks. Do not claim full accessibility or responsiveness based on limited tests.

## 7. Backend and Database

### Required Skills
- Next.js server-side APIs
- Request and response validation
- Database integration
- Authentication and authorization
- File storage
- Persistent data management

### Usage
Use these skills to save and retrieve projects, screenshots, findings, generated previews, and verification reports.

Use the database and services already configured in the repository. If Supabase is used, apply appropriate authentication and Row Level Security policies.

## 8. Security and Reliability

### Required Skills
- Environment variable management
- API key protection
- Input and file validation
- Safe AI-output handling
- Secure preview isolation
- Access control
- Rate limiting where appropriate
- Error handling

### Usage
Apply security practices throughout the application.

Keep secrets server-side, validate external data, protect uploaded files and saved projects, and handle AI provider or database failures without exposing sensitive information.

## 9. Debugging and Code Quality

### Required Skills
- Reading TypeScript and runtime errors
- Debugging API requests
- Resolving build and dependency issues
- Identifying state-management bugs
- Refactoring reusable components
- Performance optimization
- Git and version control

### Usage
Inspect the existing implementation before making changes. Identify root causes, preserve working functionality, avoid unnecessary dependencies, and keep changes focused.

## 10. Skill Application Guidelines

- Inspect the existing codebase before implementing a feature.
- Apply only the skills relevant to the requested task.
- Reuse existing components, libraries, and integrations where practical.
- Follow the conventions in `AGENTS.md`.
- Avoid unnecessary architectural changes and overengineering.
- Validate inputs and external responses.
- Test relevant functionality after making changes.
- Document limitations and configuration requirements honestly.

## Definition of Done

A skill has been applied successfully when the relevant feature is implemented, existing functionality is preserved, important errors are handled, security requirements are respected, and appropriate checks have been performed.

The overall project should support this workflow:

**Upload screenshot → AI diagnosis → Highlight issues → Generate improved preview → Run verification checks → Save results.**
