# Ticket Generation Strategy — MarketingWiz

## The Core Problem

When you send a raw transcript to an AI without a strong prompt, you get vague, generic output.
The AI needs to know:
- **What role it is playing** (PM? Campaign strategist? Content coordinator?)
- **What format to return** (strict JSON, specific fields, specific enum values)
- **What to focus on** (action items, deadlines, blockers — not small talk)
- **What the constraints are** (ticket types, priority values your system understands)

Without this, you get free-form text that cannot be inserted into your database.

---

## Approach Comparison

### Option A — Python Script + Groq API

**How it works:**
1. Python script reads a transcript (from file or stdin)
2. Sends it to Groq API with a hardcoded prompt
3. Prints or saves the JSON output
4. You manually copy it into the system OR the script POSTs to your backend

**Result Possibility:**
- Quality: Medium to Good (depends entirely on how well you write the prompt in the script)
- Reliability: Low to Medium — you have to manually run it, handle errors yourself, no retry logic
- Integration: Disconnected from your admin UI — admin still has to do manual steps
- Maintenance: Two codebases (Python + TypeScript) that can drift apart
- JSON parsing: You have to write your own parser and validator
- Prompt management: Hardcoded in the script — no way to change it from the UI

**When it makes sense:** Only for one-off testing or bulk import of old transcripts. Not for production use.

---

### Option B — Direct Groq API in Backend (TypeScript, replaces OpenAI)

**How it works:**
1. Admin opens a transcript in the UI, picks a Prompt Type (PM / Campaigns / Content / Custom)
2. Frontend calls `POST /api/transcripts/:id/process` with `firm_id`, `prompt_id`, `notes`
3. Backend's `ai.service.ts` sends transcript + system prompt to Groq API
4. Groq returns a JSON array of tickets
5. Tickets are inserted as `status = draft` and shown in the admin UI for review

**Result Possibility:**
- Quality: High — Groq's Llama 3.3 70B is excellent at structured JSON output
- Reliability: High — same retry/validation logic already in your backend
- Integration: Seamless — the admin workflow already exists, you just plug in the key
- Maintenance: Single codebase, prompt types stored in your `prompts` database table
- JSON parsing: Already handled in `ai.service.ts` (`parseDraftsFromText`)
- Prompt management: Editable from the admin UI, stored per firm or global

**This is the correct production approach.**

---

## Why Prompting Matters More Than The Model

The same transcript sent with a weak prompt vs a strong prompt gives completely different results.

### Weak Prompt (what happens with no prompt / Python script shortcut)
```
Extract tasks from this transcript and return JSON.
```
**Output you get:**
- Generic titles like "Follow up on discussion"
- No type or priority — model guesses or skips
- Returns markdown text not pure JSON — your parser breaks
- 2-3 tickets when there should be 8-10

### Strong Prompt (what your system already has in the database)
```
You are a senior project manager assistant. Your task is to analyze a client call transcript
and extract actionable project management items. For each identified action item, produce a
structured ticket with: a clear title, a detailed description, ticket type
(task/design/development/account_management), a suggested priority (low/normal/high/urgent),
and an estimated hours to complete. Focus on deliverables, deadlines, blockers, and follow-ups
discussed in the call. Return your output as a JSON array of ticket objects.
```
**Output you get:**
- Specific, action-oriented titles ("Set up Google Analytics 4 tracking for campaign landing page")
- Correct type and priority from the allowed values
- Pure JSON array — no markdown wrappers
- 6-12 tickets covering every action item in the call

---

## The Three Prompt Types in Your System

These are already in your `prompts` table and should be used as-is or refined:

### 1. PM (Project Management Debrief)
**Use when:** The call was a general status/debrief call with a client
**Focus:** Deliverables, deadlines, blockers, follow-ups, ownership
**Best for ticket types:** `task`, `account_management`

### 2. Campaigns (Campaign Planning Extractor)
**Use when:** The call was about planning or reviewing a marketing campaign
**Focus:** Campaign goals, target audiences, channels, timelines, creative needs, budget
**Best for ticket types:** `task`, `design`, `development`

### 3. Content (Content Production Tracker)
**Use when:** The call was about content creation — blogs, social, email, video
**Focus:** Content formats, deadlines, brand guidelines, approval workflows, distribution
**Best for ticket types:** `design`, `task`

### 4. Custom
**Use when:** None of the above fit — you write a custom system prompt for a specific firm

---

## The Two Fixed Prompts in Your Code

Beyond the database prompts, `ai.service.ts` appends two hardcoded suffixes.

### Suffix appended to ALL generate calls
Location: [backend/src/services/ai.service.ts](../backend/src/services/ai.service.ts) — `GENERATE_SYSTEM_SUFFIX`

```
Return ONLY a valid JSON array of ticket objects. Each object must have these fields:
- title (string, concise action-oriented title)
- description (string, 1–3 sentences with context)
- type (one of: task | design | development | account_management)
- priority (one of: low | normal | high | urgent)

No markdown, no explanation — just the JSON array.
```

**This is critical.** It forces the model to return pure JSON with the exact field names and enum values your database expects. Never remove this.

### System prompt for single-ticket regeneration
Location: [backend/src/services/ai.service.ts](../backend/src/services/ai.service.ts) — `REGENERATE_SYSTEM_PROMPT`

```
You are a project management assistant.
Given a marketing call transcript, an existing ticket, and an additional instruction,
produce an improved version of the ticket.

Return ONLY a valid JSON object with these fields:
- title (string)
- description (string)
- type (one of: task | design | development | account_management)
- priority (one of: low | normal | high | urgent)

No markdown, no explanation — just the JSON object.
```

---

## What the Final Prompt Looks Like (Full Assembly)

When the admin clicks "Process Transcript", the backend assembles this exact prompt:

```
SYSTEM MESSAGE:
[Prompt from database — e.g. PM Debrief prompt]

Return ONLY a valid JSON array of ticket objects. Each object must have these fields:
- title (string, concise action-oriented title)
- description (string, 1–3 sentences with context)
- type (one of: task | design | development | account_management)
- priority (one of: low | normal | high | urgent)

No markdown, no explanation — just the JSON array.

USER MESSAGE:
## Call Transcript
[full raw transcript text]

## Additional Notes
[admin's optional notes about what to focus on]
```

The `Additional Notes` field is the admin's chance to guide the AI — e.g.:
- "Focus only on the Facebook Ads campaign discussed in the second half"
- "Ignore the competitor discussion, that's not actionable"
- "The deadline for all deliverables is end of April"

---

## Recommendation: Use Groq Directly in Backend

### Step 1 — Get a free Groq API key
Go to `console.groq.com`, create an account, generate an API key.

### Step 2 — Add to .env
```
GROQ_API_KEY=gsk_your_key_here
```

### Step 3 — Update ai.service.ts (2-line change)
Groq uses the OpenAI-compatible API. Change the client initialization:
```typescript
// Before (OpenAI)
openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// After (Groq)
openaiClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});
```

### Step 4 — Change the model name
```typescript
// Before
model: 'gpt-4o-mini',

// After
model: 'llama-3.3-70b-versatile',
```

That's it. Zero other changes. The entire flow — UI, prompts, JSON parsing, ticket insertion — stays the same.

---

## Expected Result Quality After This Change

| Scenario | Before (mock) | After (Groq) |
|---|---|---|
| Number of tickets generated | Always 3 (hardcoded mock) | 5-12 based on actual call content |
| Ticket titles | Generic ("Review campaign brief") | Specific ("Update Q2 Facebook Ads budget allocation per client feedback") |
| Types assigned | Hardcoded in mock | Correctly classified by AI |
| Priority assigned | Hardcoded in mock | Context-aware (urgent if deadline mentioned) |
| Description quality | Generic filler | 2-3 sentences with actual context from the call |
| Notes field used | Ignored | AI incorporates admin's notes into ticket content |

---

## Tips for Best Results

1. **Always add notes** when processing a transcript — even one line helps the AI focus
2. **Match prompt type to call type** — using PM prompt on a content creation call gives weaker tickets
3. **Keep transcripts clean** — Fireflies transcripts with speaker labels work best
4. **Review and edit drafts** before approving — AI output is a starting point, not final
5. **Use custom prompts for specialist firms** — a firm that only does SEO should have its own prompt tuned for SEO tasks
