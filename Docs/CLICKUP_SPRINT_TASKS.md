# ClickUp Sprint Tasks — MarketingWiz

> **Project:** MarketingWiz — AI Wealth Platform
> **Sprint:** Backend Migration & Frontend Enhancements
> **Status:** Completed

---

## 📁 EPIC 1: Database Migration — Supabase → PostgreSQL + Sequelize ORM

**Priority:** Urgent
**Status:** Done
**Estimated Time:** 16h
**Actual Time:** 16h

---

### ✅ Task 1.1 — Set Up Sequelize ORM with PostgreSQL

**Status:** Done
**Priority:** High
**Description:**
Replace the Supabase client with Sequelize ORM connected directly to a PostgreSQL database. Configure connection pooling and environment-based credentials.

**Subtasks:**
- [x] Install Sequelize, pg, and pg-hstore packages
- [x] Create `config/database.ts` with Sequelize instance and connection pool
- [x] Configure `.env` with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`
- [x] Wrap `app.listen()` in DB connection check — server only starts if DB connects
- [x] Add `connectDB()` helper used by both server start and test setup

**Acceptance Criteria:**
- Backend starts successfully and logs `[db] PostgreSQL connected`
- Failed DB connection logs error and exits gracefully

---

### ✅ Task 1.2 — Define All Sequelize Models

**Status:** Done
**Priority:** High
**Description:**
Define typed Sequelize models for all database tables to replace raw Supabase queries.

**Models Created:**
- [x] `User` — id, name, first_name, last_name, email, role, status, permissions, avatar_url, invite_nonce
- [x] `Skill` — id, name, category, description, color
- [x] `UserSkill` — user_id, skill_id, experience (junction table)
- [x] `Firm` — id, name, location, website, logo_url, description, contact fields
- [x] `Project` — id, firm_id, name, description, status, workflow_status
- [x] `ProjectMember` — project_id, user_id (junction table)
- [x] `Task / Ticket` — id, firm_id, project_id, assignee_id, title, status, priority
- [x] `TimeLog` — id, task_id, user_id, hours, log_type, revision_cycle
- [x] `Notification` — id, user_id, message, read
- [x] `Prompt` — id, name, type, content
- [x] `Transcript` — id, title, raw_transcript, source, archived
- [x] `OrgSettings` — organisation-level config

**Acceptance Criteria:**
- All models import cleanly from `src/models/index.ts`
- Associations (hasMany, belongsTo, belongsToMany) defined correctly

---

### ✅ Task 1.3 — Consolidate Schema into `postgres_schema.sql`

**Status:** Done
**Priority:** High
**Description:**
Create a single clean SQL schema file that includes all 42 migrations consolidated — no Supabase-specific syntax, no RLS policies, compatible with standard PostgreSQL.

**Subtasks:**
- [x] Merge all 42 migrations into one clean `postgres_schema.sql`
- [x] Remove all Supabase extensions and RLS policies
- [x] Remove `super_admin` role (not used in Sequelize setup)
- [x] Create `data_only.sql` — COPY blocks extracted from Supabase dump
- [x] Move legacy Supabase files to `database/legacy/` folder
- [x] Write `database/README.md` — documents which files to use for EC2 vs local

**EC2 Deployment Commands:**
```bash
export PGPASSWORD='password'
psql -h localhost -U aiwealth_user -d aiwealth_db \
  -f /home/ubuntu/app/backend/database/postgres_schema.sql
psql -h localhost -U aiwealth_user -d aiwealth_db \
  -f /home/ubuntu/app/backend/database/data_only.sql
psql -h localhost -U aiwealth_user -d aiwealth_db \
  -f /home/ubuntu/app/backend/database/seed.sql
```

**Acceptance Criteria:**
- Schema applies cleanly on a fresh PostgreSQL database with zero errors
- All tables, views, indexes, and triggers present after applying schema

---

## 📁 EPIC 2: Backend Test Suite Migration

**Priority:** High
**Status:** Done
**Estimated Time:** 12h
**Actual Time:** 12h

---

### ✅ Task 2.1 — Build Sequelize Mock Helper

**Status:** Done
**Priority:** High
**Description:**
Create a shared mock factory used by all test files to mock Sequelize models without real DB connections.

**File:** `src/__tests__/helpers/mockModels.ts`

**Subtasks:**
- [x] Create `makeMockModel()` factory — returns object with all Sequelize static methods mocked (findAll, findOne, findByPk, create, update, destroy, bulkCreate, count)
- [x] Export named mocks: `MockUser`, `MockSkill`, `MockUserSkill`, `MockFirm`, `MockTicket`, `MockProject`
- [x] Export `resetAllMocks()` — resets all mocks in `beforeEach`
- [x] Export `mockModelsModule()` — passed to `jest.mock('../../models', ...)`

**Acceptance Criteria:**
- Any test file can import and use mocks without touching the real DB
- `resetAllMocks()` clears all mock state between tests

---

### ✅ Task 2.2 — Migrate User Test Files

**Status:** Done
**Priority:** High
**Description:**
Rewrite 4 user-related test files from Supabase mocks to Sequelize model mocks.

**Files Updated:**
- [x] `users.test.ts` — full rewrite, removed `supabaseMockModule`, added Sequelize mocks
- [x] `users.controller.test.ts` — fixed mock boilerplate, corrected validation test cases
- [x] `users.service.test.ts` — 19 tests covering all service methods
- [x] `phone-validation.test.ts` — fixed 5-call mock sequence for PATCH flow

**Key Fix — Mock Sequence for PATCH /api/users/:id:**
```
1. MockUser.findByPk     → FAKE_USER       (findUserById before update)
2. MockUserSkill.findAll → []              (attachSkills before)
3. MockUser.update       → [1]             (perform update)
4. MockUser.findByPk     → updatedUser     (findUserById after update)
5. MockUserSkill.findAll → []              (attachSkills after)
```

**Acceptance Criteria:**
- All user tests pass without DB connection
- 0 Supabase imports remaining in test files

---

### ✅ Task 2.3 — Migrate Auth Test Files

**Status:** Done
**Priority:** Medium
**Description:**
Rewrite auth test files to use Sequelize mocks.

**Files Updated:**
- [x] `auth/login.test.ts` — mocks User.findOne for login flow
- [x] `auth/onboarding.test.ts` — mocks entire onboarding service to avoid deep dependency chains

**Key Fix:**
- Onboarding service mock used wrong function name `validateToken` → corrected to `validateOnboardingToken`

**Acceptance Criteria:**
- Login and onboarding flows tested without real DB or Supabase Auth

---

### ✅ Task 2.4 — Migrate Skills Test File

**Status:** Done
**Priority:** Medium
**Description:**
Rewrite skills test to use Sequelize mocks.

**File:** `skills/skills.test.ts`

**Subtasks:**
- [x] Replace `supabaseMockModule()` with Sequelize model mocks
- [x] Add `jest.mock('../../config/database', ...)` to prevent Sequelize init
- [x] Test 409 conflict using `SequelizeUniqueConstraintError` pattern
- [x] Test RBAC — 403 for member role on POST/DELETE

**Acceptance Criteria:**
- Skills CRUD fully tested: GET list, POST create (201, 400, 409, 403), DELETE (200, 500, 403)

---

### ✅ Task 2.5 — Fix TypeScript Config for Test Files

**Status:** Done
**Priority:** Low
**Description:**
IDE showed `Cannot find name 'jest'` errors in all test files because `__tests__` was excluded from `tsconfig.json`.

**Subtasks:**
- [x] Remove `src/__tests__` from `tsconfig.json` exclude list
- [x] Add `"types": ["node", "jest"]` to `tsconfig.json` compilerOptions
- [x] Create `tsconfig.test.json` extending base config, used by ts-jest

**Acceptance Criteria:**
- No TypeScript errors in test files in IDE
- `npm run build` still compiles cleanly (0 errors)
- All 101 tests still pass

---

## 📁 EPIC 3: Error Handling Improvements

**Priority:** Medium
**Status:** Done
**Estimated Time:** 3h
**Actual Time:** 3h

---

### ✅ Task 3.1 — Fix Onboarding Controller Error Status

**Status:** Done
**Priority:** Medium
**Description:**
`completeOnboarding` controller was defaulting unexpected errors to `400` instead of `500`.

**File:** `src/modules/auth/onboarding.controller.ts`

**Fix:**
```typescript
// Before
res.status(e.statusCode ?? 400).json({ error: e.message });

// After
res.status(e.statusCode ?? 500).json({ error: e.message });
```

**Acceptance Criteria:**
- Unexpected service errors return 500
- Validation/token errors still return 400 (via statusCode property)

---

### ✅ Task 3.2 — Duplicate Firm Name — Inline Error on Step 1

**Status:** Done
**Priority:** High
**Description:**
When creating a firm with a name that already exists, the API error appeared as a generic banner on Step 3. It should navigate back to Step 1 and show the error inline on the Firm Name input field.

**Files Updated:**
- `pages/AddFirmPage.tsx` — detect duplicate name error, set `nameApiError`, call `setStep(1)`
- `components/firms/FirmStepForms.tsx` — add `apiNameError` prop to `Step1Form`, display on name field

**Flow:**
```
User fills Step 1 → 2 → 3 → clicks "Add Client"
API returns "A firm with this name already exists."
→ setStep(1) → nameApiError shown on Firm Name field
→ User fixes name → nameApiError clears on input change
```

**Acceptance Criteria:**
- Duplicate name error shown on the name field in Step 1
- Error clears as soon as user starts typing a new name
- Other API errors still show as banners on Step 3

---

## 📁 EPIC 4: Frontend UI Enhancements

**Priority:** Medium
**Status:** Done
**Estimated Time:** 6h
**Actual Time:** 6h

---

### ✅ Task 4.1 — MultiSelect: Add `singleSelect` Prop

**Status:** Done
**Priority:** High
**Description:**
The Role dropdown in `AddUserPage` and `EditUserDrawer` uses the `MultiSelect` component (designed for multiple selections). For single-choice fields, the dropdown should close immediately after selecting an option — like a native `<select>`.

**File:** `src/components/ui/MultiSelect.tsx`

**Change:**
- Added `singleSelect?: boolean` prop (default: `false`)
- When `singleSelect={true}`, `toggle()` calls `close()` after setting the value

**Used In:**
- [x] `AddUserPage.tsx` — Role field: `singleSelect`
- [x] `EditUserDrawer.tsx` — System Role field: `singleSelect`

**Acceptance Criteria:**
- Selecting a role closes the dropdown immediately
- Trigger button shows the selected role name
- Skills and other multi-select fields unaffected

---

### ✅ Task 4.2 — Add Firm Form: Make Contact Fields Optional

**Status:** Done
**Priority:** Medium
**Description:**
Step 2 (Contact Details) in the Add Firm form required all fields (name, role, email, phone). The backend accepts all these as optional. Frontend validation updated to match.

**File:** `src/components/firms/FirmStepForms.tsx`

**Changes:**
- Removed required validation from: Contact Name, Role, Email, Phone
- Email: validates format only when a value is provided
- Phone: validates E.164 format only when a value is provided
- Contact Name: validates min 2 chars only when a value is provided
- Removed `required` asterisks from Step 2 input labels
- Updated placeholders to say `(optional)`

**Acceptance Criteria:**
- Firm can be created with all Step 2 fields empty
- Invalid email still shows format error when partially filled
- Invalid phone still shows E.164 error when partially filled

---

### ✅ Task 4.3 — Add Firm Form: Make Account Manager Optional

**Status:** Done
**Priority:** Medium
**Description:**
Step 3 (Account Manager) blocked form submission if no manager was selected. Backend accepts `account_manager_id: null`. Updated frontend to allow skipping this step.

**File:** `src/components/firms/FirmStepForms.tsx`

**Changes:**
- Removed required guard from `Step3Form.handleSubmit()`
- Removed `managerError` state and its display
- Changed label from `Choose Account Manager *` to `Choose Account Manager (optional)`
- Removed red border on list when no manager selected

**Acceptance Criteria:**
- Firm creates successfully without selecting an account manager
- Selecting a manager still works correctly
- No error shown when submitting without a manager

---

## 📊 Sprint Summary

| Epic | Tasks | Status | Time |
|---|---|---|---|
| DB Migration → Sequelize | 3 | ✅ Done | 16h |
| Test Suite Migration | 5 | ✅ Done | 12h |
| Error Handling | 2 | ✅ Done | 3h |
| Frontend Enhancements | 3 | ✅ Done | 6h |
| **Total** | **13** | **✅ Done** | **37h** |

---

## 🧪 Test Results

```
Test Suites: 7 passed, 7 total
Tests:       101 passed, 101 total
Snapshots:   0 total
Time:        ~10s
```

---

## 🔗 Related Files

| File | Change |
|---|---|
| `backend/src/config/database.ts` | Sequelize connection setup |
| `backend/src/models/index.ts` | All model definitions + associations |
| `backend/database/postgres_schema.sql` | Clean production schema |
| `backend/database/README.md` | EC2 deployment instructions |
| `backend/src/__tests__/helpers/mockModels.ts` | Shared Sequelize mock factory |
| `backend/tsconfig.json` | Added Jest types, removed __tests__ exclusion |
| `frontend-new/src/components/ui/MultiSelect.tsx` | Added singleSelect prop |
| `frontend-new/src/components/firms/FirmStepForms.tsx` | Optional contact + manager fields |
| `frontend-new/src/pages/AddFirmPage.tsx` | Duplicate name inline error handling |
| `frontend-new/src/modules/auth/onboarding.controller.ts` | Fixed 500 error default |
