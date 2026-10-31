# BRIGHTLOOP SOFTWARE
### Enterprise Subscription Management, Recurring Billing Engine & Finance Analytics Platform

> Built for the Hackathon. Powered by Node.js, Express, Supabase PostgreSQL, and React (Vite + Tailwind CSS). Styled using a bespoke flat editorial design system.

---

## Table of Contents
1. [Overview & Product Scope](#overview--product-scope)
2. [Technology Stack](#technology-stack)
3. [User Roles & Access Control](#user-roles--access-control)
4. [System Flow & State Machines](#system-flow--state-machines)
   - [Subscription Lifecycle](#1-subscription-lifecycle)
   - [Invoice Lifecycle & Overdue Definition](#2-invoice-lifecycle--overdue-definition)
   - [Recurring Billing Engine](#3-recurring-billing-engine)
   - [Atomic Payment Settlements](#4-atomic-payment-settlements)
   - [Customer Isolation](#5-customer-isolation)
5. [Database Schema & Architecture](#database-schema--architecture)
6. [Performance Benchmarks (27,700+ Records)](#performance-benchmarks-27700-records)
7. [Local Machine Setup & Operation](#local-machine-setup--operation)
   - [Prerequisites](#prerequisites)
   - [1. Backend Setup](#1-backend-setup-server)
   - [2. Database Initialization & Seeding](#2-database-initialization--seeding)
   - [3. Frontend Setup](#3-frontend-setup-client)
   - [4. Running the Dev Servers](#4-running-the-dev-servers)
8. [Demo Credentials](#demo-credentials)
9. [API Reference & CURL Examples](#api-reference--curl-examples)
10. [Design System & UI Components](#design-system--ui-components)

---

## Overview & Product Scope

**Brightloop** is a high-performance subscription management and automated invoicing platform engineered for software and service organizations. It provides end-to-end management of:
* **Product Catalog with Variants**: Base items and attribute add-ons (e.g. Brand: Odoo +₹560).
* **Flexible Billing Plans**: Daily, Weekly, Monthly, and Yearly recurring intervals with pausable, closable, and auto-renew rules.
* **Taxes & Tiered Discounts**: Snapshot pricing calculations, subscription-level and product-scoped discounts, and usage limits.
* **Subscription Management**: Full quote-to-cash lifecycle (Draft ➔ Quotation ➔ Confirmed ➔ Active ➔ Closed).
* **Automated Invoicing Engine**: Period math, pro-rated discount allocation, line item tax snapshots, and email notifications.
* **Atomic Payment Settlements**: Concurrency-safe payment recording with overpayment prevention and automatic transition to Paid.
* **Executive Finance Dashboard**: Real-time revenue metrics, still-owed receivables, overdue invoices monitoring, and CSV ledger export.
* **Isolated Customer Portal**: Self-service portal where customers can inspect active subscriptions, download statements, and print invoices.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (CommonJS), Express 5, `pg` (PostgreSQL Connection Pooling), Zod, bcryptjs, JSON Web Tokens (JWT), Nodemailer, Node-Cron, Helmet, Morgan, CORS |
| **Database** | **Supabase Hosted PostgreSQL** with atomic sequences, foreign keys, JSONB columns, and compound indexing |
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide React, Day.js, React Hot Toast, Axios |
| **Design Language** | Flat Editorial: 0px border-radius, zero box shadows, zero gradients, Inter typography, uppercase tracking |

---

## User Roles & Access Control

The platform enforces strict role-based access control (RBAC):

```
                     ┌──────────────────┐
                     │   BRIGHTLOOP     │
                     └────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     [ ADMIN ]            [ STAFF ]          [ CUSTOMER ]
 ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 │ Full Workspace  │ │ Operations Only │ │ Portal Only     │
 │ Products/Plans  │ │ Subscriptions   │ │ My Subs         │
 │ Taxes/Discounts │ │ Invoices        │ │ My Invoices     │
 │ Subscriptions   │ │ Billing Run     │ │ Printable Doc   │
 │ Billing Engine  │ │ Payments        │ │ (Strict User ID │
 │ Payments        │ │ Customers       │ │  Isolation)     │
 │ Users & Staff   │ │ Read-Only Cat.  │ └─────────────────┘
 │ Dashboard/Export│ │ Dashboard/Export│
 └─────────────────┘ └─────────────────┘
```

1. **Admin**:
   - Full read/write access across all modules: Products, Plans, Taxes, Discounts, Quotation Templates, Subscriptions, Invoices, Payments, Users, Staff provisioning, and Finance Analytics.
2. **Staff**:
   - Operational management: Create/manage Subscriptions, trigger Billing Runs, Confirm/Send Invoices, Record Payments, inspect Customer records, and export Finance Analytics.
   - Catalog (Products, Plans, Taxes, Discounts, Templates) is **read-only**. User management is hidden.
3. **Customer**:
   - Automatically redirected to the `/portal` route upon login.
   - **Never allowed into `/app`**. Queries are scoped strictly to `req.user.id` at the database level.

---

## System Flow & State Machines

### 1. Subscription Lifecycle
Subscriptions transition through a strict finite state machine:

```
 [ DRAFT ] ──➔ [ QUOTATION ] ──➔ [ CONFIRMED ] ──➔ [ ACTIVE ] ──➔ [ CLOSED ]
     │                │                  │
     └────────────────┴──────────────────┴──➔ [ CLOSED ] (Early Cancellation)
```

* **Draft**: Initial configuration of customer, plan, and line items snapshot.
* **Quotation**: Quotation generated with an expiration date (`quotationValidUntil`).
* **Confirmed**: Order confirmed by customer or sales agent.
* **Active**: Subscription in service; recurring invoices are generated each billing period.
* **Closed**: Cancelled or expired subscription. Any non-closed subscription can transition directly to `closed`.

### 2. Invoice Lifecycle & Overdue Definition
Invoices follow an automated settlement lifecycle:

```
 [ DRAFT ] ──➔ [ CONFIRMED ] ──➔ [ PAID ] (Triggered automatically when amountPaid >= total)
     │               │
     ▼               ▼
 [ CANCELLED ]   [ CANCELLED ] (Only permitted if amountPaid === 0)
```

* **Overdue Definition**: An invoice is defined as **Overdue** if and only if `status === 'confirmed'` AND `dueDate < now()`. (Computed dynamically, never stored, preventing state drift).
* **Cancellation Guard**: An invoice can only be cancelled from `draft` or `confirmed` if `amountPaid === 0`. Paid invoices cannot be cancelled.

### 3. Recurring Billing Engine
* Triggered manually via `POST /api/billing/run` or via cron schedule (`node-cron`).
* Finds all active subscriptions where `nextInvoiceDate <= now()`.
* Snapshot line items with unit prices, applicable taxes, and prorated discounts.
* Creates invoices with unique constraint on `(subscription_id, period_start)` preventing duplicate billing.
* Updates subscription's `nextInvoiceDate` by adding the plan's billing period (daily, weekly, monthly, yearly).

### 4. Atomic Payment Settlements
* Payments can **only** be recorded against invoices in `confirmed` status.
* Executes inside a PostgreSQL transaction with pessimistic row locking (`SELECT ... FOR UPDATE`).
* Rejects overpayments: enforces `amount <= (total - amountPaid)`.
* Atomically increments `invoice.amount_paid`. If `amount_paid >= total`, automatically flips invoice status to `paid`.

### 5. Customer Isolation
* Customer portal endpoints (`/api/me/subscriptions`, `/api/me/invoices`, `/api/me/invoices/:id`) strictly enforce `WHERE customer_id = req.user.id`.
* Requesting another customer's invoice ID yields an immediate HTTP `404 Not Found`.

---

## Database Schema & Architecture

The database runs on **Supabase Hosted PostgreSQL**. The tables and compound indexes include:

| Table | Description | Key Indexes |
|---|---|---|
| `users` | Accounts with roles (`admin`, `staff`, `customer`) & bcrypt hashes | `email` (UNIQUE) |
| `counters` | Concurrency-safe atomic sequence generator (`SUB-xxxx`, `INV-xxxx`) | `key` (PRIMARY) |
| `products` | Base products, prices, and attribute variants stored as JSONB | `id` (PRIMARY) |
| `plans` | Recurring billing intervals, prices, and status | `id` (PRIMARY) |
| `taxes` | Regional tax rates (e.g. GST 18%, Cess 5%) | `id` (PRIMARY) |
| `discounts` | Fixed & percent discounts with product/subscription scope & usage limits | `id` (PRIMARY) |
| `quotation_templates` | Predefined line packages linked to plans | `id` (PRIMARY) |
| `subscriptions` | Active and historical subscriptions with snapshot lines | `(status, next_invoice_date)`, `customer_id`, `created_at DESC` |
| `invoices` | Billing statements with lines, subtotals, tax, discounts, and payments | `(subscription_id, period_start)` (UNIQUE), `(status, due_date)`, `(customer_id, created_at DESC)`, `created_at DESC` |
| `payments` | Settlement logs with method, amount, recorded_by, and invoice link | `invoice_id`, `date DESC`, `customer_id` |

---

## Performance Benchmarks (27,700+ Records)

Tested against the production database containing **5,200 Subscriptions**, **15,000 Invoices**, and **7,500 Payments**:

```
========================================================================================
| Endpoint / Query                                   | Status | Time    | Target   | Result |
|====================================================|========|=========|==========|========|
| GET /api/dashboard/summary (all metrics)           | 200    |  202 ms | < 2000ms | PASS   |
| GET /api/dashboard/summary (customer filtered)     | 200    |  159 ms | < 2000ms | PASS   |
| GET /api/subscriptions (page 1, 20 items)          | 200    | 1253 ms | < 2000ms | PASS   |
| GET /api/subscriptions?status=active               | 200    |  317 ms | < 2000ms | PASS   |
| GET /api/invoices (page 1, 20 items)               | 200    |  170 ms | < 2000ms | PASS   |
| GET /api/invoices?status=confirmed                 | 200    |  167 ms | < 2000ms | PASS   |
| GET /api/invoices?status=paid                      | 200    |  162 ms | < 2000ms | PASS   |
| GET /api/invoices?status=overdue                   | 200    |  161 ms | < 2000ms | PASS   |
| GET /api/invoices?status=draft                     | 200    |  163 ms | < 2000ms | PASS   |
| GET /api/payments (page 1, 20 items)               | 200    |  172 ms | < 2000ms | PASS   |
| GET /api/me/subscriptions (customer scoped)        | 200    |  160 ms | < 2000ms | PASS   |
| GET /api/me/invoices (customer scoped)             | 200    |  160 ms | < 2000ms | PASS   |
| GET /api/me/invoices/:id (customer scoped)         | 200    |  158 ms | < 2000ms | PASS   |
========================================================================================
🏆 ALL QUERIES RESPOND IN UNDER 2 SECONDS (AVERAGE ~200ms)
```

---

## Local Machine Setup & Operation

### Prerequisites
* **Node.js**: v18.0.0 or higher (`node -v`)
* **npm**: v9.0.0 or higher (`npm -v`)
* **Git**: Installed and configured

---

### 1. Backend Setup (`/server`)

1. Open a terminal and navigate to `/server`:
   ```bash
   cd server
   ```

2. Create `.env` file (you can copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Ensure `.env` contains the Supabase database connection string:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:Brightloop@123@db.xsxpnnbzxjjiypainoks.supabase.co:5432/postgres
   JWT_SECRET=brightloop_hackathon_jwt_secret_2026
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   DEV_AUTH=true
   ENABLE_CRON=false
   ```

3. Install server dependencies:
   ```bash
   npm install
   ```

---

### 2. Database Initialization & Seeding

1. **Initialize Database Tables** (Idempotent):
   ```bash
   npm run db:init
   ```

2. **Run the High-Performance Seed Engine** (Populates 200 customers, 5,200 subscriptions, 15,000 invoices, 7,500 payments):
   ```bash
   npm run seed -- --force
   ```

3. **(Optional) Run Performance Benchmark Suite**:
   ```bash
   npm run perf
   ```

---

### 3. Frontend Setup (`/client`)

1. Open a second terminal and navigate to `/client`:
   ```bash
   cd client
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
   Ensure `.env` contains:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. Install client dependencies:
   ```bash
   npm install
   ```

4. Verify build:
   ```bash
   npm run build
   ```

---

### 4. Running the Dev Servers

1. **Start Backend Server** (Port `5000`):
   ```bash
   cd server
   npm run dev
   ```
   *Health Check*: `http://localhost:5000/api/health` ➔ `{ "ok": true }`

2. **Start Frontend Development Server** (Port `5173`):
   ```bash
   cd client
   npm run dev
   ```
   Open your browser at: **`http://localhost:5173`**

---

## Demo Credentials

| Role | Email | Password | Access Area |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@12345` | `/app` (Full control) |
| **Staff 1** | `staff1@example.com` | `Staff@1234` | `/app` (Operations only) |
| **Staff 2** | `staff2@example.com` | `Staff@1234` | `/app` (Operations only) |
| **Customer** | `customer1@example.com` | `Customer@123` | `/portal` (Self-service only) |
| **Customer 2** | `customer2@example.com` | `Customer@123` | `/portal` (Self-service only) |

*(Note: There are 200 seeded customers from `customer1@example.com` to `customer200@example.com`, all sharing the password `Customer@123`)*.

---

## API Reference & CURL Examples

When `DEV_AUTH=true` is enabled, you can pass `-H "x-dev-role: <role>"` and `-H "x-dev-user-id: <user_id>"` for fast testing.

### 1. Record a Payment (Admin/Staff)
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "x-dev-role: staff" \
  -H "x-dev-user-id: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "invoice": "<INVOICE_UUID>",
    "method": "upi",
    "amount": 1000.00,
    "date": "2026-10-31",
    "note": "UPI Ref 998822"
  }'
```

### 2. Get Finance Dashboard Summary (Admin/Staff)
```bash
curl http://localhost:5000/api/dashboard/summary \
  -H "x-dev-role: admin" \
  -H "x-dev-user-id: 00000000-0000-0000-0000-000000000001"
```

### 3. Export Invoices CSV Ledger (Admin/Staff)
```bash
curl http://localhost:5000/api/dashboard/export \
  -H "x-dev-role: admin" \
  -H "x-dev-user-id: 00000000-0000-0000-0000-000000000001" \
  -o invoices-ledger.csv
```

### 4. Run Billing Engine (Admin/Staff)
```bash
curl -X POST http://localhost:5000/api/billing/run \
  -H "Content-Type: application/json" \
  -H "x-dev-role: admin" \
  -H "x-dev-user-id: 00000000-0000-0000-0000-000000000001" \
  -d '{"asOf": "2026-10-31"}'
```

### 5. Fetch Customer Invoices (Customer Portal)
```bash
curl http://localhost:5000/api/me/invoices \
  -H "x-dev-role: customer" \
  -H "x-dev-user-id: <CUSTOMER_UUID>"
```

### 6. Fetch Specific Invoice Document (Customer Portal)
```bash
curl http://localhost:5000/api/me/invoices/<INVOICE_UUID> \
  -H "x-dev-role: customer" \
  -H "x-dev-user-id: <CUSTOMER_UUID>"
```
*(Returns `404 Not Found` if requested by another customer)*.

---

## Design System & UI Components

The frontend strictly adheres to the editorial design tokens specified in the team contract:

* **No Shadows, No Rounded Corners**: `border-radius: 0px`, `box-shadow: none`.
* **Palette Tokens**:
  * Maroon: `#800000`
  * Deep Maroon: `#660000`
  * Cream Background: `#ECE9DC`
  * Ink Text & Borders: `#1A1614`
  * Line Borders: `#5A5550`
* **Typography**: Clean `Inter` typography, bold uppercase headings, and uppercase letter-spacing (`0.08em`).
* **Reusable UI Component Library** located at `client/src/components/ui`:
  * `<Button variant="primary | secondary | maroon | danger | outline | ghost" />`
  * `<Input label="UPPERCASE" helper="" error="" />`
  * `<Select label="UPPERCASE" options={[]} />`
  * `<StatusBadge status="paid | confirmed | overdue | draft | active | quotation | closed" />`
  * `<KpiCard variant="maroon | maroonDeep | ink | outlined | default" />`
  * `<FilterChips options={[]} selected="" onChange={...} />`
  * `<StatusStepper steps={[]} current="" />`
  * `<DataTable columns={[]} data={[]} loading={...} page={1} totalPages={...} onPageChange={...} />`
  * `<Modal open={...} onClose={...} title="" maxWidth="md" />`
  * `<ConfirmDialog open={...} onConfirm={...} onClose={...} />`
  * `<PageHeader title="" subtitle="" actions={...} />`

---

## License & Team
Developed for **Brightloop Hackathon**. Private proprietary codebase.