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

The interface provides role-aware workspaces for leadership, administration, reception, laboratory heads, analysts, interns, and other staff roles. User sign-in, registration approval, account invitations, and super-admin audit data are stored in PostgreSQL. There are no built-in demo credentials; the first super-admin is provisioned from the command line.

## Project status

This repository is still a prototype: account approval, receptionist visits, and Water & Environment exhibit intake are backed by PostgreSQL, while general laboratory cases, exhibits, reports, and other operational workflow data remain in client-side sample state.

Water Lab intake records are linked to the active reception visit and persist sender/contact details, receiving officer, sample source and test details, server-calculated charges, receipt number, generated lab/exhibit/seal references, storage and supporting-document notes, assignment, and completion. The Head of Water & Environment assigns active Water Lab staff; only the assigned officer or the Head can mark analysis complete. Department members see database updates through a 15-second refresh, and registration, assignment, and completion write append-only workflow events plus audit entries.

## Run locally

**Prerequisites:** Node.js and a PostgreSQL database.

```powershell
npm install
Copy-Item .env.example .env
# Create the empty database (after installing PostgreSQL):
psql -U postgres -c "CREATE DATABASE gcilcms;"
# Edit .env and set DATABASE_URL, APP_URL, and the SMTP settings.
# Set MIGRATION_DATABASE_URL if schema/bootstrap access uses a separate DB role.
npm run migrate
# Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and a strong SUPER_ADMIN_PASSWORD
# in .env, then run this once:
npm run bootstrap:super-admin
# Remove the bootstrap credentials from .env after the first admin is created.
npm run dev
```

The Express server and Vite development UI run together on port `8000`. Configure working SMTP credentials before approving requests or creating users so the one-time invitation email can be delivered. For Gmail, use a Google App Password from an account with 2-Step Verification enabled—not the account's regular password. The app removes spaces from the App Password automatically. Set `SMTP_USER` to that Gmail account and make `MAIL_FROM` that account or a verified Gmail "Send mail as" address.

The initial super-admin signs in with the email and password used during bootstrap. Staff registrations stay pending until the super-admin approves them. Approval or direct user creation sends a single-use activation link that expires after 15 minutes; users choose their password through that link. If SMTP delivery fails, the approval/account is still saved and the administrator can resend the invitation from Staff accounts after fixing the SMTP configuration. Passwords and invitation/session tokens are never stored in plaintext.

Super-admin alerts are persisted in PostgreSQL and refresh while the console is open. New staff registrations, user password-reset requests, department-change requests, and account administration actions appear in the bell and Notifications page. Account approvals, department changes, and reset-link actions can be performed directly from the notification page; department moves requested by staff require super-admin approval.

Reception can send a registered visitor to the destination laboratory using the visitor register’s **Notify [department]** action. The lab receives a visitor-linked notification; opening it loads the visit from PostgreSQL into Lab Bay, where staff can accept the client, resend the notification from that visitor’s row, and open the Food & Drugs or Water intake form with the reception details prefilled.

## Validate and build

```bash
npm run lint
npm run build
```

The production build is written to `dist/`.

For a production deployment, set `NODE_ENV=production`, use TLS, a managed PostgreSQL service, and an approved SMTP relay. Keep `DATABASE_URL` on a least-privilege runtime database role; use the optional `MIGRATION_DATABASE_URL` only for schema/bootstrap operations. Restrict database network access and keep all credentials out of source control.

## Technology

React, TypeScript, Vite, Express, and PostgreSQL; styled with Tailwind CSS and animated with Motion.
