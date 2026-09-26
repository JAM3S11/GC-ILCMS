# GC-ILCMS

**Government Chemist Integrated Laboratory & Case Management System** (GC-ILCMS) is a digital casework and laboratory operations platform concept for the Government Chemist. It brings case registration, evidence handling, laboratory workflows, analysis records, and reporting into one role-aware workspace.

The system is designed to help staff follow work from the first visitor or submission through laboratory processing and report preparation, while making case status, responsibilities, and evidence movements easier to track.

## What the system supports

- **Reception and submissions:** Record visitors, their purpose, exhibits and documents presented, and route visits to the appropriate laboratory.
- **Case and exhibit records:** Keep case details, exhibits, samples, examination records, findings, and draft reports together in a digital case file.
- **Evidence traceability:** Record custody events such as receipt, transfer, storage, removal, opening, resealing, and return.
- **Department workflows:** Support laboratory operations across forensic and scientific units, including dedicated Food & Drugs sample intake and Water & Environment exhibit intake and assignment.
- **Analysis and reporting:** Provide scientific analysis views, reference information, findings, and draft certificate/report workflows.
- **Operational oversight:** Present role-based dashboards, notifications, and audit-trail views to help staff monitor work and responsibilities.

## Typical workflow

1. Reception records a visitor or submission and routes it to a laboratory.
2. Laboratory staff register the case or sample and record the received exhibits and supporting information.
3. The responsible department assigns work and records examination and evidence-custody activity.
4. Staff document findings and prepare a draft report for review and completion.

Exact steps depend on the submission type and the user's role. The application includes separate flows for Food & Drugs and Water & Environment submissions.

## Roles and access

The interface provides role-aware workspaces for leadership, administration, reception, laboratory heads, analysts, interns, and other staff roles. Available views and actions vary by role and, where applicable, laboratory department. Demo accounts are provided on the sign-in screen to explore the currently enabled workflows.

## Project status

This repository contains the GC-ILCMS web application prototype, including interactive workflows and sample data for demonstration. It is built as a client-side React application; demonstration records and interactions should not be treated as a production case-management or evidence repository.

## Run locally

**Prerequisite:** Node.js

```bash
npm install
npm run dev
```

Vite starts the development server on port `8000`.

## Validate and build

```bash
npm run lint
npm run build
```

The production build is written to `dist/`.

## Technology

React, TypeScript, and Vite; styled with Tailwind CSS and animated with Motion.
