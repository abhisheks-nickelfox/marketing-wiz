# AWS for MarketingWiz — Why, What & What It Costs

**Prepared for:** MarketingWiz Client Review
**Purpose:** This document explains, in plain terms, why moving to Amazon Web Services (AWS) for three core areas — database, email, and file storage — is the right long-term decision for the platform. It is written to help you understand the reasoning, the trade-offs, and what to expect on costs — not as a technical blueprint.

---

## The Problem We Are Solving

MarketingWiz is currently built on **Supabase**, a developer-friendly platform that bundles a database, authentication, and APIs into one product. It is excellent for getting started quickly, and it has served the project well in its early stages.

However, as the platform grows — more agencies, more meeting transcripts, more team members, more tickets — Supabase starts to show limitations:

- **Cost jumps sharply** at scale. Supabase's free and starter tiers are generous, but the jump to their "Team" plan ($599/month) happens earlier than most people expect.
- **No email delivery.** Supabase does not send emails. Right now, when a ticket is assigned or sent back for revisions, the team member only finds out if they happen to be logged in. There is no email alert.
- **Transcripts are stored as raw text in the database.** A one-hour meeting transcript is roughly 80–200KB of text. As hundreds of agencies upload daily meeting recordings, this bloats the database and slows it down.
- **Limited compliance options.** Enterprise agencies increasingly require SOC 2, GDPR, or HIPAA-aligned infrastructure. Supabase does not offer the same level of compliance tooling that AWS does.

AWS solves all three of these problems — database, email, and file storage — with services that are more scalable, more controllable, and more cost-efficient at production volume.

---

## 1. Database — Why AWS Over Supabase

### What the database does in MarketingWiz

The database is the heart of the platform. Every ticket, every agency, every transcript, every time log, every team member, and every notification is stored here. It runs complex queries (e.g. team workload views, overdue ticket reports) every time someone loads a dashboard.

### The case for moving to AWS RDS

**Amazon RDS (Relational Database Service)** and **Amazon Aurora** are AWS's managed database services. They run the same PostgreSQL engine as Supabase — meaning the existing database schema, all 17 migrations, and all stored data migrate with zero rewriting.

The reasons to move are business and operational, not just technical:

| Concern | Supabase | AWS RDS / Aurora |
|---|---|---|
| **Predictable costs** | Fixed monthly tiers that jump sharply (Free → $25 → $599) | Pay for what you actually use — scales smoothly |
| **Data privacy** | Database is hosted on Supabase's infrastructure | Database lives inside your own private AWS environment (VPC) — no third party holds your data |
| **Backup & recovery** | 7-day backups on paid plans | Up to 35-day point-in-time recovery + automated snapshots |
| **Handles traffic spikes** | Limited by plan tier | Aurora Serverless v2 automatically scales up during peak processing |
| **Compliance** | Limited certifications | AWS holds SOC 1/2/3, ISO 27001, HIPAA, GDPR tooling — enterprise-ready |
| **Uptime guarantee** | 99.9% SLA | 99.99% SLA with Multi-AZ (automatic failover in under 30 seconds) |

### EC2 vs RDS — Understanding the Choice

When people say "host the database on AWS," there are two approaches. It is important to understand both.

---

**Option A: Amazon EC2 (Virtual Machine)**

EC2 is a virtual server you rent from AWS. You install and manage PostgreSQL yourself on that server — updates, backups, security patches, performance tuning, replication.

| | EC2 (Self-managed PostgreSQL) |
|---|---|
| **Pro** | Full control over every setting |
| **Pro** | Slightly cheaper at the same hardware spec |
| **Pro** | Can run multiple services on one server |
| **Con** | You are responsible for database software updates |
| **Con** | You manage backups manually (easy to forget or misconfigure) |
| **Con** | No automated failover — if the server crashes, someone has to intervene |
| **Con** | Security patching is your team's responsibility |
| **Con** | Performance tuning requires database expertise |
| **Best for** | Teams with a dedicated DevOps / database administrator |

**Estimated EC2 cost (small instance, t3.medium, 2 vCPU / 4GB RAM):**
- ~$30–35/month for the server
- ~$10–20/month for storage (gp3 SSD)
- ~$40–55/month total — but this does not include the hidden cost of engineering time for maintenance

---

**Option B: Amazon RDS / Aurora (Fully Managed)**

RDS is AWS's managed database service. AWS handles software updates, backups, failover, monitoring, and security patches. You just connect to it and use it.

| | RDS / Aurora (Managed) |
|---|---|
| **Pro** | Automated daily backups with point-in-time recovery |
| **Pro** | Automatic failover to a standby replica if primary fails (Multi-AZ) |
| **Pro** | OS and PostgreSQL patches applied automatically during maintenance windows |
| **Pro** | Aurora Serverless scales compute up/down based on actual load |
| **Pro** | Built-in performance monitoring (Enhanced Monitoring, Performance Insights) |
| **Con** | More expensive than an equivalent EC2 instance (~30–40% premium) |
| **Con** | Less flexibility for advanced custom PostgreSQL configurations |
| **Con** | You cannot SSH into the database server |
| **Best for** | SaaS products where reliability and low maintenance overhead matter more than cost minimisation |

**Estimated RDS cost (db.t3.medium, Multi-AZ off, 100GB storage):**
- ~$50–70/month (single AZ, dev/staging)
- ~$100–130/month (Multi-AZ, production with automatic failover)

**Estimated Aurora Serverless v2 cost (2 ACU average, 100GB storage):**
- ~$60–90/month at moderate load — scales automatically during Fireflies sync bursts

---

**Recommendation for MarketingWiz:** RDS or Aurora. The platform serves paying agencies — downtime and data loss are not acceptable risks. The extra ~$30/month over EC2 is easily justified by automated backups, failover, and zero maintenance overhead.

---

## 2. Email — Why the Platform Needs It & Which Service to Use

### Why email matters for MarketingWiz

Right now, the only way a team member knows they have been assigned a ticket, had a ticket sent back for revisions, or are approaching a deadline is if they are actively logged into the platform. There is no email notification system.

For a task management platform serving professional marketing agencies, this is a significant gap. People check email constantly; they do not leave SaaS tools open all day.

Email is needed for:

- **Ticket assigned** — member receives an email when a ticket is assigned and approved for them
- **Revisions requested** — member receives the admin's change note by email, not just as an in-app badge
- **Deadline approaching** — automated reminder 2 days before a ticket is due
- **Transcript processed** — admin notified when AI ticket generation completes for a firm
- **Weekly digest** — admin receives a summary of overdue tickets and team workload

### Amazon SES vs Mailgun — The Two Leading Options

There are two serious contenders for transactional email at this scale: **Amazon SES** and **Mailgun**. Here is an honest comparison.

---

**Amazon SES (Simple Email Service)**

AWS's own email sending service. Deeply integrated with the rest of the AWS ecosystem.

| | Amazon SES |
|---|---|
| **Cost** | $0.10 per 1,000 emails — essentially free at typical SaaS volumes |
| **Deliverability** | Excellent — AWS IP reputation is maintained by Amazon |
| **Setup complexity** | Moderate — requires domain verification, DKIM/SPF setup, and moving out of the "sandbox" mode (AWS approval required for production sending) |
| **Bounce/complaint handling** | Via SNS (another AWS service) — needs some configuration |
| **Analytics/dashboard** | Basic — open rates and click tracking require additional setup |
| **Support** | AWS standard support (paid tiers for faster response) |
| **Best for** | High-volume sending, AWS-native stacks, cost-conscious teams |
| **Limitation** | The sandbox mode restriction (you can only send to verified emails until AWS approves your account for production) can delay launch by 1–2 days |

**Estimated SES cost for MarketingWiz:**
- 10,000 emails/month → **$1.00/month**
- 100,000 emails/month → **$10.00/month**
- Practically negligible at this platform's scale

---

**Mailgun**

A dedicated email delivery platform with a developer-friendly API and richer out-of-the-box features.

| | Mailgun |
|---|---|
| **Cost** | Free tier: 1,000 emails/month for 3 months, then $35/month (Flex plan, pay-as-you-go: $0.80/1,000) or $15/month (Foundation: 10k emails included) |
| **Deliverability** | Excellent — Mailgun has dedicated IP warm-up and reputation management |
| **Setup complexity** | Lower — clean dashboard, straightforward domain verification, no sandbox approval process |
| **Bounce/complaint handling** | Built-in — automatic suppression lists, easy webhook setup |
| **Analytics/dashboard** | Rich — open rates, click tracking, delivery logs, real-time event stream out of the box |
| **Support** | Email support on all paid plans; chat on higher tiers |
| **Best for** | Teams that want faster setup, richer email analytics, and are not locked into AWS |
| **Limitation** | At higher volumes, more expensive than SES |

**Estimated Mailgun cost for MarketingWiz:**
- 10,000 emails/month → **$0.80–$15/month** (depending on plan)
- 100,000 emails/month → **$80/month** (vs $10 on SES)

---

**Side-by-Side Comparison**

| Factor | Amazon SES | Mailgun |
|---|---|---|
| Cost at 10k emails/month | ~$1 | ~$15 |
| Cost at 100k emails/month | ~$10 | ~$80 |
| Setup time | 1–2 days (sandbox approval) | Half a day |
| Dashboard & analytics | Basic | Rich |
| AWS ecosystem fit | Native | Requires separate account/API key |
| Deliverability | Excellent | Excellent |
| Bounce/complaint handling | Manual setup via SNS | Automatic, built-in |
| Ideal if you are… | Cost-focused, already on AWS | Speed-to-launch focused, want analytics |

**Recommendation for MarketingWiz:**

- **Short term (launch):** Mailgun — faster to set up, no sandbox approval friction, better visibility into delivery during the early weeks when you want to monitor everything.
- **Long term (scale):** Amazon SES — once volume grows, the cost difference becomes meaningful. At 500k emails/month, SES saves ~$350/month over Mailgun.

Both services integrate with the backend in exactly the same way (HTTP API call from `email.service.ts`) — switching between them later is a one-day change.

---

## 3. File Storage — Why Transcripts Should Not Live in the Database

### The current situation

Every meeting transcript synced from Fireflies is stored as a block of raw text directly inside the database. A one-hour meeting transcript is roughly 80–200KB. With multiple agencies each running daily meetings:

- 10 agencies × 1 meeting/day × 30 days = 300 transcripts
- At 150KB average = **~45MB of raw text in the database per month**
- At 100 agencies after a year = potentially **several gigabytes of text data** sitting inside the database

This slows down unrelated queries because the database has to load and index rows that carry large text payloads. It also means there is no way to attach other types of files — PDFs, brand guides, client briefs — to tickets or agencies.

### The solution: Amazon S3

**Amazon S3 (Simple Storage Service)** is AWS's object storage service. It is designed specifically for storing files of any size at low cost, with extremely high durability (99.999999999% — "eleven nines").

Instead of storing transcript text in the database, the platform would:

1. Upload the transcript text to S3 as a file (e.g. `transcripts/2026/04/09/{id}.txt`)
2. Store only the file reference (a short path) in the database
3. When the AI processes the transcript, it fetches the text from S3 rather than the database

This keeps the database lean and fast, and it unlocks file attachment capabilities across the platform.

### What S3 enables for MarketingWiz

| Capability | Benefit |
|---|---|
| Store transcript text as files | Database stays fast — no multi-hundred-KB rows |
| Accept PDF/DOCX transcript uploads | Agencies can upload manually recorded transcripts, not just Fireflies syncs |
| Ticket file attachments | Team members can attach reference files, mockups, brand guides to tickets |
| Firm asset storage | Agency logos, brand documents stored per-firm |
| Automated archiving | Transcripts older than 90 days automatically moved to cheaper "Glacier" storage (~$0.004/GB/month vs $0.023/GB standard) |
| Audit log exports | Admins can export ticket history to CSV — file generated and available for download |

### S3 Cost

S3 pricing is straightforward:

| Storage tier | Cost per GB/month | Use case |
|---|---|---|
| S3 Standard | $0.023 | Active transcripts (last 90 days) |
| S3 Glacier Instant Retrieval | $0.004 | Archived transcripts (90+ days old) |
| Data transfer out | $0.09/GB | Downloads (presigned URL access) |

**Estimated S3 cost for MarketingWiz:**
- 50 agencies, 6 months of transcripts (~10GB total): **~$0.23/month**
- 200 agencies, 2 years of transcripts (~100GB, mostly archived): **~$2.30/month standard + Glacier savings**

S3 costs are essentially negligible for this platform's data volumes. The value is in the architectural cleanness and the file attachment capabilities it unlocks — not in any meaningful cost saving over database storage.

---

## 4. Full Picture — AWS Services, Costs & Trade-offs

### Recommended AWS Setup for MarketingWiz

| Layer | Service | Purpose | Est. Monthly Cost |
|---|---|---|---|
| Database | Amazon Aurora PostgreSQL (Serverless v2) | Core data store — tickets, firms, users, transcripts | $60–130 |
| Email | Amazon SES (or Mailgun short-term) | Transactional email notifications | $1–10 |
| File storage | Amazon S3 | Transcript files, ticket attachments, exports | $1–5 |
| Backend hosting | Amazon ECS Fargate or EC2 | Runs the Express API | $30–60 |
| Frontend hosting | S3 + CloudFront | Serves the React app globally via CDN | $5–15 |
| **Total** | | | **~$97–220/month** |

Compare this to Supabase at scale:

| Scale | Supabase | AWS (estimated) |
|---|---|---|
| Early (< 20 agencies) | $25/month (Pro) | $97–130/month — AWS is more expensive here |
| Growth (20–100 agencies) | $599/month (Team) | $130–180/month — AWS is significantly cheaper |
| Scale (100+ agencies) | $599+ or custom pricing | $180–220/month — AWS is far cheaper |

> **Note:** Supabase is the right choice to stay on while the platform is early-stage. The migration to AWS makes financial sense once the platform moves past ~20–30 active agencies, or when enterprise clients begin requiring compliance documentation.

### What Does Not Change When Moving to AWS

This is important for the client to understand: moving to AWS does not mean rewriting the application.

- The React frontend stays exactly the same
- All API endpoints stay exactly the same
- The database schema (all 17 migrations) ports directly to RDS/Aurora — zero changes
- Team members and admins experience no difference in the interface
- The Fireflies sync, AI ticket generation, and full 10-stage ticket workflow all continue to work identically

The move is a infrastructure change, not a product change. The application code changes are confined to configuration files and two or three service files in the backend.

---

## 5. Recommended Phasing

Rather than switching everything at once, the migration should happen in stages — each one independently valuable:

| Phase | What Changes | Business Value | Effort |
|---|---|---|---|
| **Phase 1** | Add email via Mailgun or SES | Members receive email alerts for assigned/revised tickets — immediate UX improvement | Low (3–5 days) |
| **Phase 2** | Add S3 for new transcript storage | New transcripts stored as files; database stays lean; file uploads unlocked | Medium (1 week) |
| **Phase 3** | Move database to Amazon RDS/Aurora | Full AWS data ownership, compliance-ready, automated backups, better uptime SLA | High (2–3 weeks including testing) |
| **Phase 4** | Move hosting to ECS + CloudFront | Full AWS-native stack; CDN for frontend; container-based deployments | Medium (1 week) |

Phase 1 alone delivers real user value with minimal risk or cost. Phases 3 and 4 are the bigger infrastructure moves that make sense when the platform is approaching enterprise clients or significant agency scale.

---

## Summary

AWS is not necessary today — Supabase works well for an early-stage platform. But three specific gaps exist right now that AWS addresses directly:

1. **No email notifications** — Amazon SES or Mailgun solves this immediately, for almost no cost
2. **Transcript text stored in the database** — Amazon S3 cleans this up and unlocks file attachments as a product feature
3. **Long-term database scalability and compliance** — Amazon RDS/Aurora gives the platform the infrastructure credibility to sell to enterprise agencies

The migration is phased, low-risk, and does not require rewriting the product. It is an infrastructure evolution that happens underneath a platform that continues to work for its users without interruption.
