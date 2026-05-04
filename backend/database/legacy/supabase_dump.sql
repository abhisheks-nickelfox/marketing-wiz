--
-- PostgreSQL database dump
--

\restrict ZwF4Q5IsngzmfmYZt474KbHmqg75eSl0nOA3aYDeOeEs8TZFNr0zalFE8v34dQs

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Ubuntu 17.9-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_role() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.users WHERE id = auth.uid()::uuid;
$$;


--
-- Name: update_org_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_org_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_time_logs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_time_logs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_name text,
    contact_email text,
    default_prompt_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    location text,
    website_url text,
    logo_url text,
    contact_role text,
    contact_phone text,
    account_manager_id uuid,
    website text,
    description text,
    CONSTRAINT firms_contact_email_format CHECK (((contact_email IS NULL) OR (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    ticket_id uuid,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: processing_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transcript_id uuid NOT NULL,
    firm_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    text_notes text,
    ai_raw_output jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workflow_status text DEFAULT 'todo'::text NOT NULL,
    start_date date,
    end_date date,
    priority text DEFAULT 'medium'::text NOT NULL,
    type text,
    CONSTRAINT projects_dates_ordered CHECK (((start_date IS NULL) OR (end_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT projects_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text]))),
    CONSTRAINT projects_workflow_status_check CHECK ((workflow_status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'in_review'::text, 'approved'::text, 'completed'::text])))
);


--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    system_prompt text NOT NULL,
    is_active boolean DEFAULT true,
    firm_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prompts_type_check CHECK ((type = ANY (ARRAY['pm'::text, 'campaigns'::text, 'content'::text, 'custom'::text])))
);


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    color text
);


--
-- Name: task_type_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_type_members (
    task_type_id uuid NOT NULL,
    user_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    firm_id uuid NOT NULL,
    assignee_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    change_note text DEFAULT ''::text NOT NULL,
    estimated_hours numeric(5,2),
    ai_generated boolean DEFAULT true,
    edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deadline date,
    regeneration_count integer DEFAULT 0 NOT NULL,
    last_regenerated_at timestamp with time zone,
    archived boolean DEFAULT false NOT NULL,
    revision_count integer DEFAULT 0 NOT NULL,
    project_id uuid,
    task_type_id uuid,
    CONSTRAINT tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tickets_regeneration_count_non_negative CHECK ((regeneration_count >= 0)),
    CONSTRAINT tickets_session_ai_generated_consistent CHECK ((((session_id IS NULL) AND (ai_generated = false)) OR ((session_id IS NOT NULL) AND (ai_generated = true)))),
    CONSTRAINT tickets_status_check CHECK ((status = ANY (ARRAY['to_do'::text, 'assigned'::text, 'in_progress'::text, 'revisions'::text, 'internal_review'::text, 'client_review'::text, 'completed'::text, 'blocked'::text]))),
    CONSTRAINT tickets_type_check CHECK ((type = ANY (ARRAY['task'::text, 'design'::text, 'development'::text, 'account_management'::text])))
);


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    hours numeric(5,2) NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    log_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    revision_cycle integer DEFAULT 0 NOT NULL,
    CONSTRAINT time_logs_log_type_check CHECK ((log_type = ANY (ARRAY['estimate'::text, 'partial'::text, 'final'::text, 'revision'::text, 'transition'::text])))
);


--
-- Name: transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fireflies_id text NOT NULL,
    title text NOT NULL,
    call_date timestamp with time zone NOT NULL,
    duration_sec integer,
    participants jsonb DEFAULT '[]'::jsonb,
    raw_transcript text DEFAULT ''::text NOT NULL,
    firm_id uuid,
    archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    fetched_at timestamp with time zone
);


--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_skills (
    user_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    experience text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    member_role text,
    status text DEFAULT 'Active'::text NOT NULL,
    first_name text,
    last_name text,
    phone_number text,
    avatar_url text,
    invite_nonce text,
    rate_amount numeric(10,2),
    rate_frequency text,
    CONSTRAINT users_rate_frequency_check CHECK ((rate_frequency = ANY (ARRAY['Hourly'::text, 'Daily'::text, 'Weekly'::text, 'Monthly'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text, 'project_manager'::text]))),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'invited'::text, 'Disabled'::text])))
);


--
-- Name: v_firm_ticket_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_firm_ticket_stats WITH (security_invoker='true') AS
 SELECT f.id AS firm_id,
    f.name AS firm_name,
    f.contact_name,
    f.contact_email,
    f.created_at AS firm_created_at,
    count(DISTINCT t.id) AS total_tickets,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'draft'::text)) AS draft_count,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'approved'::text)) AS approved_count,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'resolved'::text)) AS resolved_count,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'discarded'::text)) AS discarded_count,
    COALESCE(sum(tl_agg.total_hours), (0)::numeric) AS total_hours_spent,
    max(t.created_at) AS last_ticket_at
   FROM ((public.firms f
     LEFT JOIN public.tickets t ON ((t.firm_id = f.id)))
     LEFT JOIN ( SELECT tl.ticket_id,
            sum(tl.hours) AS total_hours
           FROM (public.time_logs tl
             JOIN public.tickets t2 ON ((t2.id = tl.ticket_id)))
          WHERE (t2.status <> 'discarded'::text)
          GROUP BY tl.ticket_id) tl_agg ON ((tl_agg.ticket_id = t.id)))
  GROUP BY f.id, f.name, f.contact_name, f.contact_email, f.created_at;


--
-- Name: v_team_workload; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_team_workload WITH (security_invoker='true') AS
 SELECT u.id AS user_id,
    u.name,
    u.email,
    count(DISTINCT t.id) AS total_assigned,
    count(DISTINCT t.id) FILTER (WHERE (t.status = ANY (ARRAY['assigned'::text, 'in_progress'::text, 'revisions'::text]))) AS active_tickets,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'completed'::text)) AS resolved_tickets,
    count(DISTINCT t.id) FILTER (WHERE (t.status = 'to_do'::text)) AS draft_tickets,
    COALESCE(tl_agg.total_hours, (0)::numeric) AS total_hours_logged
   FROM ((public.users u
     LEFT JOIN public.tickets t ON (((t.assignee_id = u.id) AND (t.archived = false))))
     LEFT JOIN ( SELECT time_logs.user_id,
            sum(time_logs.hours) AS total_hours
           FROM public.time_logs
          WHERE (time_logs.log_type <> ALL (ARRAY['final'::text, 'revision'::text, 'transition'::text]))
          GROUP BY time_logs.user_id) tl_agg ON ((tl_agg.user_id = u.id)))
  WHERE (u.role = ANY (ARRAY['member'::text, 'project_manager'::text]))
  GROUP BY u.id, u.name, u.email, tl_agg.total_hours;


--
-- Name: v_tickets_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_tickets_full WITH (security_invoker='true') AS
 SELECT t.id,
    t.session_id,
    t.firm_id,
    t.assignee_id,
    t.project_id,
    t.title,
    t.description,
    t.type,
    t.priority,
    t.status,
    t.change_note,
    t.estimated_hours,
    t.ai_generated,
    t.edited,
    t.archived,
    t.revision_count,
    t.created_at,
    t.updated_at,
    t.deadline,
    t.regeneration_count,
    t.last_regenerated_at,
    f.name AS firm_name,
    p.name AS project_name,
    u.id AS assignee_user_id,
    u.name AS assignee_name,
    u.email AS assignee_email,
    COALESCE(agg.total_hours, (0)::numeric) AS total_hours_spent,
    COALESCE(agg.log_count, (0)::bigint) AS time_log_count
   FROM ((((public.tickets t
     LEFT JOIN public.firms f ON ((f.id = t.firm_id)))
     LEFT JOIN public.projects p ON ((p.id = t.project_id)))
     LEFT JOIN public.users u ON ((u.id = t.assignee_id)))
     LEFT JOIN ( SELECT time_logs.ticket_id,
            sum(time_logs.hours) AS total_hours,
            count(*) AS log_count
           FROM public.time_logs
          WHERE (time_logs.log_type <> ALL (ARRAY['final'::text, 'revision'::text, 'transition'::text]))
          GROUP BY time_logs.ticket_id) agg ON ((agg.ticket_id = t.id)));


--
-- Data for Name: firms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.firms (id, name, contact_name, contact_email, default_prompt_id, created_at, location, website_url, logo_url, contact_role, contact_phone, account_manager_id, website, description) FROM stdin;
aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	Acme Marketing Co.	Jane Smith	jane.smith@acmemarketing.com	\N	2026-03-26 11:10:20.248301+00	\N	\N	\N	\N	\N	\N	\N	\N
cc1a9d4a-057e-4c65-8689-27e034c53dcf	Bright Horizon Agency	Carlos Rivera	c.rivera@brighthorizon.agency	\N	2026-03-26 11:10:20.248301+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000031	Acme Corp	Jane Smith	jane@acmecorp.com	00000000-0000-0000-0000-000000000021	2025-12-06 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000032	Globex Ltd	Carlos Rivera	c.rivera@globex.com	00000000-0000-0000-0000-000000000022	2025-12-16 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000033	Stark Ent	Tony Stark	t.stark@starkent.com	00000000-0000-0000-0000-000000000021	2025-12-21 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000034	Nexus Digital	Priya Mehta	p.mehta@nexusdigital.io	00000000-0000-0000-0000-000000000022	2026-01-05 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000035	Lumina Tech	Chris Park	c.park@luminatech.com	00000000-0000-0000-0000-000000000023	2026-01-15 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000036	Evergreen Retail	Sam Greenfield	s.green@evergreen.com	00000000-0000-0000-0000-000000000023	2026-01-30 17:34:36.425223+00	\N	\N	\N	\N	\N	\N	\N	\N
3b6cadf5-c0ab-43a6-9b8d-695428d84c1e	canda	8755465950	abhisheksharma@nickelfox.com	\N	2026-03-27 07:32:52.669541+00	\N	\N	\N	\N	\N	\N	\N	\N
83d35c52-5b83-45d5-9251-e0a27831560f	NIckelfox	abhishek sharma	abhisheksharma@nickelfox.com	\N	2026-04-30 11:05:07.951238+00	london	\N	data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0MCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMCA0NEMzMS4wNDU3IDQ0IDQwIDM1LjA0NTcgNDAgMjRDNDAgMTIuOTU0MyAzMS4wNDU3IDQgMjAgNEM4Ljk1NDI4IDQgMCAxMi45NTQzIDAgMjRDMCAzNS4wNDU3IDguOTU0MjggNDQgMjAgNDRaTTI2LjIzOTMgMTMuMzE2OEMyNi41NDMgMTIuMjM4MSAyNS40OTYxIDExLjYwMDEgMjQuNTQgMTIuMjgxM0wxMS4xOTMxIDIxLjc4OTZDMTAuMTU2MiAyMi41MjgzIDEwLjMxOTMgMjQgMTEuNDM4MSAyNEgxNC45NTI3VjIzLjk3MjhIMjEuODAyNUwxNi4yMjEyIDI1Ljk0MjFMMTMuNzYwNyAzNC42ODMyQzEzLjQ1NyAzNS43NjIgMTQuNTAzOCAzNi4zOTk5IDE1LjQ2IDM1LjcxODdMMjguODA2OSAyNi4yMTA1QzI5Ljg0MzggMjUuNDcxOCAyOS42ODA2IDI0IDI4LjU2MTkgMjRIMjMuMjMyMUwyNi4yMzkzIDEzLjMxNjhaIiBmaWxsPSIjMTU1RUVGIi8+Cjwvc3ZnPgo=	amketing manger	+918755465950	\N	nickelfox.com	a tech company
2ea591a3-4087-4a66-99ab-cde2fa0f4ff4	netmirror	abhishek sharma	abhisheksharma@nickelfox.com	\N	2026-04-30 12:41:53.875443+00	Newyork	\N	data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAZxJREFUeAG9VG1OwkAQnWnapD/xBuUGeARvYCXRkMpHT2A4gXoC8QQFoRCN2HACrsAN5AbUf00qO86WUhH6FTS+ZGnZmX19O292EWI4jlfhRwWK4du26WcFUf6MxrM24bqH5QgBFOhcX10MUgmlMk2nFQEsQdCgmAzb8sNh8FG1bftAqQp6rIrJmlb9rohv6E4l6S3oFbnOPxT/x1DzgqlGoYj+q59gcHw7mxiVqVAaper0ru0NRLyJeFWa78yvRs9v7UyFkTJc9/l1SYIeoQjSKAE9x3Fm6Vv+hVFHmyJ3MR6/nu/Pq3AE4t6dC1Bq7ot3KkKRxEopdF2v5kw8Y5eMX2sEdG9dmoufCgPwSecG5cJGtZAgbg3EJImQHA3AGA49k9192JI1G4f1VWT/cLDLyw3kwkYjbo0tkNAm2LRKHlmy5Vaj3g8DPAkBq3IQrM92kyzLXCgCz+R5zyPbbDlG3OlRt3O9QAOCfVJ+VKEA/3SW04zKA+dt1vk+ZuU8TaYdha9LKAEuDhuL3VbD7GNeYnSm9RK3ePB923wBzGLBu89ypTIAAAAASUVORK5CYII=	Marketing manger	+918754448974	\N	newyork.com	the new yoork compnay is know for the best chracter of the life stage never gona happne
3f450d26-b209-4af4-8bdb-a2f32ad051a3	Microsofti	microsoft	abhisheksharma@nickelfox.com	\N	2026-05-04 10:44:09.14838+00	Hyderabad	\N	data:image/jpeg;base64,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3hXmkNljKedHwL2xbob/ADvP+Toj38AxJFHUzO1XjOH5QFUBm1DoMugxersRFQmcNfXHYgJYI8n0e3gRZPsDHvvPho7j/jwVN2y63Mcmg2qk+pNRBJqjSKLS61o6HDZG5AS46JRBnK3nl/Kl6bgp9KYYO0GHL5U605CVfAQyhffef0eL/IRc99h/1tQkRIDk3P0cEkYS6tQlky2ZHkZ7bz/saE+21Iqhi6y6AmP0bcFjr8hHfamyfcGfbecVCyDqv5LtIEXqEsnGR8qHfFLV4eOw4UgmiRshvjDHmu1NrFuiz53mNMilwbNY2d59lPbgvHMdponjUwLz0x6vjirFz9jp3qdKuZ3O87JoKoDNocOFLVze870ibZ6H5PTaFaXJzOXR9SnwXFz6W8W5EBDqtRwtUyRd6HntQEwJccj36b1jrEXsnBpwDSMnZv2q4GYVGYIxp5PM+aLbNHDKTw1KQyzpsC2etY9CpWi+tGfXHZCWDGoLx3Jl0PfezPLAeXt2hWA8i9/lSe6g2XqVxlxdQeC7PsQ1eFN2DRFgeh61D8hDm+77XCmD9rY9t7jLK4AHKsW7v3XE2okVlGD6XpFcWfI0utG+j0zpy4GESE2knJeC1w+VRRHNuuq0ZkEM7T6ikpVK4rs22TgqvqN4cd8cAqcVqcaXZoPA/ctpHBwG/VwqOUrYCcSgA8MmDuL03YCwBn1oHKhApvJSgnjmUw8qv33Orh0pOJ5sdtaG6QTY+Gh57U2l3VwGrwq4xmhfU/5vrH1bitRyakF0tluTo7WGESI0UNvs4VDCVzeJ0xUDYhNwPZ/GEsTeZGO8VJmdTysKYtObw5abXR6QfuVZzF0xOPxvwBpwVhSsjHW2c2frTlFQiQnjhLatVjKLDt39sd/9NS0fnrVrJ6IPP4U5cFkSE8MFYMavimVC8sVR8Z470MD/AAcOyuCB0XqaX6fnF6l+Rj0alrFmqO+zGQLmyV10gnljSZyNju+KiuLXqqxb/wCHAwXevL+6YsOfx0DgPL468obopiu//g3/AP/aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888880oos0A4gcgsk8088888888888888888888888888YEsg0w044wYE4c88888888888888888888888888888cMcEQMcc88888888888888888888888888888888sM8888sQ8888888888888888888888888888888E88888888c88888888888888888888888888888E88888888888088888888888888888888888888k888888888888U88888888888888888888888884c888c088EY888s88888888888888888888888888888Y8c880o888s0888888888888888888888888s8888M888MM8888U8888888888888888888888884888888888888880888888888888888888888888sc8w8888888o88s88888888888888888888888888c848w4A048k88E88888888888888888888888888sQk8888888s808888888888888888888888888888M8888888888c888888888888888888888888888M88888888888Y08888888888888888888888888o8888M884k088808888888888888888888888888w888E8o8k88088M88888888888888888888888888888s8c8M448888888888888888888888888888888808M888s8808o8888888888888888888888888w88Q88888888c888888888888888888888888888888I0888888c88c88888888888888888888888888088o88888Ac8oU88888888888888888888888888I88skw0sAc88k8888888888888888888888888888488sM00c80E8888888888888888888888888888888Ywww80os8888888888888888888888888888888888MsM8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAFBEBAAAAAAAAAAAAAAAAAAAAoP/aAAgBAwEBPxBIH//EABQRAQAAAAAAAAAAAAAAAAAAAKD/2gAIAQIBAT8QSB//xAAsEAEAAQMCBAYCAwEBAQAAAAABEQAhMUFRIGFxgVCRobHB8DDREEDhYPGg/9oACAEBAAE/EP8A4fUtHnXquT2K99APdrGw6Cs518vil5LuvijRXSg1ewv3W99nWuW+utfZ/quW+utbX2dadHuL906q60Dw3cfFYzp4fFGauor20B9mvRcnuVNo8/GFgvRZta5vu86gFDaB/dBArQT5V6176Pvit3cyPYp2I5lWadFPu0rS6GtGugfFK580Pilc+epf7XrS2foc6+r/ADX1f5r6B81FjztAY9TQGO5L4rUL1HxQ89Uf3XrxA+aF6gHuVAzN5PdqUxNq+xtT1/UKGxI1zPrai/ilvcGTDQIBqXH+9q66D3/8pZj1A8n91iFzPimr8FWwShNHnRfFR+WKkMp51ylRd63HxWKXcP8AVHe3AHU1oFA0Lj/O9Wfy4NPFUEhB61ZwdljyxUBCmge5FE9e/dQUEHMNDf3uQ0+o5fCsGOnzKb0HSPzRkHYNfGBak+A/VOh5/wClff8A0r6/6Uln7HKvnAfqn3wJSKUdf90+p5vam8W5UA1noHzQa3+mlM9f/ZUtBXQvdmsOOyx5YoAICPHc1DZ5VyHlXKVylcpXKVylcpXKVyHlUNnlWP8Ah+UDGXpWBDdnuawDrp9ijUCiGE7/AKV7GJ7lSFkak9tXUoaCH1/4Yzssy/5UP9aBwetRywdX2YoaAYBBx8uuE1PI5xbyaBQH0+R+KCpI5CE7f8CxRoBK9qkj3m/d/VBx3QfllbDAsOjR6EtA9LXtQz49CKG+wu8qjkifUWOX9GxvYluh85p2QXjRNx1PHJyLIPK+l9KKiSAf08+hccm5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	Marketing manger	+918755465950	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	nickelfox.com	this the best compnay i have ever visit
cc736c0e-c4d3-4700-a331-62752af08389	NIckelfoxerer	canda	mukul.k@nickelfox.com	\N	2026-05-04 10:50:22.445202+00	london	\N	data:image/jpeg;base64,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3hXmkNljKedHwL2xbob/ADvP+Toj38AxJFHUzO1XjOH5QFUBm1DoMugxersRFQmcNfXHYgJYI8n0e3gRZPsDHvvPho7j/jwVN2y63Mcmg2qk+pNRBJqjSKLS61o6HDZG5AS46JRBnK3nl/Kl6bgp9KYYO0GHL5U605CVfAQyhffef0eL/IRc99h/1tQkRIDk3P0cEkYS6tQlky2ZHkZ7bz/saE+21Iqhi6y6AmP0bcFjr8hHfamyfcGfbecVCyDqv5LtIEXqEsnGR8qHfFLV4eOw4UgmiRshvjDHmu1NrFuiz53mNMilwbNY2d59lPbgvHMdponjUwLz0x6vjirFz9jp3qdKuZ3O87JoKoDNocOFLVze870ibZ6H5PTaFaXJzOXR9SnwXFz6W8W5EBDqtRwtUyRd6HntQEwJccj36b1jrEXsnBpwDSMnZv2q4GYVGYIxp5PM+aLbNHDKTw1KQyzpsC2etY9CpWi+tGfXHZCWDGoLx3Jl0PfezPLAeXt2hWA8i9/lSe6g2XqVxlxdQeC7PsQ1eFN2DRFgeh61D8hDm+77XCmD9rY9t7jLK4AHKsW7v3XE2okVlGD6XpFcWfI0utG+j0zpy4GESE2knJeC1w+VRRHNuuq0ZkEM7T6ikpVK4rs22TgqvqN4cd8cAqcVqcaXZoPA/ctpHBwG/VwqOUrYCcSgA8MmDuL03YCwBn1oHKhApvJSgnjmUw8qv33Orh0pOJ5sdtaG6QTY+Gh57U2l3VwGrwq4xmhfU/5vrH1bitRyakF0tluTo7WGESI0UNvs4VDCVzeJ0xUDYhNwPZ/GEsTeZGO8VJmdTysKYtObw5abXR6QfuVZzF0xOPxvwBpwVhSsjHW2c2frTlFQiQnjhLatVjKLDt39sd/9NS0fnrVrJ6IPP4U5cFkSE8MFYMavimVC8sVR8Z470MD/AAcOyuCB0XqaX6fnF6l+Rj0alrFmqO+zGQLmyV10gnljSZyNju+KiuLXqqxb/wCHAwXevL+6YsOfx0DgPL468obopiu//g3/AP/aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888880oos0A4gcgsk8088888888888888888888888888YEsg0w044wYE4c88888888888888888888888888888cMcEQMcc88888888888888888888888888888888sM8888sQ8888888888888888888888888888888E88888888c88888888888888888888888888888E88888888888088888888888888888888888888k888888888888U88888888888888888888888884c888c088EY888s88888888888888888888888888888Y8c880o888s0888888888888888888888888s8888M888MM8888U8888888888888888888888884888888888888880888888888888888888888888sc8w8888888o88s88888888888888888888888888c848w4A048k88E88888888888888888888888888sQk8888888s808888888888888888888888888888M8888888888c888888888888888888888888888M88888888888Y08888888888888888888888888o8888M884k088808888888888888888888888888w888E8o8k88088M88888888888888888888888888888s8c8M448888888888888888888888888888888808M888s8808o8888888888888888888888888w88Q88888888c888888888888888888888888888888I0888888c88c88888888888888888888888888088o88888Ac8oU88888888888888888888888888I88skw0sAc88k8888888888888888888888888888488sM00c80E8888888888888888888888888888888Ywww80os8888888888888888888888888888888888MsM8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAFBEBAAAAAAAAAAAAAAAAAAAAoP/aAAgBAwEBPxBIH//EABQRAQAAAAAAAAAAAAAAAAAAAKD/2gAIAQIBAT8QSB//xAAsEAEAAQMCBAYCAwEBAQAAAAABEQAhMUFRIGFxgVCRobHB8DDREEDhYPGg/9oACAEBAAE/EP8A4fUtHnXquT2K99APdrGw6Cs518vil5LuvijRXSg1ewv3W99nWuW+utfZ/quW+utbX2dadHuL906q60Dw3cfFYzp4fFGauor20B9mvRcnuVNo8/GFgvRZta5vu86gFDaB/dBArQT5V6176Pvit3cyPYp2I5lWadFPu0rS6GtGugfFK580Pilc+epf7XrS2foc6+r/ADX1f5r6B81FjztAY9TQGO5L4rUL1HxQ89Uf3XrxA+aF6gHuVAzN5PdqUxNq+xtT1/UKGxI1zPrai/ilvcGTDQIBqXH+9q66D3/8pZj1A8n91iFzPimr8FWwShNHnRfFR+WKkMp51ylRd63HxWKXcP8AVHe3AHU1oFA0Lj/O9Wfy4NPFUEhB61ZwdljyxUBCmge5FE9e/dQUEHMNDf3uQ0+o5fCsGOnzKb0HSPzRkHYNfGBak+A/VOh5/wClff8A0r6/6Uln7HKvnAfqn3wJSKUdf90+p5vam8W5UA1noHzQa3+mlM9f/ZUtBXQvdmsOOyx5YoAICPHc1DZ5VyHlXKVylcpXKVylcpXKVyHlUNnlWP8Ah+UDGXpWBDdnuawDrp9ijUCiGE7/AKV7GJ7lSFkak9tXUoaCH1/4Yzssy/5UP9aBwetRywdX2YoaAYBBx8uuE1PI5xbyaBQH0+R+KCpI5CE7f8CxRoBK9qkj3m/d/VBx3QfllbDAsOjR6EtA9LXtQz49CKG+wu8qjkifUWOX9GxvYluh85p2QXjRNx1PHJyLIPK+l9KKiSAf08+hccm5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	Marketing manger	+918755495952	36e92bea-b422-405f-ab41-8325a934866f	nickelfox.com	dsdnjef
e10b5f71-776a-42df-92e2-7403cc9e7212	NIckelfoxreer	canda	abhisheksharma@nickelfox.com	\N	2026-05-04 10:55:54.086338+00	london	\N	data:image/jpeg;base64,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3hXmkNljKedHwL2xbob/ADvP+Toj38AxJFHUzO1XjOH5QFUBm1DoMugxersRFQmcNfXHYgJYI8n0e3gRZPsDHvvPho7j/jwVN2y63Mcmg2qk+pNRBJqjSKLS61o6HDZG5AS46JRBnK3nl/Kl6bgp9KYYO0GHL5U605CVfAQyhffef0eL/IRc99h/1tQkRIDk3P0cEkYS6tQlky2ZHkZ7bz/saE+21Iqhi6y6AmP0bcFjr8hHfamyfcGfbecVCyDqv5LtIEXqEsnGR8qHfFLV4eOw4UgmiRshvjDHmu1NrFuiz53mNMilwbNY2d59lPbgvHMdponjUwLz0x6vjirFz9jp3qdKuZ3O87JoKoDNocOFLVze870ibZ6H5PTaFaXJzOXR9SnwXFz6W8W5EBDqtRwtUyRd6HntQEwJccj36b1jrEXsnBpwDSMnZv2q4GYVGYIxp5PM+aLbNHDKTw1KQyzpsC2etY9CpWi+tGfXHZCWDGoLx3Jl0PfezPLAeXt2hWA8i9/lSe6g2XqVxlxdQeC7PsQ1eFN2DRFgeh61D8hDm+77XCmD9rY9t7jLK4AHKsW7v3XE2okVlGD6XpFcWfI0utG+j0zpy4GESE2knJeC1w+VRRHNuuq0ZkEM7T6ikpVK4rs22TgqvqN4cd8cAqcVqcaXZoPA/ctpHBwG/VwqOUrYCcSgA8MmDuL03YCwBn1oHKhApvJSgnjmUw8qv33Orh0pOJ5sdtaG6QTY+Gh57U2l3VwGrwq4xmhfU/5vrH1bitRyakF0tluTo7WGESI0UNvs4VDCVzeJ0xUDYhNwPZ/GEsTeZGO8VJmdTysKYtObw5abXR6QfuVZzF0xOPxvwBpwVhSsjHW2c2frTlFQiQnjhLatVjKLDt39sd/9NS0fnrVrJ6IPP4U5cFkSE8MFYMavimVC8sVR8Z470MD/AAcOyuCB0XqaX6fnF6l+Rj0alrFmqO+zGQLmyV10gnljSZyNju+KiuLXqqxb/wCHAwXevL+6YsOfx0DgPL468obopiu//g3/AP/aAAwDAQACAAMAAAAQ888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888880oos0A4gcgsk8088888888888888888888888888YEsg0w044wYE4c88888888888888888888888888888cMcEQMcc88888888888888888888888888888888sM8888sQ8888888888888888888888888888888E88888888c88888888888888888888888888888E88888888888088888888888888888888888888k888888888888U88888888888888888888888884c888c088EY888s88888888888888888888888888888Y8c880o888s0888888888888888888888888s8888M888MM8888U8888888888888888888888884888888888888880888888888888888888888888sc8w8888888o88s88888888888888888888888888c848w4A048k88E88888888888888888888888888sQk8888888s808888888888888888888888888888M8888888888c888888888888888888888888888M88888888888Y08888888888888888888888888o8888M884k088808888888888888888888888888w888E8o8k88088M88888888888888888888888888888s8c8M448888888888888888888888888888888808M888s8808o8888888888888888888888888w88Q88888888c888888888888888888888888888888I0888888c88c88888888888888888888888888088o88888Ac8oU88888888888888888888888888I88skw0sAc88k8888888888888888888888888888488sM00c80E8888888888888888888888888888888Ywww80os8888888888888888888888888888888888MsM8888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888/8QAFBEBAAAAAAAAAAAAAAAAAAAAoP/aAAgBAwEBPxBIH//EABQRAQAAAAAAAAAAAAAAAAAAAKD/2gAIAQIBAT8QSB//xAAsEAEAAQMCBAYCAwEBAQAAAAABEQAhMUFRIGFxgVCRobHB8DDREEDhYPGg/9oACAEBAAE/EP8A4fUtHnXquT2K99APdrGw6Cs518vil5LuvijRXSg1ewv3W99nWuW+utfZ/quW+utbX2dadHuL906q60Dw3cfFYzp4fFGauor20B9mvRcnuVNo8/GFgvRZta5vu86gFDaB/dBArQT5V6176Pvit3cyPYp2I5lWadFPu0rS6GtGugfFK580Pilc+epf7XrS2foc6+r/ADX1f5r6B81FjztAY9TQGO5L4rUL1HxQ89Uf3XrxA+aF6gHuVAzN5PdqUxNq+xtT1/UKGxI1zPrai/ilvcGTDQIBqXH+9q66D3/8pZj1A8n91iFzPimr8FWwShNHnRfFR+WKkMp51ylRd63HxWKXcP8AVHe3AHU1oFA0Lj/O9Wfy4NPFUEhB61ZwdljyxUBCmge5FE9e/dQUEHMNDf3uQ0+o5fCsGOnzKb0HSPzRkHYNfGBak+A/VOh5/wClff8A0r6/6Uln7HKvnAfqn3wJSKUdf90+p5vam8W5UA1noHzQa3+mlM9f/ZUtBXQvdmsOOyx5YoAICPHc1DZ5VyHlXKVylcpXKVylcpXKVyHlUNnlWP8Ah+UDGXpWBDdnuawDrp9ijUCiGE7/AKV7GJ7lSFkak9tXUoaCH1/4Yzssy/5UP9aBwetRywdX2YoaAYBBx8uuE1PI5xbyaBQH0+R+KCpI5CE7f8CxRoBK9qkj3m/d/VBx3QfllbDAsOjR6EtA9LXtQz49CKG+wu8qjkifUWOX9GxvYluh85p2QXjRNx1PHJyLIPK+l9KKiSAf08+hccm5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	amketing manger	+917894562632	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	nickelfox.com	remove
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, ticket_id, read, created_at) FROM stdin;
2d67cdd2-4136-4307-aae4-9fea09ead557	00000000-0000-0000-0000-000000000011	New ticket assigned	Optimize Campaign Targeting	67271298-0219-4cca-afa2-d91036baad70	t	2026-04-01 12:27:06.028144+00
4d9dca2f-4a4b-459f-92f2-9d018aa85c21	00000000-0000-0000-0000-000000000011	New ticket assigned	Arrange Additional QA Support	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	t	2026-04-06 07:02:39.037416+00
f4262574-367d-4112-974d-cecb2840259b	00000000-0000-0000-0000-000000000011	New ticket assigned	Add Heatmaps for Landing Page Insights	7247f5aa-f63a-4449-8b85-f7ad5d0ee94f	t	2026-04-06 06:15:25.114747+00
b565b6f7-6437-4b14-bc48-6e4f8271cc92	00000000-0000-0000-0000-000000000011	New ticket assigned	Assign Project Tasks	ff26d6b8-a2be-45e0-a265-49bd889835b1	t	2026-04-01 09:26:51.561401+00
c61f9582-c4cc-43b3-8f7b-ca1f788704d9	00000000-0000-0000-0000-000000000011	New ticket assigned	Develop Retargeting Campaign Content	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	t	2026-04-01 12:14:05.505477+00
b9498fc0-9772-4bdf-ba71-695434cd9dc7	00000000-0000-0000-0000-000000000011	New ticket assigned	Develop Retargeting Campaign Content	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	t	2026-04-01 12:14:31.804706+00
c13d8b1f-4ef8-4715-93c0-62961232b51c	00000000-0000-0000-0000-000000000011	New ticket assigned	Arrange Additional QA Support	a5c36882-491e-4475-9e57-08637656f6e8	t	2026-04-06 06:13:48.166124+00
676ad237-df11-4774-9518-df882d8c0ff8	00000000-0000-0000-0000-000000000011	New ticket assigned	Complete Testing and Finalize Features	f80db768-a9f9-4b3d-84aa-9fe55769934a	t	2026-04-06 06:59:57.895008+00
04f5b581-8325-42ac-9923-6c2b72c49ecb	00000000-0000-0000-0000-000000000012	New ticket assigned	Monitor and Communicate Timeline Changes	b08a0a74-bbd3-46dc-b9a1-f64934b1a176	f	2026-04-06 10:43:44.500556+00
6a6fb9d2-3053-451d-8d62-1db4ed30a9bc	00000000-0000-0000-0000-000000000011	New ticket assigned	Create content assets	40d7a986-dcb1-4d32-bd35-7c50003bc5a9	t	2026-04-06 10:51:34.821634+00
21ef317a-c467-41c3-986b-e1396b4f19cf	00000000-0000-0000-0000-000000000011	New ticket assigned	Prepare Retargeting Campaign Content	531aad1a-2b3d-4592-bfb6-67b7d2d1fccc	t	2026-04-06 10:30:01.032498+00
c35c31d7-e2ad-4b5d-8dc9-381c7fefc557	00000000-0000-0000-0000-000000000011	New ticket assigned	Update	dc4a1904-7a9e-4bb3-b447-05d93c25310d	t	2026-04-06 07:39:43.264025+00
e5b2d03e-7023-4ad0-9624-7e71911b5e41	00000000-0000-0000-0000-000000000011	New ticket assigned	Implement Tracking and Content Updates for Campaigns	59cbb16b-0de5-46e4-a769-ae00869e2bac	f	2026-04-06 11:46:56.662343+00
275aa9d8-47ab-4e81-8957-c5c3dbff456e	00000000-0000-0000-0000-000000000011	New ticket assigned	Prepare Retargeting Campaign	70a4ac0e-0352-4d58-9a2b-a0ff334c4e4a	f	2026-04-06 11:48:29.843441+00
dcb18c4f-ef7f-4982-b15c-0022c4651469	00000000-0000-0000-0000-000000000011	New ticket assigned	Ensure Consistent Brand Tone	0cb17ea0-b535-4a0c-be89-a78b697d1e5d	f	2026-04-06 11:49:11.519144+00
9ab38f0e-74eb-4d73-8ff5-5d8fae43cd78	00000000-0000-0000-0000-000000000011	New ticket assigned	Prioritize Content Approval	c8c53536-8906-455c-a0e8-ead78be8f188	f	2026-04-06 11:50:05.383662+00
4381fdd3-d3fd-41d7-8eb5-52771e8c9ebf	00000000-0000-0000-0000-000000000011	New ticket assigned	rohan calling12	8a01f979-55d2-4fe4-9eb5-d3280931c25c	f	2026-04-06 11:57:37.490215+00
a8309849-b006-46a5-8be0-da00487cdc5f	00000000-0000-0000-0000-000000000011	New ticket assigned	Refine Landing Page Messaging	9ea6a90e-1e64-4817-b578-90fcf741a531	f	2026-04-06 12:22:00.480196+00
29035610-0442-4253-b25c-4af8bf945192	00000000-0000-0000-0000-000000000011	New ticket assigned	Notify of Tracking Requirement Changes	c158f398-8999-479d-ba1b-dc51af76d6f5	f	2026-04-06 12:25:30.402053+00
36652796-1b81-47f3-9834-d4f844a152a4	00000000-0000-0000-0000-000000000011	New ticket assigned	Review Call Transcript	7f8a2073-2add-4027-9632-6a2618f3fc8c	t	2026-04-06 12:31:45.79666+00
8ddad9fd-8599-44e5-a240-cc762232147b	00000000-0000-0000-0000-000000000011	New ticket assigned	Create Project Plan	d280bebb-ce44-4039-8a89-09b7060c1ffd	t	2026-04-06 12:29:13.831922+00
46e5c1e4-45fa-4c69-9d0c-f83833f5ff1f	00000000-0000-0000-0000-000000000011	New ticket assigned	Share Revised Content for Approval	e8c7e1e1-4938-4515-99bb-35a82a5c5f92	t	2026-04-06 12:28:06.445283+00
28289a7c-308d-4398-b149-04a9282ffeb6	00000000-0000-0000-0000-000000000011	New ticket assigned	Write Equipment Line Strategy	981d58c2-e2e9-46b5-94fb-7e6a7316858d	f	2026-04-06 13:02:01.973565+00
44e8b02d-4e5f-4dab-9235-5da590fb30aa	00000000-0000-0000-0000-000000000011	New ticket assigned	Review Client Call Transcript	b7216b1c-c50d-41f1-a140-a6d778336c9c	f	2026-04-06 14:20:30.929902+00
d11edbdd-13f4-4fe3-acfe-21ee64d98a7d	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to abhishekshawrma@nickelfox.com (abhishekshawrma@nickelfox.com)	\N	f	2026-04-23 14:03:49.150471+00
56ee959f-fcb4-446b-80b9-6e3637ade206	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to abhishekshawrma@nickelfox.com (abhishekshawrma@nickelfox.com)	\N	f	2026-04-23 14:03:49.150471+00
28b3faed-92f7-4018-b31a-173921c09a6b	00000000-0000-0000-0000-000000000001	Profile updated	An admin has updated your profile information.	\N	t	2026-04-23 14:14:09.762163+00
cc8cf7a9-2118-43b8-923b-462e69922b2d	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to abhishekwins369@gmail.com (abhishekwins369@gmail.com)	\N	f	2026-04-27 06:48:03.890792+00
4ebd49e7-1569-4c67-9c87-a05702ffc571	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to abhishekwins369@gmail.com (abhishekwins369@gmail.com)	\N	f	2026-04-27 06:48:03.890792+00
6af521c6-32be-443a-8693-df4592c13575	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to abhishekwins369@gmail.com (abhishekwins369@gmail.com)	\N	f	2026-04-27 06:48:03.890792+00
78cd1f96-180c-4570-997e-b8ef4c16cf89	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-27 09:31:44.563723+00
467589b5-6d7f-4cd5-ad4c-7734f8f68101	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	t	2026-04-27 09:31:44.563723+00
11ccf1d8-3033-4f76-a8a8-4b4d9d44d209	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to abhishekwins369@gmail.com (abhishekwins369@gmail.com)	\N	t	2026-04-27 06:48:03.890792+00
6ccccae2-0239-4714-861a-a83e6c91b3be	00000000-0000-0000-0000-000000000001	Skills updated	Your skill set has been updated by an admin.	\N	t	2026-04-23 14:14:09.705043+00
f01ec540-0dcc-4cdc-82f7-aa56ce8dde73	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to abhishekshawrma@nickelfox.com (abhishekshawrma@nickelfox.com)	\N	t	2026-04-23 14:03:49.150471+00
21f961f9-f736-4365-aeb6-8a5d1994342b	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-27 09:31:44.563723+00
03d602b4-846b-4abd-9975-4d30e32d0f1e	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-27 09:31:44.563723+00
49089916-42fb-4311-8e15-10a3af55fe69	116b3e45-ae86-47a0-9af6-980b95a99233	New skill request	abhishek sharma requested 1 new skill(s) during onboarding: react ui	\N	f	2026-04-27 09:34:07.445998+00
577ead8c-f080-4d0b-bedd-4eaaf490998e	13070258-4e0f-40ca-988c-30f578c8f743	New skill request	abhishek sharma requested 1 new skill(s) during onboarding: react ui	\N	f	2026-04-27 09:34:07.445998+00
fdfb6c7b-8cd5-4002-8427-db998b07e7a6	f48ddd55-60d6-4bec-8040-94fbecd18fd6	New skill request	abhishek sharma requested 1 new skill(s) during onboarding: react ui	\N	f	2026-04-27 09:34:07.445998+00
2d428b8f-6402-4cf5-b745-c7f7cdccae13	00000000-0000-0000-0000-000000000014	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 10:11:12.65292+00
29f4d9bb-9f42-4a97-ae6b-c0c178c8d4bc	00000000-0000-0000-0000-000000000014	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 10:11:22.848208+00
16dca1a2-1ef9-4996-b68b-8b5623b8fccd	dbc2a155-359a-4038-8a19-c0d9ac99acc0	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 11:16:23.642972+00
44c7336f-7f0c-4153-abc9-8193d78b969a	dbc2a155-359a-4038-8a19-c0d9ac99acc0	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	f	2026-04-27 11:16:24.114946+00
7336e88b-75f7-410c-b86b-154240125df0	00000000-0000-0000-0000-000000000001	New skill request	abhishek sharma requested 1 new skill(s) during onboarding: react ui	\N	t	2026-04-27 09:34:07.445998+00
ecefc7de-9fb5-4755-ac63-58cb33aa9d76	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to manishnickelfox14@yopmail.com (manishnickelfox14@yopmail.com)	\N	f	2026-04-27 13:03:44.385918+00
6c21fbbf-9b8a-458e-9d0b-7fdbdf8a2df1	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to manishnickelfox14@yopmail.com (manishnickelfox14@yopmail.com)	\N	f	2026-04-27 13:03:44.385918+00
86fc8927-d0a4-4cae-b05a-e78c357492b5	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to manishnickelfox14@yopmail.com (manishnickelfox14@yopmail.com)	\N	f	2026-04-27 13:03:44.385918+00
c8caff3f-406f-4160-a37e-8a30117eb4c0	4b119384-96ce-460a-98ec-a8a492971d42	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	f	2026-04-27 13:04:32.919366+00
8f237677-b738-4379-972e-3f126efe41bc	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	t	2026-04-27 13:04:32.778564+00
9e785aa8-9905-4a09-aa34-5aeeaade48ba	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:03.023276+00
0191b87c-d958-413b-a794-593c9518ad8a	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:03.843099+00
ed47a49a-1e59-42a2-91c0-1d7097c3fe92	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:04.500726+00
85643a8e-14ba-4046-8995-15ec71cd267a	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:05.293983+00
c09cca55-68ed-4174-821c-4d46ff7a8610	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:06.20847+00
3591494f-8cfe-4475-aeeb-78736b3bcef4	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:07.053713+00
ca13adc2-73be-48f4-9928-f01644b77fba	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:10.538327+00
ed5c7188-2be2-44fd-b754-8e166b777e13	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:40:57.331952+00
695ba836-9d02-4a6c-889e-aa0f575eb8a5	4b119384-96ce-460a-98ec-a8a492971d42	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:40:57.326006+00
7d800ab2-791e-4e19-aa8e-e9890d7b4f16	4b119384-96ce-460a-98ec-a8a492971d42	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:41:20.552565+00
03f6291b-f28e-4ca0-88c4-b7d07a384abb	4b119384-96ce-460a-98ec-a8a492971d42	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:41:20.568559+00
df5dcdcb-e098-4ef6-9354-9639eccc9e1f	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to gautam.vashistha@nickelfox.com (gautam.vashistha@nickelfox.com)	\N	f	2026-04-27 13:41:52.537922+00
8f03760b-133e-47bb-8695-fa412d8913c4	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to gautam.vashistha@nickelfox.com (gautam.vashistha@nickelfox.com)	\N	f	2026-04-27 13:41:52.537922+00
1ecdc0a7-d9f3-4289-89c0-557577acf509	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to gautam.vashistha@nickelfox.com (gautam.vashistha@nickelfox.com)	\N	f	2026-04-27 13:41:52.537922+00
d6acf4cc-d671-42a8-9489-b75e76cfadb5	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:43:18.839736+00
15e627ad-6d3f-4ff9-948b-186bb1ed401e	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	f	2026-04-27 13:43:19.030737+00
1b23eebf-c7eb-44b9-a6f8-824994db9526	116b3e45-ae86-47a0-9af6-980b95a99233	New skill request	Gautam V requested 1 new skill(s) during onboarding: PM	\N	f	2026-04-27 13:43:19.23285+00
f9a04906-7d50-48ba-9fcf-a3e5bb797d98	13070258-4e0f-40ca-988c-30f578c8f743	New skill request	Gautam V requested 1 new skill(s) during onboarding: PM	\N	f	2026-04-27 13:43:19.23285+00
7a4571c5-bf6e-432c-b6e3-1623b082474f	f48ddd55-60d6-4bec-8040-94fbecd18fd6	New skill request	Gautam V requested 1 new skill(s) during onboarding: PM	\N	f	2026-04-27 13:43:19.23285+00
81989f29-8fe5-4ed4-adb5-014f90186a72	00000000-0000-0000-0000-000000000001	New skill request	Gautam V requested 1 new skill(s) during onboarding: PM	\N	t	2026-04-27 13:43:19.23285+00
f318be8c-672e-4552-ba17-f1d3b3ff431d	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to gautam.vashistha@nickelfox.com (gautam.vashistha@nickelfox.com)	\N	t	2026-04-27 13:41:52.537922+00
ce02d56f-b892-40ae-a89c-0f0c1a7a2929	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to manishnickelfox14@yopmail.com (manishnickelfox14@yopmail.com)	\N	t	2026-04-27 13:03:44.385918+00
6a5ea079-2961-4126-83b4-6a86b260e19d	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:52:04.107474+00
df5540ed-b38f-4517-9c0e-65c46b2bbffc	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:52:06.451242+00
4859e897-7a18-4fc4-a0ce-1c252863b11e	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:52:18.523894+00
1c1600c9-18f7-45dc-8f12-baa1ea2efa2a	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:52:23.59985+00
d3ebba97-08b3-4692-8ea1-b2f30df83bea	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:53:18.558932+00
49dcd955-5ad4-4dc7-b2b8-e2333a4cf871	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:53:20.102551+00
b3254963-474c-46ad-8339-c433eea98254	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:53:20.115562+00
3a12895e-ad3a-4b10-83e4-d7c782bfc6d2	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:54:29.29051+00
42aa5da5-59cd-4a14-ade3-13d51727788d	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:54:29.330508+00
6d9d8cf9-64ee-4d96-95f3-55cfb3aeb3dd	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:54:34.929446+00
7eb85147-0bdf-4a9a-b18a-d1a968d719ec	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:54:34.944242+00
7728839c-b892-4a6e-b8a5-855ec1ddbce9	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-27 13:55:36.772841+00
a022125e-0596-4b13-93ec-073bad272bd6	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 13:55:36.780138+00
0fc54ea7-3891-42af-8064-86910f4fea26	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to chall@marketingwiz.co (chall@marketingwiz.co)	\N	f	2026-04-27 14:24:19.925098+00
fe7af8c0-f4fb-4f98-b169-a5435de7dd33	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to chall@marketingwiz.co (chall@marketingwiz.co)	\N	f	2026-04-27 14:24:19.925098+00
57797f2e-600d-484b-99fc-8a0ed6ac397c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to chall@marketingwiz.co (chall@marketingwiz.co)	\N	f	2026-04-27 14:24:19.925098+00
de2ec10d-66f0-4f46-9417-1c4a321b6a7f	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to chall@marketingwiz.co (chall@marketingwiz.co)	\N	f	2026-04-27 14:24:19.925098+00
a01cd177-2e8d-42a1-96ba-51bb8804aac7	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 14:27:41.668465+00
fade2760-e8a2-42d0-b542-9d5acf7d3b54	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	f	2026-04-27 14:27:43.632005+00
e30d5293-0664-4a82-8499-cc28828243e3	2e0315dd-60f2-44c4-909b-a78358468b86	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	t	2026-04-27 14:27:43.780127+00
58f69e8a-cd49-416a-a682-3e50270e3b94	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to manishnickelfox15@yopmail.com (manishnickelfox15@yopmail.com)	\N	t	2026-05-04 06:48:58.83272+00
e8a50d7f-4430-4e1c-a924-19bfed3a0cb3	2e0315dd-60f2-44c4-909b-a78358468b86	Skills updated	Your skill set has been updated by an admin.	\N	t	2026-04-27 14:35:07.746228+00
92c5ca51-61d8-4461-b3e5-9cf7a616a684	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	t	2026-04-27 14:35:07.806645+00
d8c60c65-54cd-482f-8b58-267cd0265795	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-28 07:05:48.804639+00
a5cd6b4d-49eb-467d-9e34-8bbbd2bea83d	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-28 07:05:48.804639+00
5f87a9d4-b0d4-4798-ae1d-fed20bddbfac	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-28 07:05:48.804639+00
e58a4a81-7120-4ae8-81df-0c8f16027c3d	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-28 07:05:48.804639+00
d5ebaea9-139c-4957-af01-6c9babb69a8b	2e0315dd-60f2-44c4-909b-a78358468b86	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-28 07:30:51.094132+00
efa9d853-69b3-4329-9052-8baab315a146	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	f	2026-04-28 07:30:51.248859+00
15214c34-3b0e-43a9-8fd1-60fbe894edfa	2e0315dd-60f2-44c4-909b-a78358468b86	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-28 07:33:02.834134+00
1e69bbdc-3bda-4ff0-9976-aff83ae6bfa7	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	f	2026-04-28 07:33:03.126833+00
dc9a7c8a-6622-4def-b039-1ad34b6b3909	2e0315dd-60f2-44c4-909b-a78358468b86	Skills updated	Your skill set has been updated by an admin.	\N	f	2026-04-28 07:33:07.050364+00
7645e574-c2da-4981-899f-c27aca677263	2e0315dd-60f2-44c4-909b-a78358468b86	Profile updated	An admin has updated your profile information.	\N	f	2026-04-28 07:33:07.080394+00
5ad88378-84f2-468e-92e8-47d3d18c66fa	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	t	2026-04-28 07:05:48.804639+00
a85027a6-1063-4956-abb2-1683d59b9839	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to chall@marketingwiz.co (chall@marketingwiz.co)	\N	t	2026-04-27 14:24:19.925098+00
8b15aac5-4c0a-4982-9425-64c159653210	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-30 05:51:34.758835+00
85b1d667-0e58-4efe-9acc-7d33d272a8ae	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-30 05:51:34.758835+00
495cd9ee-49e9-4737-a1d4-0e688cad6529	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-30 05:51:34.758835+00
005fa6b3-1c32-4831-b608-bc2c88e0404e	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-04-30 05:51:34.758835+00
ba289575-cac8-4d9a-95ed-a5ad1e02dcdb	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to manishnickelfox15@yopmail.com (manishnickelfox15@yopmail.com)	\N	f	2026-05-04 06:48:58.83272+00
30df2a84-e61a-4adb-9e22-8ddf620fa685	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to manishnickelfox15@yopmail.com (manishnickelfox15@yopmail.com)	\N	f	2026-05-04 06:48:58.83272+00
f086c676-8c09-40ab-ab3e-3f965f241b82	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to manishnickelfox15@yopmail.com (manishnickelfox15@yopmail.com)	\N	f	2026-05-04 06:48:58.83272+00
6c2b509d-52fc-4621-8a41-9a7cc9cefcfb	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to manishnickelfox15@yopmail.com (manishnickelfox15@yopmail.com)	\N	f	2026-05-04 06:48:58.83272+00
f5c2dd1c-a52f-4212-a1bf-bdac795ca495	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	t	2026-04-30 05:51:34.758835+00
c48bf7e5-3b0b-4c6b-9280-e06c2d572171	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	t	2026-05-04 06:52:13.471475+00
bc9f44ec-56a7-4f7f-a0ae-da26ac319171	9591be28-f262-425d-a5a7-7d7672160c3c	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	t	2026-05-04 06:52:13.427751+00
2e02c18c-1331-41bb-a65a-592a291a992a	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:01:52.775683+00
f1156725-7444-44fd-882d-a5b65fa8c14c	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:01:52.8164+00
f2a9f621-c7ac-40b8-9489-db652b2ef03d	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:01:52.911829+00
b9ec2dae-d29c-452d-920e-72d90a87cdd0	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:01:52.957787+00
1bc909b4-3e7c-44ce-a382-7f7389fa43be	9591be28-f262-425d-a5a7-7d7672160c3c	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:01:53.006978+00
6e7c8eed-8ac4-476b-96b8-81e98832fe2f	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to manishnickelfox16@yopmail.com (manishnickelfox16@yopmail.com)	\N	f	2026-05-04 07:23:07.07432+00
a943c947-95d1-4ac7-8cf9-a05a35c2fcef	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to manishnickelfox16@yopmail.com (manishnickelfox16@yopmail.com)	\N	f	2026-05-04 07:23:07.07432+00
6ee67a06-4ead-41e4-b8ed-ae5212c2a60d	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to manishnickelfox16@yopmail.com (manishnickelfox16@yopmail.com)	\N	f	2026-05-04 07:23:07.07432+00
32e1c7e3-cb47-4f4c-8c97-694d9aabc406	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to manishnickelfox16@yopmail.com (manishnickelfox16@yopmail.com)	\N	f	2026-05-04 07:23:07.07432+00
104d8f60-548c-48da-b123-66a756bd6f14	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to manishnickelfox16@yopmail.com (manishnickelfox16@yopmail.com)	\N	f	2026-05-04 07:23:07.07432+00
b028a472-b3ea-45bb-9f8d-48ab3c2d4a85	36e92bea-b422-405f-ab41-8325a934866f	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 07:24:49.475358+00
0d77678a-f131-40e7-a30b-3f1e04e48e03	36e92bea-b422-405f-ab41-8325a934866f	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	f	2026-05-04 07:24:49.674621+00
c8f1a9dc-0a16-46b4-b726-c0d123c189d5	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
a137263c-c2cf-4480-9b95-4b242e523ed3	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
06a224f5-9244-4393-9637-563932045340	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
d6d56b31-c659-41a9-b645-d76bdf984471	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
c65527eb-7bc9-446c-aeb2-4f65a3d4494d	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
2c7d94c5-00a4-45be-8fb8-ba2967c95b21	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to abhisheksharma@nickelfox.com (abhisheksharma@nickelfox.com)	\N	f	2026-05-04 07:59:16.212735+00
ee8076fd-fd17-461c-877a-9deef098f8e7	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Profile updated	An admin has updated your profile information.	\N	f	2026-05-04 08:00:16.359261+00
497a678a-a183-4d4c-b625-021a2377c213	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Welcome to the team!	Your account has been activated. You can now log in and get started.	\N	f	2026-05-04 08:00:16.788358+00
304e5478-e655-4788-b1b1-8dfa9e423e23	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.027+00
8658f78c-288e-47b9-8348-77a62feec5b9	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.028+00
c9fc7738-0469-4747-881a-e190bf2abf3e	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.028+00
ab6af183-0e18-4323-ad13-1f8904bb8787	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.028+00
62df05b5-0f0a-4cdb-b2da-967217fc33db	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.028+00
1e37a03a-cb79-4658-b161-6b566687dd01	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:09.028+00
55fb8c30-38be-4efe-b570-db72460a6238	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
03c88b36-b3eb-4358-90e1-9812de62bdd9	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
c6bdc7e6-74ad-46a6-85e9-594625201ea3	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
56b66e90-55f1-4759-a35a-9888c171da08	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
7b8e5210-54ae-4b6a-a1db-e6f91ab4bdcb	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
ad7a968f-9dd7-4864-ad80-3e9e591d17fd	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:09.054+00
10420979-7ddd-4504-957b-a9e4b2567fa5	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.185+00
20a8c674-7cb2-40cd-af77-6359ae982c03	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.186+00
021d52a0-2bdb-49f0-9e5c-29b8faa56205	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.186+00
5fb18df4-20a9-4181-be82-665274d334fd	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.186+00
3e2dd07d-c27c-4b62-ae60-b5be637a8a28	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.186+00
02fde8b2-594d-4d54-a267-644e2db09806	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:22.186+00
672319af-019c-424e-b95b-4668e9b4047a	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
a1b0256e-58c9-451c-9b9f-90e13ab3b545	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
53ada9b7-0eac-4fbd-975d-678f370e678d	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
5afeb7a5-8a9b-4a6f-96e6-7294b8c106ba	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
1543fd14-0121-44aa-90e8-b1691ac28308	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
0558ed02-10a3-4d7f-8fa9-72eb4c2e023a	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:22.197+00
67fd2657-f699-4611-bb53-08c2ffbf3234	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.232+00
84dd8694-d11b-4f6f-ba41-c96ace160cb3	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.233+00
07f74806-eb62-4d3d-a1ad-5b582174503c	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.233+00
125ea9fd-136e-4b46-95a3-8c1dd110faa3	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.233+00
323cd913-8fd5-46fe-9e73-7c6374fc1641	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.233+00
a452a6b7-8c3e-4ff6-98c0-bfe8a0c81ec0	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:40:50.233+00
b1eef9ca-ad7d-42fb-b77c-559b55648e31	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.249+00
ca1a36cf-4eb7-450c-b194-a9aa7c87868b	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.25+00
6fde2c0b-0cb0-46b0-80f4-6055b6f48154	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.25+00
ce1cc0c6-decf-4205-932b-9e31a3f1eab7	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.25+00
61bbbd6b-3ae3-4cb8-a7e8-bed266af61ed	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.25+00
9901db48-59be-4f30-b8ce-44638c2e035b	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:40:50.25+00
c6be7111-b020-4890-b60d-c19543bc3f10	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.319+00
34b890c0-52e0-4478-bfc7-c4b0cd989cd2	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.319+00
4225b7b8-c781-47fe-bfd0-98477a61f666	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.32+00
6441dd3a-d20c-4933-91cd-5839dbe73d34	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.32+00
cc2e2a8b-9657-46d9-a52c-a0c9e01b4a8c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.32+00
95a1b66f-cb90-432f-9bc7-1b565ba186b1	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:04.32+00
552bf6dc-d86f-41fa-b050-63a0d43a8e1d	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
3de641c1-2aa6-4ed6-963f-b8973d4bce84	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
21a1e2e8-fb61-4a24-b2e6-de4085d488f5	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
db2a2b6e-a7cb-4f89-9cf3-fc1631f8b524	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
262a15ac-2d6e-4943-a488-ec56519ee3a5	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
5246eb0e-277d-4e92-b0e1-3f2e93e2f99b	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:04.325+00
54cf130b-1371-4ac2-b847-c84320c9f63c	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
657afa73-52de-4ec1-9ead-7dc5a5f8adb4	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
b8284093-5cfd-49a6-896b-196fec317c72	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
560910cc-dc4e-4804-9707-38b8d055a882	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
4f7b5f13-de0b-4086-86b0-e806420563e7	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
ffb62967-eca6-4702-89dc-e6b05f88a9bc	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:22.924+00
738bdb80-65e6-4eb4-8697-892b21b36b67	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.748+00
c4385af5-6978-4e9f-9920-e6e7813af73a	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.749+00
4d7b2125-1df9-4a73-9ed6-117ca344bafb	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.749+00
e497876d-fd74-4a35-91f0-ed6ca9b57346	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.749+00
8e3bba9f-36f6-496f-8118-7b10191f1b39	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.749+00
08d5c8d5-2e2e-4669-9cea-3edc2c840eb7	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:35.749+00
cbb9c340-dcb2-4c2c-a6ad-5bc07e3b0e7e	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
1653683f-9994-4ab1-9e9c-e3ba74daf4fe	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
871c66fc-48e1-4756-8050-c11cb605b128	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
d6900d7f-4878-4d28-b448-af08d0f87398	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
43cd28b6-b926-453d-b583-73d1b4db69c7	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
02e6d7e4-46e5-468f-aaee-a7fa8b94e3e2	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:35.756+00
2daf4f05-b36d-42b3-b5b4-9e656281c0a3	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.991+00
944dffa0-07e1-4a26-b9ad-fe231ddb8c7e	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.991+00
26d0a364-d31d-4bd1-a95c-e0124f631934	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.992+00
b529a785-f26d-456a-80c9-b772aa626c6f	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.992+00
2e18b1c2-8db5-4c0d-a23a-902b4f4b9032	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.992+00
6d86f9ce-4203-41b2-91ac-a849c7e1385f	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:42:10.992+00
7eb499b7-1374-47b0-aac6-3fbc81a44a39	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
69074214-52d5-424d-8f29-af00898996c7	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
51c1c810-36f0-458c-9d0c-2ac26431ad8d	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
2b7366f7-7d9b-4a47-ae90-fa1d111a7ee5	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
2ff43bbe-00d0-4952-bb7a-96b6762b4211	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
af5a55d9-e7b6-4be5-ae7b-3c0e71cc8f68	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:22.861+00
a446d859-d5a6-4fb9-8f31-e8df43706899	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
d5bbf23b-ef76-4786-aedd-2d340782a513	00000000-0000-0000-0000-000000000001	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
a02c50fc-5ea7-49d9-bb3e-9735ff1dfe7d	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
e992890a-eca3-4ddb-a945-8d17feea716f	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
1aad2095-ca18-4769-9dae-c7739d4bdf9c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
95c3bc66-ad46-422c-a393-9b07acc66adf	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite sent to Alice Member (invited@example.com)	\N	f	2026-05-04 11:41:56.313+00
7e603c89-7776-4ecb-b863-ea270ecf19b2	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
2441e63d-118b-49c2-80c8-4687a2b7ff35	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
0f2d5233-a9f8-4ef7-8a03-bb53029726f4	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
5f242bcc-3db7-4444-9cc5-e158c708df18	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
32236b0e-6ea3-4b9b-8c73-8dc5e55fb886	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
fac8e42e-f332-4ced-b776-f240052364f3	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:42:11.01+00
ef15086f-284b-4506-ba4f-091b8dfdc218	116b3e45-ae86-47a0-9af6-980b95a99233	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
3ccb7e1c-0b6a-4e49-809e-0dcad593460b	00000000-0000-0000-0000-000000000001	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
ceb8930c-76f1-48ed-b317-bcb9ccd96723	13070258-4e0f-40ca-988c-30f578c8f743	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
8349e4e4-e80e-4dc5-8729-a36953ebb170	2e0315dd-60f2-44c4-909b-a78358468b86	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
4dcc1761-705b-4393-8cbe-456ffb2f0785	f48ddd55-60d6-4bec-8040-94fbecd18fd6	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
1e63fb75-e6d4-4fe0-a3cd-3cc5f8bba3e4	cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	Invite sent	Invite resent to Alice Member (alice@example.com)	\N	f	2026-05-04 11:41:56.329+00
\.


--
-- Data for Name: org_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_settings (id, logo_url, created_at, updated_at) FROM stdin;
10b35419-7e90-4234-989e-6960c1b917d9	data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0MCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMCA0NEMzMS4wNDU3IDQ0IDQwIDM1LjA0NTcgNDAgMjRDNDAgMTIuOTU0MyAzMS4wNDU3IDQgMjAgNEM4Ljk1NDI4IDQgMCAxMi45NTQzIDAgMjRDMCAzNS4wNDU3IDguOTU0MjggNDQgMjAgNDRaTTI2LjIzOTMgMTMuMzE2OEMyNi41NDMgMTIuMjM4MSAyNS40OTYxIDExLjYwMDEgMjQuNTQgMTIuMjgxM0wxMS4xOTMxIDIxLjc4OTZDMTAuMTU2MiAyMi41MjgzIDEwLjMxOTMgMjQgMTEuNDM4MSAyNEgxNC45NTI3VjIzLjk3MjhIMjEuODAyNUwxNi4yMjEyIDI1Ljk0MjFMMTMuNzYwNyAzNC42ODMyQzEzLjQ1NyAzNS43NjIgMTQuNTAzOCAzNi4zOTk5IDE1LjQ2IDM1LjcxODdMMjguODA2OSAyNi4yMTA1QzI5Ljg0MzggMjUuNDcxOCAyOS42ODA2IDI0IDI4LjU2MTkgMjRIMjMuMjMyMUwyNi4yMzkzIDEzLjMxNjhaIiBmaWxsPSIjMTU1RUVGIi8+Cjwvc3ZnPgo=	2026-04-30 07:27:34.681756+00	2026-04-30 09:14:07.245567+00
dba209d9-d958-4878-a4e2-fd0264b88954	data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0MCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMCA0NEMzMS4wNDU3IDQ0IDQwIDM1LjA0NTcgNDAgMjRDNDAgMTIuOTU0MyAzMS4wNDU3IDQgMjAgNEM4Ljk1NDI4IDQgMCAxMi45NTQzIDAgMjRDMCAzNS4wNDU3IDguOTU0MjggNDQgMjAgNDRaTTI2LjIzOTMgMTMuMzE2OEMyNi41NDMgMTIuMjM4MSAyNS40OTYxIDExLjYwMDEgMjQuNTQgMTIuMjgxM0wxMS4xOTMxIDIxLjc4OTZDMTAuMTU2MiAyMi41MjgzIDEwLjMxOTMgMjQgMTEuNDM4MSAyNEgxNC45NTI3VjIzLjk3MjhIMjEuODAyNUwxNi4yMjEyIDI1Ljk0MjFMMTMuNzYwNyAzNC42ODMyQzEzLjQ1NyAzNS43NjIgMTQuNTAzOCAzNi4zOTk5IDE1LjQ2IDM1LjcxODdMMjguODA2OSAyNi4yMTA1QzI5Ljg0MzggMjUuNDcxOCAyOS42ODA2IDI0IDI4LjU2MTkgMjRIMjMuMjMyMUwyNi4yMzkzIDEzLjMxNjhaIiBmaWxsPSIjMTU1RUVGIi8+Cjwvc3ZnPgo=	2026-04-30 07:34:09.278611+00	2026-04-30 09:05:16.435869+00
\.


--
-- Data for Name: processing_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processing_sessions (id, transcript_id, firm_id, prompt_id, text_notes, ai_raw_output, created_by, created_at) FROM stdin;
00000000-0000-0000-0000-000000000051	00000000-0000-0000-0000-000000000041	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000021	Q4 strategy call — focus on content refresh and paid media.	\N	00000000-0000-0000-0000-000000000001	2026-03-24 17:34:36.425223+00
00000000-0000-0000-0000-000000000052	00000000-0000-0000-0000-000000000043	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000023	November content calendar — blog posts, social, email.	\N	00000000-0000-0000-0000-000000000001	2026-03-22 17:34:36.425223+00
cbfedfc6-9d96-43d1-bb12-f2d51e2ef78b	00000000-0000-0000-0000-000000000042	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	add the process with ai	{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:31:28.639721+00
cc6704b3-e2fe-46ea-8293-90a0bf9e2052	cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	add in detail 	{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:33:33.76398+00
b0d9ff6d-8092-4f40-8816-8b8c58aa3db5	cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	00000000-0000-0000-0000-000000000031	eee2b904-881f-4093-aa49-4c83f2a80066		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:34:12.469374+00
a4110452-f507-4290-ac6e-29010ce368c6	cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	cc1a9d4a-057e-4c65-8689-27e034c53dcf	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:37:29.926551+00
fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Finalize the requirements document and make sure everything is tracked in jira", "priority": "normal", "description": "We need to finalize the requirements document and make sure everything is tracked in Jira."}, {"type": "account_management", "title": "The roadmap should be updated to reflect the new timeline by end of this week", "priority": "normal", "description": "The roadmap should be updated to reflect the new timeline by end of this week."}, {"type": "account_management", "title": "All tasks must be documented and tracked properly", "priority": "normal", "description": "All tasks must be documented and tracked properly."}, {"type": "task", "title": "We also need to set up the ci/cd pipeline for the new deployment", "priority": "normal", "description": "We also need to set up the CI/CD pipeline for the new deployment."}, {"type": "task", "title": "The kubernetes cluster needs to be configured for auto-scaling and the infras...", "priority": "normal", "description": "The Kubernetes cluster needs to be configured for auto-scaling and the infrastructure migration should be planned carefully."}, {"type": "design", "title": "On the frontend side, we need to redesign the dashboard ui and implement the ...", "priority": "normal", "description": "On the frontend side, we need to redesign the dashboard UI and implement the new design system components."}, {"type": "design", "title": "The bundle size should be optimized for better mobile performance", "priority": "normal", "description": "The bundle size should be optimized for better mobile performance."}, {"type": "development", "title": "For the backend, we need to refactor the authentication service to support oauth", "priority": "normal", "description": "For the backend, we need to refactor the authentication service to support OAuth."}, {"type": "development", "title": "Implement caching for the product catalog data to improve response times", "priority": "normal", "description": "We should implement caching for the product catalog data to improve response times."}, {"type": "development", "title": "The database optimization must be completed before launch, including proper i...", "priority": "normal", "description": "The database optimization must be completed before launch, including proper indexing."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:43:54.99548+00
2bfaf18d-01fc-47de-a099-4b008690a99a	98d84b26-d668-4d57-b687-041ba13759fd	00000000-0000-0000-0000-000000000036	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:47:18.299883+00
13c38a94-309f-4b52-b627-7b49d0678df4	cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000021		{"tickets": [{"type": "account_management", "title": "Finalize the requirements document and make sure everything is tracked in jira", "priority": "normal", "description": "We need to finalize the requirements document and make sure everything is tracked in Jira."}, {"type": "account_management", "title": "The roadmap should be updated to reflect the new timeline by end of this week", "priority": "normal", "description": "The roadmap should be updated to reflect the new timeline by end of this week."}, {"type": "account_management", "title": "All tasks must be documented and tracked properly", "priority": "normal", "description": "All tasks must be documented and tracked properly."}, {"type": "task", "title": "We also need to set up the ci/cd pipeline for the new deployment", "priority": "normal", "description": "We also need to set up the CI/CD pipeline for the new deployment."}, {"type": "task", "title": "The kubernetes cluster needs to be configured for auto-scaling and the infras...", "priority": "normal", "description": "The Kubernetes cluster needs to be configured for auto-scaling and the infrastructure migration should be planned carefully."}, {"type": "design", "title": "On the frontend side, we need to redesign the dashboard ui and implement the ...", "priority": "normal", "description": "On the frontend side, we need to redesign the dashboard UI and implement the new design system components."}, {"type": "design", "title": "The bundle size should be optimized for better mobile performance", "priority": "normal", "description": "The bundle size should be optimized for better mobile performance."}, {"type": "development", "title": "For the backend, we need to refactor the authentication service to support oauth", "priority": "normal", "description": "For the backend, we need to refactor the authentication service to support OAuth."}, {"type": "development", "title": "Implement caching for the product catalog data to improve response times", "priority": "normal", "description": "We should implement caching for the product catalog data to improve response times."}, {"type": "development", "title": "The database optimization must be completed before launch, including proper i...", "priority": "normal", "description": "The database optimization must be completed before launch, including proper indexing."}]}	00000000-0000-0000-0000-000000000001	2026-03-28 11:49:14.244055+00
adc5af23-c62c-430b-bbd4-fcff89de86e5	16d6911c-b383-481d-99f6-8ad4632d9b27	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-30 05:44:06.467837+00
434f3d74-e20e-4560-928b-172a5e6e8420	16d6911c-b383-481d-99f6-8ad4632d9b27	00000000-0000-0000-0000-000000000033	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-30 07:22:16.197038+00
309fff39-ce76-4295-8c91-39362846cecf	16d6911c-b383-481d-99f6-8ad4632d9b27	00000000-0000-0000-0000-000000000033	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	00000000-0000-0000-0000-000000000001	2026-03-30 08:19:14.362367+00
37bbd058-13fb-4d31-9e53-219deef33375	00000000-0000-0000-0000-000000000042	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	add mail to jodar	{"tickets": [{"type": "development", "title": "Add Mail to Jodar", "priority": "normal", "description": "Add mail functionality to Jodar as discussed in the client call"}]}	00000000-0000-0000-0000-000000000001	2026-03-30 08:43:50.271534+00
88c00963-5888-45e0-b86b-1b79437044ad	a8059fc9-e0bb-4414-a163-d839c327ed03	00000000-0000-0000-0000-000000000031	eee2b904-881f-4093-aa49-4c83f2a80066	Focus on all action items with owners and deadlines	{"tickets": [{"type": "task", "title": "Update Creative Brief", "priority": "high", "description": "Update the creative brief to include three video ads per platform and send to the design team"}, {"type": "design", "title": "Design Hero Banner", "priority": "high", "description": "Design the hero banner for the summer body transformation campaign"}, {"type": "design", "title": "Design Ad Creatives", "priority": "high", "description": "Design six static ads and three video ads for Facebook and Instagram"}, {"type": "task", "title": "Write Landing Page Copy", "priority": "high", "description": "Write the landing page copy for the summer body transformation campaign"}, {"type": "development", "title": "Develop Landing Page Testimonials Section", "priority": "normal", "description": "Develop a before and after section with customer testimonials on the landing page"}, {"type": "task", "title": "Review Landing Page Copy", "priority": "high", "description": "Review the landing page copy by April 7th"}, {"type": "design", "title": "Design HTML Email Templates", "priority": "normal", "description": "Design the HTML templates for the email sequence"}, {"type": "design", "title": "Design App Store Screenshots", "priority": "normal", "description": "Design the app store screenshots for the app relaunch"}, {"type": "task", "title": "Write Press Release", "priority": "high", "description": "Write the press release for the app relaunch by April 12th"}, {"type": "task", "title": "Update Media Plan", "priority": "high", "description": "Update the media plan to reflect the additional budget and send to Priya by end of the week"}, {"type": "development", "title": "Develop UTM Tracking Setup", "priority": "normal", "description": "Set up proper UTM parameters for all campaign links"}, {"type": "task", "title": "Write Equipment Line Strategy", "priority": "normal", "description": "Write the campaign strategy document for the gym equipment product line by end of April"}]}	00000000-0000-0000-0000-000000000001	2026-03-30 08:47:57.051083+00
0bd5f094-d626-4a73-8837-6de552c25c72	a8059fc9-e0bb-4414-a163-d839c327ed03	00000000-0000-0000-0000-000000000034	eee2b904-881f-4093-aa49-4c83f2a80066	Focus on all action items with owners and deadlines	{"tickets": [{"type": "task", "title": "Update Creative Brief", "priority": "high", "description": "Update the creative brief to include three video ads per platform and send to the design team"}, {"type": "design", "title": "Design Hero Banner", "priority": "high", "description": "Design the hero banner for the summer body transformation campaign"}, {"type": "design", "title": "Design Ad Creatives", "priority": "high", "description": "Design six static ads and three video ads for Facebook and Instagram"}, {"type": "development", "title": "Landing Page Development", "priority": "high", "description": "Develop the before and after section with customer testimonials on the landing page"}, {"type": "task", "title": "Write Landing Page Copy", "priority": "high", "description": "Write the landing page copy for the summer body transformation campaign"}, {"type": "task", "title": "Review Landing Page Copy", "priority": "high", "description": "Review the landing page copy by April 7th"}, {"type": "design", "title": "Design Email Templates", "priority": "normal", "description": "Design the HTML email templates for the app relaunch email sequence"}, {"type": "design", "title": "Design App Store Screenshots", "priority": "normal", "description": "Design the app store screenshots for the app relaunch"}, {"type": "task", "title": "Write Press Release", "priority": "high", "description": "Write the press release for the app relaunch by April 12th"}, {"type": "development", "title": "UTM Tracking Setup", "priority": "normal", "description": "Set up proper UTM parameters for all campaign links"}, {"type": "task", "title": "Update Media Plan", "priority": "high", "description": "Update the media plan to reflect the additional $15,000 budget and send to Priya by end of the week"}, {"type": "task", "title": "Campaign Strategy Document", "priority": "normal", "description": "Create a campaign strategy document for the gym equipment product line by end of April"}]}	00000000-0000-0000-0000-000000000001	2026-03-30 08:51:03.340646+00
187a1d57-2ae0-458c-8c82-31c05e07163e	a8059fc9-e0bb-4414-a163-d839c327ed03	00000000-0000-0000-0000-000000000034	cef47a45-c705-4db8-a1d5-63e57fd59ec0	Focus on all action items with owners and deadlines	{"tickets": [{"type": "task", "title": "Update Creative Brief for Summer Body Campaign", "priority": "high", "description": "Update the creative brief to include three video ads per platform and send to the design team"}, {"type": "design", "title": "Design Hero Banner for Summer Body Campaign", "priority": "high", "description": "Design the hero banner for the summer body campaign"}, {"type": "development", "title": "Develop Landing Page with Before and After Section", "priority": "high", "description": "Develop the landing page with a new before and after section with customer testimonials"}, {"type": "task", "title": "Write Landing Page Copy for Summer Body Campaign", "priority": "high", "description": "Write the landing page copy for the summer body campaign"}, {"type": "task", "title": "Review Landing Page Copy", "priority": "high", "description": "Review the landing page copy by April 7th"}, {"type": "design", "title": "Design Ad Creatives for Summer Body Campaign", "priority": "high", "description": "Design six static ads and three video ads per platform for the summer body campaign"}, {"type": "development", "title": "Develop Email Sequence for App Relaunch", "priority": "normal", "description": "Develop the email sequence for the app relaunch"}, {"type": "design", "title": "Design HTML Email Templates", "priority": "normal", "description": "Design the HTML email templates for the app relaunch email sequence"}, {"type": "design", "title": "Update App Store Screenshots", "priority": "normal", "description": "Update the app store screenshots"}, {"type": "task", "title": "Write Press Release for App Relaunch", "priority": "normal", "description": "Write the press release for the app relaunch by April 12th"}, {"type": "development", "title": "Set up UTM Tracking", "priority": "normal", "description": "Set up proper UTM parameters for all campaign links"}, {"type": "task", "title": "Update Media Plan", "priority": "normal", "description": "Update the media plan to reflect the additional budget and send to Priya by end of the week"}, {"type": "task", "title": "Write Campaign Strategy Document for Gym Equipment Product Line", "priority": "low", "description": "Write the campaign strategy document for the gym equipment product line by end of April"}, {"type": "task", "title": "Send Brand Tone of Voice Document", "priority": "normal", "description": "Send the brand tone of voice document to Sarah"}]}	00000000-0000-0000-0000-000000000001	2026-03-30 08:51:51.542461+00
d8c2c5f8-4c1c-4d05-8adc-6167c63c011c	f6b12bc8-1552-4cf4-a801-b168a0b912c5	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	fetch all the task related to pm and create one ticket only and these task mail to abhishek client	{"tickets": [{"type": "task", "title": "Coordinate with Backend Team for API Support", "priority": "high", "description": "Coordinate with the backend team to finalize the API for ticket duration and aggregation calculations, and ensure it is ready for integration with the Teams module updates. Also, mail the tasks to Abhishek client."}]}	00000000-0000-0000-0000-000000000001	2026-03-30 13:41:28.420652+00
1dd13722-6b2e-45f6-acca-8298e69820b0	93e75831-1973-4c26-aca0-09eac2ac2187	00000000-0000-0000-0000-000000000036	cef47a45-c705-4db8-a1d5-63e57fd59ec0	this information email to utkarsh 	{"tickets": [{"type": "task", "title": "Refine Landing Page Messaging", "priority": "high", "description": "Update the landing page messaging to better align with the ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval."}, {"type": "task", "title": "Share Revised Content for Approval", "priority": "urgent", "description": "Share the revised copies and headlines by tomorrow for client approval to avoid delays in the campaign."}, {"type": "task", "title": "Narrow Down Campaign Targeting", "priority": "normal", "description": "Use initial engagement data to narrow down the campaign targeting for better performance."}, {"type": "development", "title": "Add Heatmaps for Landing Page Insights", "priority": "normal", "description": "Include heatmaps to track user behavior on the landing pages for better insights and campaign optimization."}, {"type": "design", "title": "Prepare Retargeting Campaign Content", "priority": "normal", "description": "Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone."}, {"type": "account_management", "title": "Ensure Quick Content Approvals", "priority": "high", "description": "Prioritize approvals on the updated content to avoid delays in the campaign."}, {"type": "task", "title": "Notify of Tracking Requirement Changes", "priority": "low", "description": "Inform Abhishek in advance of any changes in tracking requirements to ensure smooth implementation."}, {"type": "task", "title": "Schedule Follow-up Meeting", "priority": "normal", "description": "Connect again after the updated content is live to review campaign performance and discuss next steps."}, {"type": "task", "title": "Email Utkarsh with Meeting Notes", "priority": "low", "description": "Send an email to Utkarsh with the meeting notes and action items for his reference."}]}	00000000-0000-0000-0000-000000000001	2026-03-30 13:48:32.959491+00
84e82088-1ebb-4a53-b1ac-9907fba93d01	f42423e8-0136-40ee-bdd8-19f1448cadd8	00000000-0000-0000-0000-000000000032	cef47a45-c705-4db8-a1d5-63e57fd59ec0	make atmost 5 ticket \n	{"tickets": [{"type": "development", "title": "Finalize Feature List", "priority": "high", "description": "Complete testing and finalize features by the end of the week to ensure a stable version for launch."}, {"type": "task", "title": "Arrange Additional QA Support", "priority": "normal", "description": "Provide one more QA resource for faster testing to support the development team."}, {"type": "task", "title": "Prepare Marketing Campaigns", "priority": "normal", "description": "Prepare pre-launch campaigns, including social media creatives and ad planning, but hold the final launch date confirmation."}, {"type": "account_management", "title": "Confirm Pricing and Key Features", "priority": "high", "description": "Finalize pricing and key features to highlight in marketing campaigns."}, {"type": "task", "title": "Monitor and Update Project Timeline", "priority": "normal", "description": "Keep communication tight and share updates if timelines shift to mitigate potential delays."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-30 14:12:49.886161+00
6f07891a-cdda-4571-9d0f-2ee43dcf9c25	8949fcde-9558-49d8-bde9-1b3dee35cf3b	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	cef47a45-c705-4db8-a1d5-63e57fd59ec0	i would max 5 tickets	{"tickets": [{"type": "task", "title": "Review Call Transcript", "priority": "normal", "description": "Review the call transcript to identify key discussion points and action items."}, {"type": "account_management", "title": "Follow Up with Craig", "priority": "normal", "description": "Follow up with Craig to confirm understanding of the discussion and action items."}, {"type": "task", "title": "Analyze Client Requirements", "priority": "high", "description": "Analyze the client's requirements and identify potential project deliverables."}, {"type": "task", "title": "Create Project Timeline", "priority": "high", "description": "Create a project timeline to outline key milestones and deadlines."}, {"type": "task", "title": "Assign Project Tasks", "priority": "normal", "description": "Assign project tasks to team members and set deadlines for completion."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-30 14:41:03.745054+00
a0d1daa1-7ccd-416a-96f9-18c7ef81e989	41ded39a-6ac7-49db-be5a-9371ab8761f4	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	make 2 tickets	{"tickets": [{"type": "task", "title": "Review Call Transcript", "priority": "normal", "description": "Review the client call transcript to identify key discussion points and action items. The transcript is brief and requires analysis to determine the client's needs. This task will help inform the project's next steps."}, {"type": "task", "title": "Create Project Plan", "priority": "high", "description": "Create a project plan based on the client's requirements and the information gathered from the call transcript. The plan should include deliverables, deadlines, and milestones. This task will help ensure the project stays on track and meets the client's expectations."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-30 14:53:20.74194+00
adfe03bc-1bff-4237-8ea9-cbbf9676ab18	41ded39a-6ac7-49db-be5a-9371ab8761f4	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-30 14:54:23.049184+00
c8083bf0-920b-4ca1-934a-4ff296b2480e	41ded39a-6ac7-49db-be5a-9371ab8761f4	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	hi	{"tickets": [{"type": "account_management", "title": "Review campaign brief", "priority": "normal", "description": "Review and finalise the campaign brief discussed on the call."}, {"type": "design", "title": "Create content assets", "priority": "high", "description": "Design and produce the content assets required for the upcoming campaign."}, {"type": "development", "title": "Set up tracking", "priority": "normal", "description": "Implement UTM parameters and analytics tracking for campaign links."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-30 14:54:51.831917+00
7161a043-06b5-40ce-b445-7da727c3ea97	93e75831-1973-4c26-aca0-09eac2ac2187	cc1a9d4a-057e-4c65-8689-27e034c53dcf	cef47a45-c705-4db8-a1d5-63e57fd59ec0	create 5 ticket 	{"tickets": [{"type": "task", "title": "Refine Landing Page Messaging", "priority": "high", "description": "Update the landing page messaging to better align with the ad creatives for improved conversion rates. Revised copies and headlines need to be shared with the client for approval by tomorrow."}, {"type": "development", "title": "Implement Heatmaps for Landing Pages", "priority": "normal", "description": "Add heatmaps to the landing pages to capture more detailed user behavior and provide better insights. This will help in understanding user interactions and optimizing the pages for better performance."}, {"type": "design", "title": "Develop Retargeting Campaign Content", "priority": "high", "description": "Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone. The content should be ready for review and approval as per the campaign timeline."}, {"type": "task", "title": "Optimize Campaign Targeting", "priority": "normal", "description": "Narrow down the campaign targeting based on initial engagement data to improve the campaign's effectiveness and conversion rates. This involves analyzing the data, identifying key audience segments, and adjusting the targeting parameters accordingly."}, {"type": "account_management", "title": "Ensure Timely Approvals and Tracking Updates", "priority": "urgent", "description": "Coordinate with the client to ensure quick approvals on updated content and notify the team about any changes in tracking requirements to avoid delays and implement changes smoothly."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-03-31 06:41:43.816206+00
f70987a7-2dde-46fa-9dc2-3a496c313595	f42423e8-0136-40ee-bdd8-19f1448cadd8	00000000-0000-0000-0000-000000000036	cef47a45-c705-4db8-a1d5-63e57fd59ec0	crate two ticket for PM	{"tickets": [{"type": "task", "title": "Arrange Additional QA Support", "priority": "high", "description": "Arrange one more QA resource for faster testing to support the development team in ensuring the quality of the product before release."}, {"type": "account_management", "title": "Monitor Project Timeline and Communicate Updates", "priority": "normal", "description": "Keep track of the project timeline and communicate any updates or changes to the team, especially regarding potential delays and their impact on marketing campaigns."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 06:11:45.131884+00
0dcfd0c5-d402-4786-9bd2-5149165c601b	f42423e8-0136-40ee-bdd8-19f1448cadd8	00000000-0000-0000-0000-000000000036	cef47a45-c705-4db8-a1d5-63e57fd59ec0	all the detail share with utkarsh and i need only 2 tickets 	{"tickets": [{"type": "development", "title": "Complete Testing and Finalize Features", "priority": "high", "description": "Complete the testing of the core features, including the payment gateway, and finalize the feature list by the end of the week to ensure a stable version for launch."}, {"type": "task", "title": "Arrange Additional QA Support", "priority": "normal", "description": "Arrange for an additional QA resource to support faster testing of the product features, especially the payment gateway, to ensure timely completion and quality."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 06:56:33.003811+00
acd8cfda-db83-48df-b2c2-ee9c569c8d26	8949fcde-9558-49d8-bde9-1b3dee35cf3b	cc1a9d4a-057e-4c65-8689-27e034c53dcf	cef47a45-c705-4db8-a1d5-63e57fd59ec0	genrate 2 tickets	{"tickets": [{"type": "task", "title": "Review Call Transcript", "priority": "normal", "description": "Review the client call transcript to identify key project management items and action points. The transcript includes discussions on project deliverables, deadlines, and potential blockers. Review is necessary to ensure all points are captured and addressed."}, {"type": "task", "title": "Create Project Action Plan", "priority": "high", "description": "Create a detailed project action plan based on the call transcript and additional notes. The plan should outline key tasks, responsibilities, and deadlines to ensure the project stays on track. This plan will serve as a guide for the project team."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 10:10:30.426327+00
ab691889-ab7d-4cb0-aab9-9bca276ad087	f42423e8-0136-40ee-bdd8-19f1448cadd8	00000000-0000-0000-0000-000000000035	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Complete Payment Gateway Testing", "priority": "high", "description": "Finish testing the payment gateway to ensure smooth functionality before the product launch. This involves thorough quality assurance to identify and fix any bugs in the checkout flow."}, {"type": "task", "title": "Arrange Additional QA Resource", "priority": "normal", "description": "Provide one more QA resource to support faster testing of the product, especially focusing on the payment gateway integration and checkout flow."}, {"type": "development", "title": "Finalize Feature List by End of Week", "priority": "high", "description": "Stabilize the product features by the end of the week to confirm the final list for marketing and launch preparations."}, {"type": "task", "title": "Prepare Marketing Campaigns", "priority": "normal", "description": "Continue preparing marketing campaigns, including social media creatives and ad plans, but hold off on final launch date confirmation until the product timeline is finalized."}, {"type": "account_management", "title": "Confirm Pricing and Key Features for Marketing", "priority": "normal", "description": "Finalize the pricing and key features of the product to provide to the marketing team for campaign alignment and messaging."}, {"type": "task", "title": "Monitor and Communicate Timeline Changes", "priority": "normal", "description": "Keep all stakeholders informed about any changes to the product launch timeline to ensure coordinated efforts and adjustments as necessary."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 10:42:34.488989+00
49487bb4-e6e5-4468-b3c5-f21fa14d1b86	f6b12bc8-1552-4cf4-a801-b168a0b912c5	00000000-0000-0000-0000-000000000033	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Implement Detailed Member Page", "priority": "high", "description": "Create a dedicated page for member details including profile info, assigned tickets, ticket status, and time duration spent, with consideration for scalability and structure."}, {"type": "development", "title": "Develop API for Ticket Aggregation and Duration Calculations", "priority": "high", "description": "Complete the API to support ticket aggregation and duration calculations for the detailed member page, ensuring backend support is coordinated."}, {"type": "development", "title": "Implement Role-Based Access Control (RBAC) for Member Details Page", "priority": "high", "description": "Ensure only users with the 'view_member_detail' permission can access the detailed member page, and implement a lower-level permission like 'view_team' for the inline expansion."}, {"type": "development", "title": "Manage State for Expanded Rows and Ensure Smooth Performance", "priority": "normal", "description": "Handle state for expanded rows while maintaining performance and ensuring navigation doesn’t break user context."}, {"type": "development", "title": "Implement Dynamic Routing for Detailed Page", "priority": "normal", "description": "Use dynamic routing like /member/:id for the detailed member page."}, {"type": "development", "title": "Add Skeleton Loaders for Better UX", "priority": "normal", "description": "Implement skeleton loaders for fetching ticket data to improve user experience."}, {"type": "development", "title": "Handle Edge Cases Like Users with No Tickets", "priority": "low", "description": "Display an empty state message like 'No tickets assigned' for users with no tickets."}, {"type": "design", "title": "Ensure Consistency with Existing Design System", "priority": "normal", "description": "Reuse components like cards and tables to maintain consistency with the existing design system."}, {"type": "development", "title": "Track User Activity on the Detailed Page", "priority": "normal", "description": "Log events like page visits and interactions to support analytics."}, {"type": "account_management", "title": "Coordinate with Backend Team for API Completion", "priority": "high", "description": "Work with the backend team to finalize the API for ticket duration and ensure integration is completed."}, {"type": "task", "title": "Review and Test Detailed Member Page", "priority": "high", "description": "Review the detailed member page for functionality, performance, and design consistency, and conduct testing to ensure it meets requirements."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 11:13:02.444609+00
7f17a698-327b-429f-9e48-c7db66937081	93e75831-1973-4c26-aca0-09eac2ac2187	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "task", "title": "Refine Landing Page Messaging", "priority": "high", "description": "Update the landing page messaging to better align with ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval."}, {"type": "task", "title": "Share Revised Content for Approval", "priority": "urgent", "description": "Share revised copies and headlines by tomorrow for client approval to avoid delays in the campaign."}, {"type": "task", "title": "Narrow Down Campaign Targeting", "priority": "normal", "description": "Use initial engagement data to narrow down the campaign targeting for better performance."}, {"type": "development", "title": "Add Heatmaps for Landing Page Insights", "priority": "normal", "description": "Include heatmaps to track user behavior on the landing pages for better insights and campaign optimization."}, {"type": "task", "title": "Prepare Retargeting Campaign", "priority": "normal", "description": "Plan a new campaign focused on retargeting users who visited but didn’t convert, with personalized and action-driven messaging."}, {"type": "design", "title": "Ensure Consistent Brand Tone", "priority": "normal", "description": "Make sure the tone of the retargeting campaign stays consistent with the brand."}, {"type": "account_management", "title": "Prioritize Content Approval", "priority": "high", "description": "Prioritize approvals on the updated content to avoid delays in the campaign."}, {"type": "task", "title": "Notify of Tracking Requirement Changes", "priority": "low", "description": "Notify the team of any changes in tracking requirements in advance to implement them smoothly."}, {"type": "task", "title": "Schedule Follow-up Meeting", "priority": "normal", "description": "Schedule a follow-up meeting after the updated content is live to review campaign performance."}]}	00000000-0000-0000-0000-000000000001	2026-04-06 11:17:52.3661+00
580154db-7074-40a4-864e-494cbb57c63d	41ded39a-6ac7-49db-be5a-9371ab8761f4	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0	create 4 tickets	{"tickets": [{"type": "task", "title": "Review Client Call Transcript", "priority": "normal", "description": "Review the client call transcript to identify key discussion points and action items. The transcript is brief and requires careful analysis to determine the client's needs. This task will help inform subsequent project management decisions."}, {"type": "task", "title": "Analyze Call Discussion Points", "priority": "high", "description": "Analyze the discussion points from the client call to determine the project's deliverables, deadlines, and potential blockers. This analysis will help identify areas that require attention and inform the creation of additional tickets."}, {"type": "task", "title": "Create Project Management Plan", "priority": "high", "description": "Create a project management plan based on the analysis of the client call transcript and discussion points. The plan will outline key milestones, deadlines, and responsibilities to ensure successful project execution."}, {"type": "account_management", "title": "Schedule Follow-up Meeting", "priority": "normal", "description": "Schedule a follow-up meeting with the client to review the project management plan and discuss any outstanding issues or concerns. This meeting will help ensure that the project is on track and that the client's needs are being met."}]}	f48ddd55-60d6-4bec-8040-94fbecd18fd6	2026-04-06 14:19:38.618861+00
91c1ed68-1e97-413c-b033-34187370c649	c0c52364-26c1-4290-9332-a192ad035cae	00000000-0000-0000-0000-000000000031	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Design Database Schema for Time Logs", "priority": "high", "description": "Create a database schema to store time logs, ensuring accurate and reliable data tracking. The schema should accommodate the new timer features and activity logs."}, {"type": "development", "title": "Define API Endpoints for Time Logging", "priority": "high", "description": "Define secure REST API endpoints for logging time, including start, pause, resume, and stop actions. Ensure API endpoints are properly documented and tested."}, {"type": "design", "title": "Design UI for Timer Controls", "priority": "normal", "description": "Create a user-friendly UI design for timer controls, including start, pause, resume, and stop buttons, as well as clear visual indicators for timer status and idle detection alerts."}, {"type": "account_management", "title": "Share Proposal with the Client", "priority": "normal", "description": "Prepare and share the proposed solution with the client, including the technical approach, timeline, and expected outcomes. Ensure the client is informed and aligned with the project plan."}, {"type": "development", "title": "Implement Idle Detection Feature", "priority": "high", "description": "Develop the idle detection feature to automatically pause the timer after a period of inactivity. Ensure the feature is properly integrated with the timer controls and API endpoints."}, {"type": "development", "title": "Develop Single Active Timer Feature", "priority": "high", "description": "Implement the single active timer feature to prevent overlapping timers. Ensure the feature is properly integrated with the timer controls and API endpoints."}, {"type": "development", "title": "Develop Activity Logs and Audit Trail", "priority": "normal", "description": "Create activity logs to track user actions, such as start, pause, resume, and stop, and maintain a detailed audit trail for reporting and compliance."}, {"type": "development", "title": "Implement Automatic Reminders for Long-Running Timers", "priority": "normal", "description": "Develop a feature to send automatic reminders if a timer runs for an unusually long duration. Ensure the feature is properly integrated with the timer controls and API endpoints."}]}	00000000-0000-0000-0000-000000000001	2026-04-10 09:44:19.176814+00
9494c735-437f-4ceb-9e85-3e1d2656f56d	c0c52364-26c1-4290-9332-a192ad035cae	00000000-0000-0000-0000-000000000032	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Design Database Schema for Time Logs", "priority": "high", "description": "Create a database schema to store time logs, including fields for start and stop times, user ID, and ticket ID. The schema should be designed to support the new timer functionality and analytics requirements."}, {"type": "development", "title": "Define API Endpoints for Time Logging", "priority": "high", "description": "Define secure REST API endpoints for logging time, including endpoints for starting, stopping, pausing, and resuming timers. The APIs should include validation checks to prevent overlapping timers and ensure data consistency."}, {"type": "design", "title": "Design UI for Timer Controls", "priority": "normal", "description": "Design a user-friendly UI for timer controls, including start, pause, resume, and stop buttons, as well as clear visual indicators for timer status. The design should also include alerts for idle detection and reminders for long-running timers."}, {"type": "account_management", "title": "Share Proposal with Client", "priority": "normal", "description": "Share the proposed solution with the client, including the technical approach, timeline, and expected outcomes. The proposal should address the client's concerns and provide a clear understanding of the improvements to the timesheet tracking system."}, {"type": "development", "title": "Implement Idle Detection", "priority": "high", "description": "Implement idle detection functionality to automatically pause timers after a period of inactivity. The implementation should include server-side checks to prevent overlapping timers and ensure data consistency."}, {"type": "development", "title": "Develop Activity Logs and Audit Trail", "priority": "normal", "description": "Develop activity logs to track user actions, such as start, pause, resume, and stop, and maintain a detailed audit trail for reporting and compliance. The implementation should include secure storage and retrieval of log data."}, {"type": "development", "title": "Develop Reporting Dashboards for Administrators", "priority": "normal", "description": "Develop reporting dashboards for administrators to provide insights into time tracking data, including metrics on timer usage, user activity, and system performance. The dashboards should be user-friendly and provide actionable data for decision-making."}]}	00000000-0000-0000-0000-000000000001	2026-04-16 05:43:12.652405+00
6631c521-e5d5-4a17-b256-d49909128dc4	f42423e8-0136-40ee-bdd8-19f1448cadd8	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Complete Payment Gateway Testing", "priority": "high", "description": "Ensure the payment gateway is fully tested and integrated into the product by the end of the week to avoid any delays in the launch timeline."}, {"type": "task", "title": "Arrange Additional QA Resource", "priority": "normal", "description": "Provide one more QA resource to support faster testing of the product, especially focusing on the checkout flow and payment integration."}, {"type": "development", "title": "Finalize Feature List", "priority": "high", "description": "Freeze the feature list by the end of the week to ensure clarity on what will be included in the product launch."}, {"type": "account_management", "title": "Confirm Pricing and Key Features for Marketing", "priority": "normal", "description": "Provide final confirmation on pricing and key features to the marketing team to ensure alignment with product messaging."}, {"type": "task", "title": "Prepare Marketing Campaigns", "priority": "normal", "description": "Continue preparing marketing campaigns, including social media creatives and ad plans, but hold off on final launch date confirmation until the product timeline is confirmed."}, {"type": "task", "title": "Monitor Product Timeline for Potential Delays", "priority": "high", "description": "Keep a close eye on the product development timeline to identify any potential delays that could impact marketing campaign schedules."}]}	00000000-0000-0000-0000-000000000001	2026-04-16 06:16:01.595189+00
b6101d65-b1cb-45e6-b531-acd510d91b30	c0c52364-26c1-4290-9332-a192ad035cae	00000000-0000-0000-0000-000000000032	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "development", "title": "Design Database Schema for Time Logs", "priority": "high", "description": "Create a database schema to store time logs, ensuring accurate and reliable tracking of time spent on tickets."}, {"type": "development", "title": "Define API Endpoints for Time Logging", "priority": "high", "description": "Define secure REST API endpoints for logging time, including start, pause, resume, and stop actions."}, {"type": "design", "title": "Design UI for Timer Controls", "priority": "normal", "description": "Create a user-friendly UI for timer controls, including start/pause/resume/stop buttons, idle detection alerts, and real-time timer updates."}, {"type": "account_management", "title": "Share Proposal with Client", "priority": "normal", "description": "Share the proposed solution with the client, including the technical approach and timeline for implementation."}, {"type": "development", "title": "Implement Idle Detection", "priority": "high", "description": "Implement idle detection feature to automatically pause the timer after a period of inactivity."}]}	00000000-0000-0000-0000-000000000001	2026-04-20 12:46:23.252696+00
1cb39741-0cc2-4a58-a116-4b039f5a04dc	93e75831-1973-4c26-aca0-09eac2ac2187	00000000-0000-0000-0000-000000000031	eee2b904-881f-4093-aa49-4c83f2a80066		{"tickets": [{"type": "design", "title": "Refine Landing Page Messaging", "priority": "high", "description": "Update the landing page messaging to better align with the ad creatives for improved conversion rates. Revised copies and headlines are expected by tomorrow for approval."}, {"type": "task", "title": "Optimize Campaign Targeting", "priority": "normal", "description": "Narrow down the campaign targeting based on initial engagement data for more effective audience reach."}, {"type": "development", "title": "Implement Heatmaps for Landing Pages", "priority": "normal", "description": "Add heatmaps to the landing pages for better insights into user behavior and interactions."}, {"type": "design", "title": "Develop Retargeting Campaign Content", "priority": "high", "description": "Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone."}, {"type": "account_management", "title": "Ensure Timely Content Approvals", "priority": "urgent", "description": "Prioritize approvals for updated content to avoid delays in campaign implementation."}, {"type": "task", "title": "Monitor and Adjust Tracking Requirements", "priority": "low", "description": "Keep track of any changes in tracking requirements and notify the development team in advance for smooth implementation."}]}	00000000-0000-0000-0000-000000000001	2026-04-21 07:38:24.037977+00
8768f02d-8a2e-4af1-a3f9-fabc0405a313	a8059fc9-e0bb-4414-a163-d839c327ed03	00000000-0000-0000-0000-000000000036	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "task", "title": "Update Creative Brief for Summer Body Campaign", "priority": "high", "description": "Update the creative brief to include three video ads per platform and send to the design team"}, {"type": "design", "title": "Design Hero Banner for Summer Body Campaign", "priority": "high", "description": "Design a hero banner for the summer body campaign"}, {"type": "development", "title": "Develop Before and After Testimonial Section", "priority": "high", "description": "Develop a before and after testimonial section for the landing page"}, {"type": "task", "title": "Write Landing Page Copy for Summer Body Campaign", "priority": "high", "description": "Write the landing page copy for the summer body campaign"}, {"type": "design", "title": "Design Ad Creatives for Summer Body Campaign", "priority": "high", "description": "Design six static ads and three video ads for Facebook and Instagram"}, {"type": "account_management", "title": "Review and Approve Landing Page Copy", "priority": "high", "description": "Review and approve the landing page copy by April 7th"}, {"type": "design", "title": "Design HTML Email Templates for App Relaunch", "priority": "normal", "description": "Design HTML email templates for the app relaunch email sequence"}, {"type": "design", "title": "Update App Store Screenshots", "priority": "normal", "description": "Update the app store screenshots for the app relaunch"}, {"type": "task", "title": "Write Press Release for App Relaunch", "priority": "normal", "description": "Write a press release for the app relaunch by April 12th"}, {"type": "development", "title": "Develop UTM Tracking Setup", "priority": "normal", "description": "Set up proper UTM parameters for all campaign links"}, {"type": "task", "title": "Update Media Plan with New Budget Allocation", "priority": "normal", "description": "Update the media plan to reflect the new budget allocation and send to Priya by end of the week"}, {"type": "task", "title": "Write Campaign Strategy Document for Gym Equipment Product Line", "priority": "low", "description": "Write a campaign strategy document for the gym equipment product line by end of April"}]}	00000000-0000-0000-0000-000000000001	2026-04-23 05:15:37.788978+00
05144ace-8865-4099-982e-ea8399992000	93e75831-1973-4c26-aca0-09eac2ac2187	cc1a9d4a-057e-4c65-8689-27e034c53dcf	cef47a45-c705-4db8-a1d5-63e57fd59ec0		{"tickets": [{"type": "task", "title": "Refine Landing Page Messaging", "priority": "high", "description": "Update the landing page messaging to better align with the ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval."}, {"type": "task", "title": "Share Revised Copies and Headlines", "priority": "high", "description": "Share revised copies and headlines for the lead generation campaign by tomorrow for client approval."}, {"type": "task", "title": "Narrow Down Campaign Targeting", "priority": "normal", "description": "Use initial engagement data to narrow down the target audience for the lead generation campaign."}, {"type": "development", "title": "Add Heatmaps for Landing Page Insights", "priority": "normal", "description": "Include heatmaps to track user behavior on the landing pages for better insights."}, {"type": "task", "title": "Plan Retargeting Campaign", "priority": "normal", "description": "Prepare a new campaign focused on retargeting users who visited but didn’t convert, with personalized and action-driven messaging."}, {"type": "design", "title": "Ensure Consistent Brand Tone", "priority": "normal", "description": "Ensure the tone of the retargeting campaign stays consistent with the brand."}, {"type": "account_management", "title": "Prioritize Content Approval", "priority": "high", "description": "Prioritize approvals on the updated content to avoid delays in the campaign."}, {"type": "task", "title": "Notify of Tracking Requirement Changes", "priority": "low", "description": "Notify the team of any changes in tracking requirements in advance to implement them smoothly."}, {"type": "task", "title": "Schedule Follow-up Meeting", "priority": "normal", "description": "Schedule a follow-up meeting after the updated content is live to review campaign performance."}]}	00000000-0000-0000-0000-000000000001	2026-04-23 12:28:09.906705+00
43c7e9db-68ad-4f35-971f-779d9f757aae	a8059fc9-e0bb-4414-a163-d839c327ed03	00000000-0000-0000-0000-000000000031	404b1e88-d92c-4e30-bd0e-6537aa11a556		{"tickets": [{"type": "task", "title": "Update Creative Brief", "priority": "high", "description": "Update the creative brief to reflect changes in the campaign, including three video ads per platform and send to the design team"}, {"type": "design", "title": "Design Hero Banner", "priority": "high", "description": "Design the hero banner for the summer body transformation campaign"}, {"type": "development", "title": "Develop Landing Page Testimonials Section", "priority": "high", "description": "Develop a new section on the landing page for before and after customer testimonials"}, {"type": "task", "title": "Write Landing Page Copy", "priority": "high", "description": "Write the copy for the summer body transformation campaign landing page, using the provided brand tone of voice doc"}, {"type": "design", "title": "Design Facebook and Instagram Ad Creatives", "priority": "high", "description": "Design six static ads and three video ads for Facebook and Instagram"}, {"type": "task", "title": "Review and Approve Landing Page Copy", "priority": "high", "description": "Review and approve the landing page copy by April 7th"}, {"type": "design", "title": "Design HTML Email Templates", "priority": "normal", "description": "Design HTML templates for the email sequence announcing the app relaunch"}, {"type": "design", "title": "Update App Store Screenshots", "priority": "normal", "description": "Update the app store screenshots for the app relaunch"}, {"type": "task", "title": "Write Press Release", "priority": "normal", "description": "Write a press release for the app relaunch, to be distributed by the PR agency"}, {"type": "development", "title": "Develop UTM Tracking Setup", "priority": "normal", "description": "Set up proper UTM parameters for all campaign links"}, {"type": "task", "title": "Update Media Plan", "priority": "normal", "description": "Update the media plan to reflect the additional budget and allocate sixty percent to Instagram, thirty to Facebook, and ten to Google retargeting"}, {"type": "task", "title": "Write Equipment Line Campaign Strategy", "priority": "low", "description": "Write a campaign strategy document for the gym equipment product line by the end of April"}]}	00000000-0000-0000-0000-000000000001	2026-04-24 15:37:17.938556+00
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_members (project_id, user_id, added_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, firm_id, name, description, status, created_at, updated_at, workflow_status, start_date, end_date, priority, type) FROM stdin;
4dff6e4d-feb4-4c8d-815f-eb76ec150f33	00000000-0000-0000-0000-000000000036	advetis	sf	active	2026-04-06 10:12:22.8226+00	2026-04-06 10:12:22.8226+00	todo	\N	\N	medium	\N
0063132e-2715-4d4a-8f9f-9f86c58d1e41	00000000-0000-0000-0000-000000000035	webisre	\N	active	2026-04-06 10:43:33.739779+00	2026-04-06 10:43:33.739779+00	todo	\N	\N	medium	\N
1af07c99-7167-419f-b6f0-eded0cc2f9bf	00000000-0000-0000-0000-000000000031	xyz	\N	active	2026-04-06 10:51:14.713302+00	2026-04-06 10:51:14.713302+00	todo	\N	\N	medium	\N
a3f3828a-521b-45bc-8fab-51f6b305f586	00000000-0000-0000-0000-000000000031	advertisment	\N	active	2026-04-06 11:46:41.782383+00	2026-04-06 11:46:41.782383+00	todo	\N	\N	medium	\N
cf363972-a80e-45e2-807e-a1064805e106	00000000-0000-0000-0000-000000000031	website	\N	active	2026-04-06 13:01:56.461398+00	2026-04-06 13:01:56.461398+00	todo	\N	\N	medium	\N
3b1df931-4c01-4269-9fcd-e9550cbd1401	00000000-0000-0000-0000-000000000031	craig project	\N	active	2026-04-06 14:20:22.181397+00	2026-04-06 14:20:22.181397+00	todo	\N	\N	medium	\N
\.


--
-- Data for Name: prompts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prompts (id, name, type, system_prompt, is_active, firm_id, created_at, updated_at) FROM stdin;
cef47a45-c705-4db8-a1d5-63e57fd59ec0	Project Management Debrief	pm	You are a senior project manager assistant. Your task is to analyze a client call transcript and extract actionable project management items. For each identified action item, produce a structured ticket with: a clear title, a detailed description, ticket type (task/design/development/account_management), a suggested priority (low/normal/high/urgent), and an estimated hours to complete. Focus on deliverables, deadlines, blockers, and follow-ups discussed in the call. Return your output as a JSON array of ticket objects.	t	\N	2026-03-26 11:10:20.248301+00	2026-03-26 11:10:20.248301+00
eee2b904-881f-4093-aa49-4c83f2a80066	Campaign Planning Extractor	campaigns	You are a marketing campaign strategist assistant. Analyze the provided call transcript and identify all campaign-related discussion points. For each campaign initiative or task mentioned, generate a structured ticket including: title, description, ticket type, priority, and estimated hours. Pay particular attention to campaign goals, target audiences, channels, timelines, creative requirements, and budget discussions. Return your output as a JSON array of ticket objects.	t	\N	2026-03-26 11:10:20.248301+00	2026-03-26 11:10:20.248301+00
404b1e88-d92c-4e30-bd0e-6537aa11a556	Content Production Tracker	content	You are a content production coordinator assistant. Review the call transcript and extract all content creation tasks and requirements discussed. For each content item identified, produce a structured ticket with: title, description, ticket type, priority, and estimated hours. Focus on content formats (blog posts, social media, email, video, etc.), deadlines, brand guidelines, approval workflows, and distribution plans. Return your output as a JSON array of ticket objects.	t	\N	2026-03-26 11:10:20.248301+00	2026-03-26 11:10:20.248301+00
00000000-0000-0000-0000-000000000021	Project Management Debrief	pm	You are a senior project manager assistant. Analyze a client call transcript and extract actionable project management items. For each action item, produce a structured ticket with: title, description, type (task/design/development/account_management), priority (low/normal/high/urgent), and estimated_hours. Return a JSON array of ticket objects.	t	\N	2025-11-26 17:34:36.425223+00	2025-11-26 17:34:36.425223+00
00000000-0000-0000-0000-000000000022	Campaign Planning Extractor	campaigns	You are a marketing campaign strategist. Analyze the call transcript and identify all campaign-related discussion points. For each initiative generate a structured ticket with: title, description, type, priority, and estimated_hours. Focus on campaign goals, target audiences, channels, timelines, and creative requirements. Return a JSON array of ticket objects.	t	\N	2025-11-26 17:34:36.425223+00	2025-11-26 17:34:36.425223+00
00000000-0000-0000-0000-000000000023	Content Production Tracker	content	You are a content production coordinator. Review the call transcript and extract all content creation tasks. For each content item produce a structured ticket with: title, description, type, priority, and estimated_hours. Focus on content formats, deadlines, brand guidelines, and distribution plans. Return a JSON array of ticket objects.	t	\N	2025-11-26 17:34:36.425223+00	2025-11-26 17:34:36.425223+00
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skills (id, name, category, created_at, description, color) FROM stdin;
3e5f4e5d-997d-4bb6-93b0-507481e888da	HTML	\N	2026-04-14 11:40:36.470053+00	\N	\N
b6242bb7-aa6b-4c2a-a94b-8e37676a48f3	CSS	\N	2026-04-14 11:42:25.065567+00	\N	\N
b6391a03-e0ae-475c-ba96-c78d923d73d6	Node js	\N	2026-04-14 11:46:07.829712+00	\N	\N
4f2e698b-916b-4513-977d-8f467545b93e	Graphics	\N	2026-04-14 12:02:53.752132+00	\N	\N
f63133ca-16ab-453e-8935-657b1a8129f6	reactjs	\N	2026-04-15 12:08:16.526416+00	\N	\N
0dbb2960-bea7-4e94-bab5-1408ab1dbb7e	nodejs re	\N	2026-04-21 13:22:14.963234+00	\N	\N
8d6db17c-5f80-4320-b32e-a0fd891a0989	website design	#F97316	2026-04-23 14:11:55.390212+00	\N	\N
ae4fa2ac-d39a-4aa6-a18c-bf241a72925f	website	\N	2026-04-28 10:48:55.807366+00	\N	\N
b6660cc9-73e8-44be-a116-efb515636cd4	design the cadcam	\N	2026-04-28 11:00:19.076888+00	\N	\N
8e4d3aa7-66a8-4ffc-873e-ce485895dbc9	test	\N	2026-04-28 11:04:51.452735+00	\N	\N
ff52645e-2ab0-4411-89aa-073010b50696	dadsdds	\N	2026-04-28 11:07:06.412644+00	\N	\N
8f99a5cc-1f0a-4190-8843-0bdd04e6c6e8	wdwd	\N	2026-04-28 11:08:37.915021+00	\N	\N
367a5b96-5438-4e58-af45-dd96ac779bfc	dwdwd	\N	2026-04-28 11:10:36.911124+00	dwdwdwdwdw	#9B5CFF
d21b7c3d-6b4e-4a95-81f6-35aa320c1218	hvhn	\N	2026-04-30 09:29:26.277358+00	h	#22C55E
be39d6e1-c415-4111-b183-d7e9c8687e08	CDN	\N	2026-04-30 09:57:21.217124+00	content delivery mangemnt	#9B5CFF
36ebb11b-9c3c-44d4-af11-6394f2cfbc20	canva	#A3E635	2026-04-28 10:18:10.926422+00	\N	#14B8A6
f47f8468-e87c-4e50-ab60-1bffa5f09d96	name	#9B5CFF	2026-04-28 10:18:39.182052+00	named	#0F766E
3ba53911-6e0b-4034-a06a-bdeff73401d6	webstc	\N	2026-05-04 07:32:02.090019+00	\N	\N
f280835f-5f72-44d9-bde3-725bdcbe5fce	ftftft	\N	2026-05-04 07:33:19.647941+00	\N	\N
9296abde-d62a-446a-a79d-82bb450c1a85	red	\N	2026-05-04 07:37:14.823859+00	sfwf	#A3E635
f68ef51b-0ded-47f4-8fee-ed948dcaba4f	cgfg	\N	2026-05-04 07:58:20.738688+00	dg	#14B8A6
272ace33-9110-4bc4-a523-38acc199c3d7	QA1	\N	2026-05-04 10:30:12.790206+00	\N	#F97316
a18ca1bf-9415-45f2-ad72-6d8ade958b11	Website Design	Design	2026-05-04 11:40:09.403+00	Creating visual layouts for websites.	#9B5CFF
\.


--
-- Data for Name: task_type_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_type_members (task_type_id, user_id, added_at) FROM stdin;
582fb7ae-90a5-4c0a-9c8e-4e8830a59484	dbc2a155-359a-4038-8a19-c0d9ac99acc0	2026-04-30 09:38:48.568752+00
d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb	5a1db9e2-eadf-4fec-abec-40d6c550c1ee	2026-04-30 10:43:01.882577+00
d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb	2e0315dd-60f2-44c4-909b-a78358468b86	2026-04-30 10:43:01.882577+00
90e0b5c4-2664-4b9f-a7c4-81c092b6f3c8	c23e802e-4164-4c07-8a5e-9ae08da68f97	2026-05-04 10:32:14.685163+00
\.


--
-- Data for Name: task_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_types (id, name, description, color, created_at) FROM stdin;
c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e	design	UI/UX design or visual asset work	#8B5CF6	2026-04-28 10:17:15.151061+00
58b185ff-cb69-4216-92cd-920dab34504e	development	Software development or engineering	#3B82F6	2026-04-28 10:17:15.151061+00
d68649dc-bb81-46cb-9db2-2e49f73a7cde	account_management	Client communication or account admin	#F59E0B	2026-04-28 10:17:15.151061+00
582fb7ae-90a5-4c0a-9c8e-4e8830a59484	none	come	#EC4899	2026-04-30 09:38:46.94431+00
4c573b41-cedd-4082-b739-329054c8c6b8	dds	dada	#22C55E	2026-04-30 09:41:47.475597+00
d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb	task	General task or to-do item	#6B7280	2026-04-28 10:17:15.151061+00
90e0b5c4-2664-4b9f-a7c4-81c092b6f3c8	QA Test	\N	#9B5CFF	2026-05-04 10:32:13.121383+00
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tickets (id, session_id, firm_id, assignee_id, title, description, type, priority, status, change_note, estimated_hours, ai_generated, edited, created_at, updated_at, deadline, regeneration_count, last_regenerated_at, archived, revision_count, project_id, task_type_id) FROM stdin;
f4cf8898-543a-4ff6-87f1-b4c7b3746d84	0dcfd0c5-d402-4786-9bd2-5149165c601b	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000011	Arrange Additional QA Support	Arrange for an additional QA resource to support faster testing of the product features, especially the payment gateway, to ensure timely completion and quality.	task	normal	internal_review		8.00	t	f	2026-04-06 06:56:33.300906+00	2026-04-28 10:17:15.151061+00	2026-04-07	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
21bfa14e-ef65-4ebd-9332-5b01ddc302ea	7161a043-06b5-40ce-b445-7da727c3ea97	cc1a9d4a-057e-4c65-8689-27e034c53dcf	00000000-0000-0000-0000-000000000011	Refine Landing Page Messaging	Update the landing page messaging to better align with the ad creatives for improved conversion rates. Revised copies and headlines need to be shared with the client for approval by tomorrow.	task	high	client_review	notes	2.00	t	f	2026-03-31 06:41:44.0919+00	2026-04-28 10:17:15.151061+00	2026-04-04	0	\N	f	7	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
b7216b1c-c50d-41f1-a140-a6d778336c9c	580154db-7074-40a4-864e-494cbb57c63d	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Review Client Call Transcript	Review the client call transcript to identify key discussion points and action items. The transcript is brief and requires careful analysis to determine the client's needs. This task will help inform subsequent project management decisions.	task	high	client_review	you forget to fix the padding there	1.83	t	f	2026-04-06 14:19:38.803084+00	2026-04-28 10:17:15.151061+00	2026-04-06	0	\N	f	1	3b1df931-4c01-4269-9fcd-e9550cbd1401	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
a5c36882-491e-4475-9e57-08637656f6e8	f70987a7-2dde-46fa-9dc2-3a496c313595	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000011	Arrange Additional QA Support	Arrange one more QA resource for faster testing to support the development team in ensuring the quality of the product before release.	task	urgent	internal_review		3.00	t	f	2026-04-06 06:11:45.54387+00	2026-04-28 10:17:15.151061+00	2026-04-08	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000064	\N	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000012	Banner Asset Approvals for Q4 Campaign	Collect final sign-off on all banner assets. Coordinate with design team and get client approval before campaign launch.	account_management	urgent	in_progress		4.00	f	f	2026-03-12 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
00000000-0000-0000-0000-000000000066	\N	00000000-0000-0000-0000-000000000032	00000000-0000-0000-0000-000000000015	SEO Keyword Research — Tech Blog	Research and compile a master keyword list for the Globex technology blog. Target 50+ long-tail opportunities with monthly search volume data.	task	high	in_progress		16.00	f	t	2026-03-14 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000065	\N	00000000-0000-0000-0000-000000000032	\N	Google Ads Performance Audit	Full audit of Globex Google Ads account. Review campaign structure, keyword bids, quality scores, and conversion tracking. Recommend optimizations.	task	normal	in_progress		12.00	f	f	2026-03-16 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
0cb17ea0-b535-4a0c-be89-a78b697d1e5d	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Ensure Consistent Brand Tone	Make sure the tone of the retargeting campaign stays consistent with the brand.	design	low	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-15	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00000000-0000-0000-0000-000000000062	00000000-0000-0000-0000-000000000051	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000013	Homepage SEO Optimization	Full on-page SEO audit and optimization for the Acme Corp homepage. Keyword mapping, meta tags, structured data, and internal linking improvements.	development	high	in_progress		16.00	t	f	2026-03-18 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
00000000-0000-0000-0000-000000000063	\N	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Bi-Weekly Newsletter Drafta	Create the next edition of the Acme Corp bi-weekly newsletter. Focus on Q4 product updates and holiday promotions.a	task	normal	in_progress	a	8.00	f	t	2026-03-21 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
59cbb16b-0de5-46e4-a769-ae00869e2bac	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Implement Tracking and Content Updates for Campaigns	Refine landing page messaging, add heatmaps for better insights, and implement retargeting campaign with personalized content. Ensure tracking scripts and analytics are integrated to capture user interactions and campaign data accurately.	development	high	in_progress		\N	t	t	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-24	1	2026-04-06 11:23:45.103+00	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
70a4ac0e-0352-4d58-9a2b-a0ff334c4e4a	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Prepare Retargeting Campaign	Plan a new campaign focused on retargeting users who visited but didn’t convert, with personalized and action-driven messaging.	task	normal	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-15	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
c8c53536-8906-455c-a0e8-ead78be8f188	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Prioritize Content Approval	Prioritize approvals on the updated content to avoid delays in the campaign.	account_management	normal	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-09	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
8a01f979-55d2-4fe4-9eb5-d3280931c25c	\N	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	rohan calling12	clling you rohan	design	high	revisions	agian call jordan	5.00	f	t	2026-04-06 11:44:26.817402+00	2026-04-28 10:17:15.151061+00	2026-04-07	0	\N	f	1	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
c158f398-8999-479d-ba1b-dc51af76d6f5	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Notify of Tracking Requirement Changes	Notify the team of any changes in tracking requirements in advance to implement them smoothly.	task	normal	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-09	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
40682b46-d3de-4f7b-81c0-34eafa729d79	cbfedfc6-9d96-43d1-bb12-f2d51e2ef78b	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	urgent	internal_review		5.00	t	f	2026-03-28 11:31:28.911861+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
f80db768-a9f9-4b3d-84aa-9fe55769934a	0dcfd0c5-d402-4786-9bd2-5149165c601b	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000011	Complete Testing and Finalize Features	Complete the testing of the core features, including the payment gateway, and finalize the feature list by the end of the week to ensure a stable version for launch.	development	urgent	in_progress		\N	t	f	2026-04-06 06:56:33.300906+00	2026-04-28 10:17:15.151061+00	2026-04-07	0	\N	t	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
b08a0a74-bbd3-46dc-b9a1-f64934b1a176	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000012	Monitor and Communicate Timeline Changes	Keep all stakeholders informed about any changes to the product launch timeline to ensure coordinated efforts and adjustments as necessary.	task	high	in_progress		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	2026-04-23	0	\N	f	0	0063132e-2715-4d4a-8f9f-9f86c58d1e41	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000069	\N	00000000-0000-0000-0000-000000000033	00000000-0000-0000-0000-000000000012	Database Migration Delay Report	Prepare stakeholder report on the Q3 database migration delay. Document causes, business impact, and remediation timeline.	account_management	high	in_progress		6.00	f	f	2026-03-08 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
00000000-0000-0000-0000-000000000072	\N	00000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000014	Q3 Campaign Report	Comprehensive Q3 performance report for Nexus Digital campaigns across paid, organic, and email channels. Include attribution analysis.	task	low	in_progress		4.00	f	f	2026-03-17 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
e8c7e1e1-4938-4515-99bb-35a82a5c5f92	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Share Revised Content for Approval	Share revised copies and headlines by tomorrow for client approval to avoid delays in the campaign.	task	normal	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-08	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
67271298-0219-4cca-afa2-d91036baad70	7161a043-06b5-40ce-b445-7da727c3ea97	cc1a9d4a-057e-4c65-8689-27e034c53dcf	00000000-0000-0000-0000-000000000011	Optimize Campaign Targeting	Narrow down the campaign targeting based on initial engagement data to improve the campaign's effectiveness and conversion rates. This involves analyzing the data, identifying key audience segments, and adjusting the targeting parameters accordingly.	task	high	internal_review		\N	t	f	2026-03-31 06:41:44.0919+00	2026-04-28 10:17:15.151061+00	2026-04-06	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
0f62cfdb-1ad4-4404-9dea-1d01aa60e0ee	b0d9ff6d-8092-4f40-8816-8b8c58aa3db5	00000000-0000-0000-0000-000000000031	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-28 11:34:12.589474+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
e5a8daca-f0c8-452f-9cc4-c537da93116d	b0d9ff6d-8092-4f40-8816-8b8c58aa3db5	00000000-0000-0000-0000-000000000031	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-28 11:34:12.589474+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
72042c38-735d-4853-89df-2bdb74453731	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Review and Test Detailed Member Page	Review the detailed member page for functionality, performance, and design consistency, and conduct testing to ensure it meets requirements.	task	high	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
8ce566bd-ce17-4f86-8bbd-5d54cabe7e52	a4110452-f507-4290-ac6e-29010ce368c6	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-28 11:37:30.057468+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
a4321c7e-1378-42a0-98fa-f5dbe5d950d5	a4110452-f507-4290-ac6e-29010ce368c6	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-28 11:37:30.057468+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c608cb18-ebd9-42ea-83f3-a21224f0ac4e	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Define API Endpoints for Time Logging	Define secure REST API endpoints for logging time, including endpoints for starting, stopping, pausing, and resuming timers. The APIs should include validation checks to prevent overlapping timers and ensure data consistency.	development	high	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
dc4a1904-7a9e-4bb3-b447-05d93c25310d	\N	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Update	add any description	design	normal	in_progress		\N	f	f	2026-04-06 07:38:12.908209+00	2026-04-28 10:17:15.151061+00	2026-04-08	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
8827d2d3-4349-4ecd-a793-7ca638ad7e19	434f3d74-e20e-4560-928b-172a5e6e8420	00000000-0000-0000-0000-000000000033	00000000-0000-0000-0000-000000000011	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	high	internal_review	add tracking process	1.00	t	t	2026-03-30 07:22:16.404341+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
d29c5547-d5e7-41ab-b9bb-a8785838a2f3	309fff39-ce76-4295-8c91-39362846cecf	00000000-0000-0000-0000-000000000033	00000000-0000-0000-0000-000000000011	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	in_progress		5.00	t	f	2026-03-30 08:19:14.555108+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
f80766f0-0842-47f0-ad7d-d035f87a8ca6	a4110452-f507-4290-ac6e-29010ce368c6	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	t	2026-03-28 11:37:30.057468+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
3e56ae9e-237c-458e-8166-68e898cd2fb7	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	Finalize the requirements document and make sure everything is tracked in jira	We need to finalize the requirements document and make sure everything is tracked in Jira.	account_management	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
64446ffa-b445-4974-badc-6853858eeeae	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	The roadmap should be updated to reflect the new timeline by end of this week	The roadmap should be updated to reflect the new timeline by end of this week.	account_management	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
67f3b542-9e22-4a84-a761-1c4e02865637	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	All tasks must be documented and tracked properly	All tasks must be documented and tracked properly.	account_management	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
41cc86e9-c361-401d-aa44-b10830e744d0	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	We also need to set up the ci/cd pipeline for the new deployment	We also need to set up the CI/CD pipeline for the new deployment.	task	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
e08ec105-f139-4cfa-96c6-48fc472ce9d7	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	The kubernetes cluster needs to be configured for auto-scaling and the infras...	The Kubernetes cluster needs to be configured for auto-scaling and the infrastructure migration should be planned carefully.	task	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
c64fbee4-abd9-4804-b60b-568a8dd8d8ea	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	On the frontend side, we need to redesign the dashboard ui and implement the ...	On the frontend side, we need to redesign the dashboard UI and implement the new design system components.	design	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
6af3c4a0-7eb6-4901-9ead-9ab6bdb1ded0	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	For the backend, we need to refactor the authentication service to support oauth	For the backend, we need to refactor the authentication service to support OAuth.	development	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
b909dc31-7da5-4b38-9f44-d8b9e3898973	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	The database optimization must be completed before launch, including proper i...	The database optimization must be completed before launch, including proper indexing.	development	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
7ee5f314-e2a3-42cd-aa06-00dc175895cc	2bfaf18d-01fc-47de-a099-4b008690a99a	00000000-0000-0000-0000-000000000036	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-28 11:47:18.429273+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
bc4d581a-bae3-45d9-b8c0-9d9b41d8f4e7	2bfaf18d-01fc-47de-a099-4b008690a99a	00000000-0000-0000-0000-000000000036	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-28 11:47:18.429273+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
45be7580-f394-4e78-ad0f-f2511f922c7f	2bfaf18d-01fc-47de-a099-4b008690a99a	00000000-0000-0000-0000-000000000036	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-28 11:47:18.429273+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
9ab3a4ca-05dc-4dbe-bbf1-b37a31460ad2	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	Finalize the requirements document and make sure everything is tracked in jira	We need to finalize the requirements document and make sure everything is tracked in Jira.	account_management	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
96b62c4a-3614-4229-9486-1c3405a9ea30	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	The roadmap should be updated to reflect the new timeline by end of this week	The roadmap should be updated to reflect the new timeline by end of this week.	account_management	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
a58abaa5-072f-4b71-a025-60ff717bbf84	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	All tasks must be documented and tracked properly	All tasks must be documented and tracked properly.	account_management	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
568e535c-4fd1-44a7-8244-96a6c64dc567	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	We also need to set up the ci/cd pipeline for the new deployment	We also need to set up the CI/CD pipeline for the new deployment.	task	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
fdbb9ac4-8696-48ce-8ca6-831d79ff47db	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	The kubernetes cluster needs to be configured for auto-scaling and the infras...	The Kubernetes cluster needs to be configured for auto-scaling and the infrastructure migration should be planned carefully.	task	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
63f5bd71-f20a-47aa-add6-b7926357b67f	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	On the frontend side, we need to redesign the dashboard ui and implement the ...	On the frontend side, we need to redesign the dashboard UI and implement the new design system components.	design	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
8e692009-b980-4541-9ad2-18266921293b	cc6704b3-e2fe-46ea-8293-90a0bf9e2052	00000000-0000-0000-0000-000000000031	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-28 11:33:33.920285+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
9aae62e5-10df-4a79-95e4-b25e853d4378	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000012	Develop UTM Tracking Setup	Set up proper UTM parameters for all campaign links	development	urgent	in_progress		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
204f5d30-286f-47ff-a746-01634798e812	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	The bundle size should be optimized for better mobile performance	The bundle size should be optimized for better mobile performance.	design	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
6647034c-fd43-4056-a9c5-a0e22778d43c	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	\N	For the backend, we need to refactor the authentication service to support oauth	For the backend, we need to refactor the authentication service to support OAuth.	development	normal	to_do		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
23090fb6-d284-4d22-b96c-8c3d0c886132	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Implement Detailed Member Page	Create a dedicated page for member details including profile info, assigned tickets, ticket status, and time duration spent, with consideration for scalability and structure.	development	high	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
7515e3f3-a2fc-424b-a5f1-997e00ade52e	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Write Landing Page Copy	Write the landing page copy for the summer body transformation campaign	task	high	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f24a7cf0-b21d-4004-b39e-f65a9d34b1f4	434f3d74-e20e-4560-928b-172a5e6e8420	00000000-0000-0000-0000-000000000033	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-30 07:22:16.404341+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
c7945388-dec6-4d44-898c-556cd875e46b	434f3d74-e20e-4560-928b-172a5e6e8420	00000000-0000-0000-0000-000000000033	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-30 07:22:16.404341+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
7f917791-b225-4d1d-bec6-b5d211b843ee	309fff39-ce76-4295-8c91-39362846cecf	00000000-0000-0000-0000-000000000033	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-30 08:19:14.555108+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
0984d01d-abd1-459c-95c7-f45f3ca83374	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Update Creative Brief	Update the creative brief to include three video ads per platform and send to the design team	task	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
5ac417b4-9d49-408d-a406-3f8aacb029d0	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Design Hero Banner	Design the hero banner for the summer body transformation campaign	design	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
ee7b6246-9bc2-4dda-b134-4f7ca03737de	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Design Ad Creatives	Design six static ads and three video ads for Facebook and Instagram	design	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00259e16-c2b6-44ee-8001-baa57bf31e7e	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Landing Page Development	Develop the before and after section with customer testimonials on the landing page	development	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c9649295-c81c-4011-b4d6-abf4302a304f	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Write Landing Page Copy	Write the landing page copy for the summer body transformation campaign	task	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
4a8cb94d-13d9-42f9-8241-463ad9d2081e	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Review Landing Page Copy	Review the landing page copy by April 7th	task	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
3d3d25f3-f63d-4539-bac9-50fca930a660	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Design Email Templates	Design the HTML email templates for the app relaunch email sequence	design	normal	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
dbced31b-4d1a-4036-b934-1c781502949e	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Design App Store Screenshots	Design the app store screenshots for the app relaunch	design	normal	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
ad00aeaf-4866-47ec-b978-79b6b927c461	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Write Press Release	Write the press release for the app relaunch by April 12th	task	high	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
3deaa1a3-205f-43e2-99fb-be75de5dd73f	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	UTM Tracking Setup	Set up proper UTM parameters for all campaign links	development	normal	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
17a1af3b-04b4-498f-a7fb-9444be1de44e	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Campaign Strategy Document	Create a campaign strategy document for the gym equipment product line by end of April	task	normal	to_do		\N	t	f	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f9704d8f-b590-4b09-81dc-fcf49a165e3e	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Update Creative Brief for Summer Body Campaign	Update the creative brief to include three video ads per platform and send to the design team	task	high	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
69b90044-4c8f-4f90-b349-97a2af0b0141	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Design Hero Banner for Summer Body Campaign	Design the hero banner for the summer body campaign	design	high	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
e2c032e1-9aea-4946-a70c-92970bb3c154	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Develop Landing Page with Before and After Section	Develop the landing page with a new before and after section with customer testimonials	development	high	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
3c2cec21-1867-48a2-b11c-b4d0744830d9	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Develop Email Sequence for App Relaunch	Develop the email sequence for the app relaunch	development	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
84d13f63-a86a-4eab-b7a9-239c7de06a66	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Design HTML Email Templates	Design the HTML email templates for the app relaunch email sequence	design	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
02fd680e-2428-4606-9498-2ad6035b9336	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Update App Store Screenshots	Update the app store screenshots	design	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
9b6f9f00-cf33-428b-9ec0-6a900be1073f	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Write Press Release for App Relaunch	Write the press release for the app relaunch by April 12th	task	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
fcf2e61f-e533-4cec-aa87-33db81a6496e	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Set up UTM Tracking	Set up proper UTM parameters for all campaign links	development	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
a2228c96-d481-4aef-8f75-f9c4be0d83b3	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Update Media Plan	Update the media plan to reflect the additional budget and send to Priya by end of the week	task	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
b94684e0-ce49-4da8-9b0e-ea749f791513	f70987a7-2dde-46fa-9dc2-3a496c313595	00000000-0000-0000-0000-000000000036	\N	Monitor Project Timeline and Communicate Updates	Keep track of the project timeline and communicate any updates or changes to the team, especially regarding potential delays and their impact on marketing campaigns.	account_management	normal	to_do		\N	t	f	2026-04-06 06:11:45.54387+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
787df933-45fd-4958-8eb6-e7f8639b9b28	b0d9ff6d-8092-4f40-8816-8b8c58aa3db5	00000000-0000-0000-0000-000000000031	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-28 11:34:12.589474+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
40d7a986-dcb1-4d32-bd35-7c50003bc5a9	adfe03bc-1bff-4237-8ea9-cbbf9676ab18	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	in_progress		\N	t	f	2026-03-30 14:54:23.242532+00	2026-04-28 10:17:15.151061+00	2026-04-22	0	\N	f	0	1af07c99-7167-419f-b6f0-eded0cc2f9bf	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
64a5f0c7-8857-49c3-addf-18387a9e6778	6f07891a-cdda-4571-9d0f-2ee43dcf9c25	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	00000000-0000-0000-0000-000000000011	Review Call Transcript	Review the call transcript from 7:50 pm to identify key discussion points and action items.	task	high	internal_review		0.50	t	t	2026-03-30 14:41:03.938955+00	2026-04-28 10:17:15.151061+00	2026-04-16	1	2026-03-30 14:41:56.814+00	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
7f8a2073-2add-4027-9632-6a2618f3fc8c	a0d1daa1-7ccd-416a-96f9-18c7ef81e989	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Review Call Transcript	Review the client call transcript to identify key discussion points and action items. The transcript is brief and requires analysis to determine the client's needs. This task will help inform the project's next steps.	task	high	in_progress		\N	t	f	2026-03-30 14:53:21.067777+00	2026-04-28 10:17:15.151061+00	2026-04-07	0	\N	f	0	a3f3828a-521b-45bc-8fab-51f6b305f586	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
175ad63b-e82c-487c-991f-f807234e9ba4	6f07891a-cdda-4571-9d0f-2ee43dcf9c25	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	00000000-0000-0000-0000-000000000011	Follow Up with Craig	Follow up with Craig to confirm understanding of the discussion and action items.	account_management	high	client_review	follow up with utkarsh	2.00	t	f	2026-03-30 14:41:03.938955+00	2026-04-28 10:17:15.151061+00	2026-03-30	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
3fbd313b-f136-4051-bfbe-d2279d3e12cd	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Write Campaign Strategy Document for Gym Equipment Product Line	Write the campaign strategy document for the gym equipment product line by end of April	task	low	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
1caf051f-db68-43a4-adaf-716c0e36402a	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Send Brand Tone of Voice Document	Send the brand tone of voice document to Sarah	task	normal	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
5ad2e58d-aa70-4b41-ae51-af0011669a15	0bd5f094-d626-4a73-8837-6de552c25c72	00000000-0000-0000-0000-000000000034	\N	Update Media Plan with Tax Consideration	Update the media plan to reflect the additional $15,000 budget, considering 30% tax, and send to Priya by end of the week. The total budget including tax is $19,500. Allocate the budget effectively across platforms, with a recommended split of 60% on Instagram, 30% on Facebook, and 10% on Google retargeting.	task	high	to_do		\N	t	t	2026-03-30 08:51:03.525309+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
15f58d90-dcec-4534-a528-ced7903fc558	acd8cfda-db83-48df-b2c2-ee9c569c8d26	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Review Call Transcript	Review the client call transcript to identify key project management items and action points. The transcript includes discussions on project deliverables, deadlines, and potential blockers. Review is necessary to ensure all points are captured and addressed.	task	normal	to_do		\N	t	f	2026-04-06 10:10:30.611724+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f830c4df-5be2-4191-b564-1e90685bf5ff	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Refine Landing Page Messaging	Update the landing page messaging to better align with the ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval.	task	high	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
81055f3c-b44d-47ad-b23d-3c9a2288c9bd	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Share Revised Content for Approval	Share the revised copies and headlines by tomorrow for client approval to avoid delays in the campaign.	task	urgent	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
53c4ea15-3fef-486c-ad1f-a9c177a63668	580154db-7074-40a4-864e-494cbb57c63d	00000000-0000-0000-0000-000000000031	\N	Analyze Call Discussion Points	Analyze the discussion points from the client call to determine the project's deliverables, deadlines, and potential blockers. This analysis will help identify areas that require attention and inform the creation of additional tickets.	task	high	to_do		\N	t	f	2026-04-06 14:19:38.803084+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
1f135afa-4c15-4b37-8339-37ca13b8b1de	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Ensure Quick Content Approvals	Prioritize approvals on the updated content to avoid delays in the campaign.	account_management	high	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
6f37fae6-748a-411e-b755-6adff17b9d9f	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Notify of Tracking Requirement Changes	Inform Abhishek in advance of any changes in tracking requirements to ensure smooth implementation.	task	low	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
d0297408-645c-4420-aa5a-b169b2cabc03	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Schedule Follow-up Meeting	Connect again after the updated content is live to review campaign performance and discuss next steps.	task	normal	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
8c31c932-3651-4516-b329-a20fe0c4ab93	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Narrow Down Campaign Targeting	Use initial engagement data to narrow down the campaign targeting for better performance.	task	normal	to_do		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
7b5566d2-eed4-4bec-9552-54786cdbbfa7	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	\N	Email Abhishek with Meeting Notes	Send an email to Abhishek with the meeting notes and action items for his reference, including the discussion on campaign performance, content updates, and technical requirements.	task	normal	to_do		\N	t	t	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	\N	1	2026-03-30 13:51:08.424+00	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
531aad1a-2b3d-4592-bfb6-67b7d2d1fccc	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000011	Prepare Retargeting Campaign Content	Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone.	design	normal	in_progress		\N	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	2026-04-09	0	\N	f	0	4dff6e4d-feb4-4c8d-815f-eb76ec150f33	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00000000-0000-0000-0000-000000000071	\N	00000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000011	Email Automation Setup	Configure drip email sequence in HubSpot for Nexus Digital onboarding flow. 5-email sequence over 14 days with dynamic content personalization.	development	high	in_progress		6.00	f	f	2026-03-19 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
00000000-0000-0000-0000-000000000070	\N	00000000-0000-0000-0000-000000000033	\N	Holiday Promo Landing Page	Design and develop a holiday promotions landing page for Stark Ent. Includes hero section, product highlights, countdown timer, and CTA.	design	urgent	in_progress		32.00	f	f	2026-03-20 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00000000-0000-0000-0000-000000000076	\N	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000014	Email Campaign Redesign	Full redesign of Evergreen Retail email templates. Mobile-first approach, updated brand colors, improved CTA placement. Deliver 3 template variants.	design	high	in_progress		18.00	f	f	2026-03-20 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00000000-0000-0000-0000-000000000075	00000000-0000-0000-0000-000000000052	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000015	Competitor SEO Audit	Comprehensive competitor SEO analysis for Lumina Tech in the SaaS analytics space. Identify keyword gaps and backlink opportunities.	task	normal	in_progress		12.00	t	f	2026-03-21 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000073	\N	00000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000001	Facebook Pixel Audit	Audit Nexus Digital Facebook Pixel implementation across all landing pages. Verify event tracking accuracy and fix any misfires.	development	normal	in_progress		3.00	f	f	2026-03-22 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
00000000-0000-0000-0000-000000000077	\N	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000013	Zapier Integration Debug	Diagnose and fix Zapier workflow failures between Evergreen Retail Shopify store and their email marketing platform.	development	high	in_progress		1.50	f	f	2026-03-23 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
b21e0772-d589-4511-aae5-b350fed03f25	\N	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000013	email sarah	email to sarah regarding task completed	task	high	in_progress		\N	f	f	2026-03-28 10:13:26.182487+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
b6a4b3ac-aaa2-496f-bf7a-d4112c6d7b9b	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000011	The database optimization must be completed before launch, including proper i...	The database optimization must be completed before launch, including proper indexing.	development	normal	in_progress		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
62b0f54c-99af-4c96-ae0b-7eef2503f541	13c38a94-309f-4b52-b627-7b49d0678df4	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000011	Implement caching for the product catalog data to improve response times	We should implement caching for the product catalog data to improve response times.	development	high	in_progress		\N	t	f	2026-03-28 11:49:14.46779+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	7161a043-06b5-40ce-b445-7da727c3ea97	cc1a9d4a-057e-4c65-8689-27e034c53dcf	00000000-0000-0000-0000-000000000011	Develop Retargeting Campaign Content	Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone. The content should be ready for review and approval as per the campaign timeline.	design	normal	client_review	do the again resolved	5.33	t	f	2026-03-31 06:41:44.0919+00	2026-04-28 10:17:15.151061+00	2026-04-03	0	\N	f	1	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
9542d756-6674-4dde-b4c3-94d1095da521	84e82088-1ebb-4a53-b1ac-9907fba93d01	00000000-0000-0000-0000-000000000032	\N	Finalize Feature List	Complete testing and finalize features by the end of the week to ensure a stable version for launch.	development	high	to_do		\N	t	f	2026-03-30 14:12:50.385231+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
9ea6a90e-1e64-4817-b578-90fcf741a531	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Refine Landing Page Messaging	Update the landing page messaging to better align with ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval.	task	normal	in_progress		\N	t	f	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	2026-04-10	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
d280bebb-ce44-4039-8a89-09b7060c1ffd	a0d1daa1-7ccd-416a-96f9-18c7ef81e989	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Create Project Plan	Create a project plan based on the client's requirements and the information gathered from the call transcript. The plan should include deliverables, deadlines, and milestones. This task will help ensure the project stays on track and meets the client's expectations.	task	normal	in_progress		\N	t	f	2026-03-30 14:53:21.067777+00	2026-04-28 10:17:15.151061+00	2026-04-08	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
63ebc0ee-87c3-460c-b61e-8df258cafda4	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	\N	Complete Payment Gateway Testing	Finish testing the payment gateway to ensure smooth functionality before the product launch. This involves thorough quality assurance to identify and fix any bugs in the checkout flow.	development	high	to_do		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
2bf10474-9518-4e0a-9038-d87fab08eed7	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Design Database Schema for Time Logs	Create a database schema to store time logs, including fields for start and stop times, user ID, and ticket ID. The schema should be designed to support the new timer functionality and analytics requirements.	development	high	in_progress		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	2026-04-17	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
b577bfbd-44c0-4dd7-8832-9b1ef847e713	84e82088-1ebb-4a53-b1ac-9907fba93d01	00000000-0000-0000-0000-000000000032	\N	Arrange Additional QA Support	Provide one more QA resource for faster testing to support the development team.	task	normal	to_do		\N	t	f	2026-03-30 14:12:50.385231+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
180966aa-9952-42c4-ab36-b869c3866b92	84e82088-1ebb-4a53-b1ac-9907fba93d01	00000000-0000-0000-0000-000000000032	\N	Prepare Marketing Campaigns	Prepare pre-launch campaigns, including social media creatives and ad planning, but hold the final launch date confirmation.	task	normal	to_do		\N	t	f	2026-03-30 14:12:50.385231+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
8465d5bf-172f-4eaa-93bb-f7f59ece62a1	84e82088-1ebb-4a53-b1ac-9907fba93d01	00000000-0000-0000-0000-000000000032	\N	Monitor and Update Project Timeline	Keep communication tight and share updates if timelines shift to mitigate potential delays.	task	normal	to_do		\N	t	f	2026-03-30 14:12:50.385231+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
a3ba3312-4842-4297-9059-73999b628599	84e82088-1ebb-4a53-b1ac-9907fba93d01	00000000-0000-0000-0000-000000000032	\N	Confirm Pricing and Key Features for Product Launch	Finalize and confirm the pricing at $1500 and key features to highlight in marketing campaigns to ensure alignment with product messaging and pre-launch campaigns.	account_management	high	to_do		\N	t	t	2026-03-30 14:12:50.385231+00	2026-04-28 10:17:15.151061+00	\N	1	2026-03-30 14:14:37.052+00	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
d5143d1f-eb5e-4016-82ef-13cbfb33dd04	6f07891a-cdda-4571-9d0f-2ee43dcf9c25	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Analyze Client Requirements	Analyze the client's requirements and identify potential project deliverables.	task	high	to_do		\N	t	f	2026-03-30 14:41:03.938955+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f1b93f9e-ca10-4ac1-906b-dbe57d8e82c9	acd8cfda-db83-48df-b2c2-ee9c569c8d26	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Create Project Action Plan	Create a detailed project action plan based on the call transcript and additional notes. The plan should outline key tasks, responsibilities, and deadlines to ensure the project stays on track. This plan will serve as a guide for the project team.	task	high	to_do		\N	t	f	2026-04-06 10:10:30.611724+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
dbd7cc1f-f44e-4f22-9b95-e59acf8fa5b5	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Develop API for Ticket Aggregation and Duration Calculations	Complete the API to support ticket aggregation and duration calculations for the detailed member page, ensuring backend support is coordinated.	development	high	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
66163497-1d68-4416-9fa5-84f31493f13b	adfe03bc-1bff-4237-8ea9-cbbf9676ab18	00000000-0000-0000-0000-000000000031	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-30 14:54:23.242532+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
dacf4abd-7f1e-44c3-8b73-0054dfec11bd	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Implement Role-Based Access Control (RBAC) for Member Details Page	Ensure only users with the 'view_member_detail' permission can access the detailed member page, and implement a lower-level permission like 'view_team' for the inline expansion.	development	high	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
3f2fd753-6360-4943-b286-1e253014f7ea	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Manage State for Expanded Rows and Ensure Smooth Performance	Handle state for expanded rows while maintaining performance and ensuring navigation doesn’t break user context.	development	normal	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
10425b44-c71f-485a-9e1f-eed74e14facc	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Implement Dynamic Routing for Detailed Page	Use dynamic routing like /member/:id for the detailed member page.	development	normal	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
0384826c-034f-4baa-b318-45bbb2482eff	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Add Skeleton Loaders for Better UX	Implement skeleton loaders for fetching ticket data to improve user experience.	development	normal	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c65caac3-d11a-4740-9b3b-203aed5d3093	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Handle Edge Cases Like Users with No Tickets	Display an empty state message like 'No tickets assigned' for users with no tickets.	development	low	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
01c8044e-6b39-4aab-8035-9eff65e8229c	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Ensure Consistency with Existing Design System	Reuse components like cards and tables to maintain consistency with the existing design system.	design	normal	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
63e68f52-a39a-4574-a230-75ccbac27da0	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Track User Activity on the Detailed Page	Log events like page visits and interactions to support analytics.	development	normal	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
8ec20bce-3bf8-4b5a-ac2a-bafe3bdb0235	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Design Hero Banner for Summer Body Campaign	Design a hero banner for the summer body campaign	design	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
5e461ef9-cdc9-4212-8bf5-39f3e37b6672	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Complete Payment Gateway Testing	Ensure the payment gateway is fully tested and integrated into the product by the end of the week to avoid any delays in the launch timeline.	development	high	in_progress		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	2026-04-17	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
5aecbd6b-0646-4895-bb0d-9a642168ea69	49487bb4-e6e5-4468-b3c5-f21fa14d1b86	00000000-0000-0000-0000-000000000033	\N	Coordinate with Backend Team for API Completion	Work with the backend team to finalize the API for ticket duration and ensure integration is completed.	account_management	high	to_do		\N	t	f	2026-04-06 11:13:02.683012+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
1c6e05d4-1030-4ceb-bfd3-cd951f3006ea	c8083bf0-920b-4ca1-934a-4ff296b2480e	00000000-0000-0000-0000-000000000031	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-30 14:54:52.021153+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c58f052b-64fb-4087-9545-95354227f611	7161a043-06b5-40ce-b445-7da727c3ea97	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Implement Heatmaps for Landing Pages	Add heatmaps to the landing pages to capture more detailed user behavior and provide better insights. This will help in understanding user interactions and optimizing the pages for better performance.	development	high	to_do	add some feature	5.00	t	f	2026-03-31 06:41:44.0919+00	2026-04-28 10:17:15.151061+00	2026-04-16	0	\N	f	1	\N	58b185ff-cb69-4216-92cd-920dab34504e
a1022cca-ae3b-40b1-80c3-09e59fbc6ee6	580154db-7074-40a4-864e-494cbb57c63d	00000000-0000-0000-0000-000000000031	\N	Create Project Management Plan	Create a project management plan based on the analysis of the client call transcript and discussion points. The plan will outline key milestones, deadlines, and responsibilities to ensure successful project execution.	task	high	to_do		\N	t	f	2026-04-06 14:19:38.803084+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
4d0f0223-9a95-46e4-b11f-386c896f58b1	580154db-7074-40a4-864e-494cbb57c63d	00000000-0000-0000-0000-000000000031	\N	Schedule Follow-up Meeting	Schedule a follow-up meeting with the client to review the project management plan and discuss any outstanding issues or concerns. This meeting will help ensure that the project is on track and that the client's needs are being met.	account_management	normal	to_do		\N	t	f	2026-04-06 14:19:38.803084+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
da22425c-8da6-474c-93a0-4bf73e594f5c	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Design Database Schema for Time Logs	Create a database schema to store time logs, ensuring accurate and reliable data tracking. The schema should accommodate the new timer features and activity logs.	development	high	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
337a35a4-3220-4b0c-864d-31fea5d4afd4	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Define API Endpoints for Time Logging	Define secure REST API endpoints for logging time, including start, pause, resume, and stop actions. Ensure API endpoints are properly documented and tested.	development	high	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
35427240-5f3c-4981-845a-541f251b68d3	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Design UI for Timer Controls	Create a user-friendly UI design for timer controls, including start, pause, resume, and stop buttons, as well as clear visual indicators for timer status and idle detection alerts.	design	normal	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
fb93bf01-3323-408e-bc8b-d70bd7b524c4	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Share Proposal with the Client	Prepare and share the proposed solution with the client, including the technical approach, timeline, and expected outcomes. Ensure the client is informed and aligned with the project plan.	account_management	normal	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
1f6d8fd7-e691-4947-9d81-fe7ca0f6e7c2	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Implement Idle Detection Feature	Develop the idle detection feature to automatically pause the timer after a period of inactivity. Ensure the feature is properly integrated with the timer controls and API endpoints.	development	high	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
1b7a7198-390f-4a78-bca6-dccfbd88aada	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Develop Single Active Timer Feature	Implement the single active timer feature to prevent overlapping timers. Ensure the feature is properly integrated with the timer controls and API endpoints.	development	high	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
08599013-13c5-40d9-955e-7945bdf322a7	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Develop Activity Logs and Audit Trail	Create activity logs to track user actions, such as start, pause, resume, and stop, and maintain a detailed audit trail for reporting and compliance.	development	normal	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c3f19588-0cbc-42b6-82c5-93b1b220d946	91c1ed68-1e97-413c-b033-34187370c649	00000000-0000-0000-0000-000000000031	\N	Implement Automatic Reminders for Long-Running Timers	Develop a feature to send automatic reminders if a timer runs for an unusually long duration. Ensure the feature is properly integrated with the timer controls and API endpoints.	development	normal	to_do		\N	t	f	2026-04-10 09:44:19.499225+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
11b61e31-5f3c-45cc-aa9c-cf3abf794d52	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Design UI for Timer Controls	Design a user-friendly UI for timer controls, including start, pause, resume, and stop buttons, as well as clear visual indicators for timer status. The design should also include alerts for idle detection and reminders for long-running timers.	design	normal	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
2749ab39-adde-470b-9d25-aa3aa6ca276a	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Share Proposal with Client	Share the proposed solution with the client, including the technical approach, timeline, and expected outcomes. The proposal should address the client's concerns and provide a clear understanding of the improvements to the timesheet tracking system.	account_management	normal	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
de808c61-73e5-411a-8177-a3ae058d7a63	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Implement Idle Detection	Implement idle detection functionality to automatically pause timers after a period of inactivity. The implementation should include server-side checks to prevent overlapping timers and ensure data consistency.	development	high	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
a0fc1993-d225-4d7d-a62a-e815c2bb69ef	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Develop Activity Logs and Audit Trail	Develop activity logs to track user actions, such as start, pause, resume, and stop, and maintain a detailed audit trail for reporting and compliance. The implementation should include secure storage and retrieval of log data.	development	normal	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
3dfa56a6-0679-4415-816f-119ab3ba0c3b	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Ensure Consistent Brand Tone	Ensure the tone of the retargeting campaign stays consistent with the brand.	design	normal	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
4721e25a-2ce5-4bae-8ed3-1b2f0f1244a5	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	\N	Arrange Additional QA Resource	Provide one more QA resource to support faster testing of the product, especially focusing on the payment gateway integration and checkout flow.	task	normal	to_do		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
b0d2286b-90fb-478d-9ca1-b4dfc77db609	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	\N	Finalize Feature List by End of Week	Stabilize the product features by the end of the week to confirm the final list for marketing and launch preparations.	development	high	to_do		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
27a15382-a56b-42bf-96ca-d940fb73d9e3	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	\N	Prepare Marketing Campaigns	Continue preparing marketing campaigns, including social media creatives and ad plans, but hold off on final launch date confirmation until the product timeline is finalized.	task	normal	to_do		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
34bc26ea-3630-488e-976c-450d96cfba60	adfe03bc-1bff-4237-8ea9-cbbf9676ab18	00000000-0000-0000-0000-000000000031	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-30 14:54:23.242532+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
4ba222ac-5fe9-481a-ab02-c3c35fa0a0ca	7f17a698-327b-429f-9e48-c7db66937081	00000000-0000-0000-0000-000000000031	\N	Enhance Landing Page Insights and Content	Include heatmaps to track user behavior on at least 5 landing pages for better insights and campaign optimization. Also, refine the landing page messaging to align with ad creatives and ensure consistent brand tone across all content.	development	high	to_do		\N	t	t	2026-04-06 11:17:52.574675+00	2026-04-28 10:17:15.151061+00	\N	1	2026-04-06 11:25:49.929+00	t	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
92b6faf1-79da-4c42-9790-789827e0bc4b	ab691889-ab7d-4cb0-aab9-9bca276ad087	00000000-0000-0000-0000-000000000035	\N	Confirm Pricing and Key Features for Marketing	Finalize the pricing and key features of the product to provide to the marketing team for campaign alignment and messaging.	account_management	normal	to_do		\N	t	f	2026-04-06 10:42:34.66776+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
eedff37b-1dc1-440c-a329-5e58a2b8116c	cbfedfc6-9d96-43d1-bb12-f2d51e2ef78b	00000000-0000-0000-0000-000000000031	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-28 11:31:28.911861+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
79a35037-d863-41fa-a81f-f381a5b6e568	cbfedfc6-9d96-43d1-bb12-f2d51e2ef78b	00000000-0000-0000-0000-000000000031	\N	Set up tracking	Implement UTM parameters and analytics tracking for campaign links.	development	normal	to_do		\N	t	f	2026-03-28 11:31:28.911861+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
c83fb927-0b85-4241-abd0-b8fcc7e1c643	cc6704b3-e2fe-46ea-8293-90a0bf9e2052	00000000-0000-0000-0000-000000000031	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-28 11:33:33.920285+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
d35ef465-3eea-4f79-841d-def28bb04143	cc6704b3-e2fe-46ea-8293-90a0bf9e2052	00000000-0000-0000-0000-000000000031	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-28 11:33:33.920285+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
4b70fc6a-5da4-46e5-b62d-d48a748fc8f2	9494c735-437f-4ceb-9e85-3e1d2656f56d	00000000-0000-0000-0000-000000000032	\N	Develop Reporting Dashboards for Administrators	Develop reporting dashboards for administrators to provide insights into time tracking data, including metrics on timer usage, user activity, and system performance. The dashboards should be user-friendly and provide actionable data for decision-making.	development	normal	to_do		\N	t	f	2026-04-16 05:43:12.821985+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
1887fd34-d455-4fc0-9fa8-c122093782dd	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Arrange Additional QA Resource	Provide one more QA resource to support faster testing of the product, especially focusing on the checkout flow and payment integration.	task	normal	to_do		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
ac9cb115-0613-4146-a7a6-bbfb7c7fa858	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Finalize Feature List	Freeze the feature list by the end of the week to ensure clarity on what will be included in the product launch.	development	high	to_do		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
bceaaa9d-be1e-4bdd-a268-49173df08566	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Confirm Pricing and Key Features for Marketing	Provide final confirmation on pricing and key features to the marketing team to ensure alignment with product messaging.	account_management	normal	to_do		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
27157607-9d21-449d-b23f-7b5dbeea4a71	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Prepare Marketing Campaigns	Continue preparing marketing campaigns, including social media creatives and ad plans, but hold off on final launch date confirmation until the product timeline is confirmed.	task	normal	to_do		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
4f46c128-0562-46b8-aeb3-11cf819964ad	6631c521-e5d5-4a17-b256-d49909128dc4	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Monitor Product Timeline for Potential Delays	Keep a close eye on the product development timeline to identify any potential delays that could impact marketing campaign schedules.	task	high	to_do		\N	t	f	2026-04-16 06:16:01.901165+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
e4b62aef-3eb2-496f-a02b-e425f327ed94	309fff39-ce76-4295-8c91-39362846cecf	00000000-0000-0000-0000-000000000033	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-30 08:19:14.555108+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
262885a7-fb9e-4229-9ebc-bd7445452da8	6f07891a-cdda-4571-9d0f-2ee43dcf9c25	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	\N	Create Project Timeline	Create a project timeline to outline key milestones and deadlines.	task	high	to_do		\N	t	f	2026-03-30 14:41:03.938955+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
c580cf70-7f24-46cb-b175-a6f8320ac957	b6101d65-b1cb-45e6-b531-acd510d91b30	00000000-0000-0000-0000-000000000032	\N	Design Database Schema for Time Logs	Create a database schema to store time logs, ensuring accurate and reliable tracking of time spent on tickets.	development	high	to_do		\N	t	f	2026-04-20 12:46:23.447142+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
7084e789-44da-4678-9009-d08edb7a510a	b6101d65-b1cb-45e6-b531-acd510d91b30	00000000-0000-0000-0000-000000000032	\N	Define API Endpoints for Time Logging	Define secure REST API endpoints for logging time, including start, pause, resume, and stop actions.	development	high	to_do		\N	t	f	2026-04-20 12:46:23.447142+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
81bc2f0a-559d-4fc4-9c4e-f5d21571003b	b6101d65-b1cb-45e6-b531-acd510d91b30	00000000-0000-0000-0000-000000000032	\N	Design UI for Timer Controls	Create a user-friendly UI for timer controls, including start/pause/resume/stop buttons, idle detection alerts, and real-time timer updates.	design	normal	to_do		\N	t	f	2026-04-20 12:46:23.447142+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
301b9853-7b41-4376-85a5-4fdeee1eaa2b	b6101d65-b1cb-45e6-b531-acd510d91b30	00000000-0000-0000-0000-000000000032	\N	Share Proposal with Client	Share the proposed solution with the client, including the technical approach and timeline for implementation.	account_management	normal	to_do		\N	t	f	2026-04-20 12:46:23.447142+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
1d61b7d3-0892-41a9-8a9a-c4786eadfdba	b6101d65-b1cb-45e6-b531-acd510d91b30	00000000-0000-0000-0000-000000000032	\N	Implement Idle Detection	Implement idle detection feature to automatically pause the timer after a period of inactivity.	development	high	to_do		\N	t	f	2026-04-20 12:46:23.447142+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
6f6e0079-28a4-4564-bc34-0c7f8c435cd0	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Refine Landing Page Messaging	Update the landing page messaging to better align with the ad creatives for improved conversion rates. Revised copies and headlines are expected by tomorrow for approval.	design	high	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
910cca50-87ab-48b7-810f-71aabc5f1d3c	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Optimize Campaign Targeting	Narrow down the campaign targeting based on initial engagement data for more effective audience reach.	task	normal	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
882a0745-4278-4598-83dd-de3955d859fd	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Implement Heatmaps for Landing Pages	Add heatmaps to the landing pages for better insights into user behavior and interactions.	development	normal	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
466e327b-612e-401a-b728-8f73f4453d1d	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Develop Retargeting Campaign Content	Create personalized and action-driven content for the retargeting campaign, focusing on benefits and urgency while maintaining a consistent brand tone.	design	high	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
cecb3e56-1cd6-4854-9463-3f86f4df67ca	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Ensure Timely Content Approvals	Prioritize approvals for updated content to avoid delays in campaign implementation.	account_management	urgent	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
c9c1b24e-11b5-47fc-902c-a7282156b8b5	1cb39741-0cc2-4a58-a116-4b039f5a04dc	00000000-0000-0000-0000-000000000031	\N	Monitor and Adjust Tracking Requirements	Keep track of any changes in tracking requirements and notify the development team in advance for smooth implementation.	task	low	to_do		\N	t	f	2026-04-21 07:38:24.284673+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f70e1fc1-2ef9-4452-b5f6-ae398acd5191	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Update Creative Brief for Summer Body Campaign	Update the creative brief to include three video ads per platform and send to the design team	task	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
8b75443e-7cd5-4013-a8ef-118ddee0813c	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Develop Before and After Testimonial Section	Develop a before and after testimonial section for the landing page	development	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
3cb02b67-e325-49c6-8a13-9d30325eb2d2	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Write Landing Page Copy for Summer Body Campaign	Write the landing page copy for the summer body campaign	task	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
7848aa32-3166-438c-87c7-e4a4e95cfe56	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Design Ad Creatives for Summer Body Campaign	Design six static ads and three video ads for Facebook and Instagram	design	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
f5e6e8a3-53ec-47cb-a315-600fc3ef8754	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Review and Approve Landing Page Copy	Review and approve the landing page copy by April 7th	account_management	high	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
e5d287fa-2aff-40da-8749-6472165ae159	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Design HTML Email Templates for App Relaunch	Design HTML email templates for the app relaunch email sequence	design	normal	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
a11222c8-be72-46b8-9a63-1c2d55d9958d	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Update App Store Screenshots	Update the app store screenshots for the app relaunch	design	normal	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
1fbb59a6-f821-45dd-a905-9ec942ca2d2c	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Write Press Release for App Relaunch	Write a press release for the app relaunch by April 12th	task	normal	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
a64615da-0f14-478a-9bb3-b09228eadee2	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Develop UTM Tracking Setup	Set up proper UTM parameters for all campaign links	development	normal	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
5be624cb-2e44-411f-9322-408d7b2bbf21	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Update Media Plan with New Budget Allocation	Update the media plan to reflect the new budget allocation and send to Priya by end of the week	task	normal	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
d3724dec-d4b7-487c-9983-038b63165388	8768f02d-8a2e-4af1-a3f9-fabc0405a313	00000000-0000-0000-0000-000000000036	\N	Write Campaign Strategy Document for Gym Equipment Product Line	Write a campaign strategy document for the gym equipment product line by end of April	task	low	to_do		\N	t	f	2026-04-23 05:15:38.072239+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
ce3b3629-ad3c-4444-8f03-933ffa301547	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Refine Landing Page Messaging	Update the landing page messaging to better align with the ad creatives to improve conversion rates. Revised copies and headlines need to be shared for approval.	task	high	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
391d0026-2ece-4a5f-8944-e209813d1272	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Share Revised Copies and Headlines	Share revised copies and headlines for the lead generation campaign by tomorrow for client approval.	task	high	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
1e6477ad-76f9-4f4d-b7b0-dbe7f8e8d88c	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Narrow Down Campaign Targeting	Use initial engagement data to narrow down the target audience for the lead generation campaign.	task	normal	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
6a97e402-fa6d-49eb-abb1-550d4f2b16a9	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Add Heatmaps for Landing Page Insights	Include heatmaps to track user behavior on the landing pages for better insights.	development	normal	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
1526f31c-7cf0-40af-afbc-0fc4c90df51e	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Plan Retargeting Campaign	Prepare a new campaign focused on retargeting users who visited but didn’t convert, with personalized and action-driven messaging.	task	normal	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
a7ba439f-7ba2-46f5-ae3d-d0c347ad2773	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Prioritize Content Approval	Prioritize approvals on the updated content to avoid delays in the campaign.	account_management	high	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
ffa2776d-2239-415f-8ec7-819b37d4e23c	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Notify of Tracking Requirement Changes	Notify the team of any changes in tracking requirements in advance to implement them smoothly.	task	low	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
3117620f-7121-40cb-810b-18174c19bf7c	05144ace-8865-4099-982e-ea8399992000	cc1a9d4a-057e-4c65-8689-27e034c53dcf	\N	Schedule Follow-up Meeting	Schedule a follow-up meeting after the updated content is live to review campaign performance.	task	normal	to_do		\N	t	f	2026-04-23 12:28:10.24497+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
f3c5c3db-fde7-44e5-b62f-55d2b275d618	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Update Creative Brief	Update the creative brief to reflect changes in the campaign, including three video ads per platform and send to the design team	task	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
58cf66ea-2762-48f8-9366-c96b05b75dbc	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Design Hero Banner	Design the hero banner for the summer body transformation campaign	design	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
6b740546-d61c-478b-9cb0-31c8d8b9f4ba	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Develop Landing Page Testimonials Section	Develop a new section on the landing page for before and after customer testimonials	development	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
269e3a65-124e-493f-bca1-2a64b78a5462	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Write Landing Page Copy	Write the copy for the summer body transformation campaign landing page, using the provided brand tone of voice doc	task	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
02cdd2a7-06b3-467f-b8cf-95331b39c472	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Design Facebook and Instagram Ad Creatives	Design six static ads and three video ads for Facebook and Instagram	design	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
d473f835-830c-4ba9-b981-19f49563daaa	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Review and Approve Landing Page Copy	Review and approve the landing page copy by April 7th	task	high	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
d7c51319-b836-4cf7-adbe-73ddf380bfdd	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Design HTML Email Templates	Design HTML templates for the email sequence announcing the app relaunch	design	normal	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
2eed9e78-5f50-49a9-8b98-671e5a74af78	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Update App Store Screenshots	Update the app store screenshots for the app relaunch	design	normal	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
278b3dd5-c064-447b-951d-b968dbc71cbc	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Write Press Release	Write a press release for the app relaunch, to be distributed by the PR agency	task	normal	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
e011cfb5-e059-469b-a075-0b03343ed4a9	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Develop UTM Tracking Setup	Set up proper UTM parameters for all campaign links	development	normal	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
aa6f79ba-977c-40e3-be72-15251bf30603	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Update Media Plan	Update the media plan to reflect the additional budget and allocate sixty percent to Instagram, thirty to Facebook, and ten to Google retargeting	task	normal	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
3b0cbb16-7883-4feb-8783-f84505b4a15d	43c7e9db-68ad-4f35-971f-779d9f757aae	00000000-0000-0000-0000-000000000031	\N	Write Equipment Line Campaign Strategy	Write a campaign strategy document for the gym equipment product line by the end of April	task	low	to_do		\N	t	f	2026-04-24 15:37:18.088139+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000067	\N	00000000-0000-0000-0000-000000000032	00000000-0000-0000-0000-000000000013	Social Media Engagement Report	Monthly social media performance report for Globex across LinkedIn, Twitter/X, and Instagram. Include engagement trends and competitor benchmarking.	task	low	completed		4.00	f	f	2026-03-06 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
00000000-0000-0000-0000-000000000068	\N	00000000-0000-0000-0000-000000000033	00000000-0000-0000-0000-000000000011	API Connection Error — CRM	Debug and resolve intermittent connection failures between Stark Ent CRM and the marketing automation platform. Root cause analysis and fix.	development	urgent	completed		4.00	f	f	2026-03-11 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
00000000-0000-0000-0000-000000000078	\N	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000012	LinkedIn Banner Package	Design a set of LinkedIn banner assets for Evergreen Retail brand refresh. Include company page cover, personal profile banners for exec team.	design	low	completed		6.00	f	f	2026-03-01 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000052	00000000-0000-0000-0000-000000000035	00000000-0000-0000-0000-000000000011	Q4 Meta Ad Strategy	Develop full Meta advertising strategy for Lumina Tech Q4 push. Includes audience segmentation, creative brief, budget allocation, and A/B testing plan.	task	urgent	completed	do again	20.00	t	f	2026-03-23 17:34:36.425223+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	1	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
50dbc0c0-ea8a-4936-bd54-f0a72f18634e	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Design Hero Banner	Design the hero banner for the summer body transformation campaign	design	urgent	completed		5.00	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	2026-03-30	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
b1cf3b63-8f52-45be-89db-68a7f41f7e28	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Update Creative Brief	Update the creative brief to include three video ads per platform and send to the design team	task	high	completed		5.00	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	2026-04-01	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
7247f5aa-f63a-4449-8b85-f7ad5d0ee94f	1dd13722-6b2e-45f6-acca-8298e69820b0	00000000-0000-0000-0000-000000000036	00000000-0000-0000-0000-000000000011	Add Heatmaps for Landing Page Insights	Include heatmaps to track user behavior on the landing pages for better insights and campaign optimization.	development	normal	completed		5.00	t	f	2026-03-30 13:48:33.207103+00	2026-04-28 10:17:15.151061+00	2026-04-08	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
2afe7e9d-d9cc-4a80-a7b3-f7f76f732a3f	7161a043-06b5-40ce-b445-7da727c3ea97	cc1a9d4a-057e-4c65-8689-27e034c53dcf	00000000-0000-0000-0000-000000000011	Ensure Timely Approvals and Tracking Updates	Coordinate with the client to ensure quick approvals on updated content and notify the team about any changes in tracking requirements to avoid delays and implement changes smoothly.	account_management	high	completed	note	0.00	t	f	2026-03-31 06:41:44.0919+00	2026-04-28 10:17:15.151061+00	2026-04-09	0	\N	f	1	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000011	Review Landing Page Copy	Review the landing page copy by April 7th	task	normal	completed	add name	5.00	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	2026-03-30	0	\N	f	2	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
981d58c2-e2e9-46b5-94fb-7e6a7316858d	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000011	Write Equipment Line Strategy	Write the campaign strategy document for the gym equipment product line by end of April	task	high	completed	efh5u	2.00	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	2026-04-15	0	\N	f	2	cf363972-a80e-45e2-807e-a1064805e106	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
ff26d6b8-a2be-45e0-a265-49bd889835b1	6f07891a-cdda-4571-9d0f-2ee43dcf9c25	aa01b0c1-c619-4bd5-a11b-97e9b873fcaf	00000000-0000-0000-0000-000000000011	Assign Project Tasks	Assign project tasks to team members and set deadlines for completion.	task	normal	completed	new feature	50.00	t	f	2026-03-30 14:41:03.938955+00	2026-04-28 10:17:15.151061+00	2026-04-09	0	\N	f	3	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
597bb41f-023d-4911-8a8f-7c36c99ab846	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	00000000-0000-0000-0000-000000000011	Design Ad Creatives for Summer Body Campaign	Design six static ads and three video ads per platform for the summer body campaign	design	high	completed		0.50	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	2026-03-31	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
a8242359-ed9a-40bd-9afd-92e3edbe18b1	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Design App Store Screenshots	Design the app store screenshots for the app relaunch	design	normal	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
b85df8db-1aaa-4d7f-906c-42ecaff5b059	37bbd058-13fb-4d31-9e53-219deef33375	00000000-0000-0000-0000-000000000031	\N	Add Mail to Jodar	Add mail functionality to Jodar as discussed in the client call	development	normal	to_do		\N	t	f	2026-03-30 08:43:50.467554+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
4ad54449-00a3-4b07-b1cb-895692d4d058	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Design Ad Creatives	Design six static ads and three video ads for Facebook and Instagram	design	high	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
b118e5b6-3808-490a-b64e-fb4e1a85a041	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Develop Landing Page Testimonials Section	Develop a before and after section with customer testimonials on the landing page	development	normal	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	58b185ff-cb69-4216-92cd-920dab34504e
b0eb3583-5266-4f12-b3e2-343747a1480e	fa42f93f-434a-4a20-b9f8-3bcd655b7c8e	00000000-0000-0000-0000-000000000031	\N	The bundle size should be optimized for better mobile performance	The bundle size should be optimized for better mobile performance.	design	normal	to_do		\N	t	f	2026-03-28 11:43:55.157409+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
12f6fdff-c7c3-42c3-90bc-0f425086dc4f	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Design HTML Email Templates	Design the HTML templates for the email sequence	design	normal	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
bb73ff09-13a6-4501-a783-6518e76fcd1b	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Write Press Release	Write the press release for the app relaunch by April 12th	task	high	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
5991a412-8077-48fc-af86-abfc02fd70b0	88c00963-5888-45e0-b86b-1b79437044ad	00000000-0000-0000-0000-000000000031	\N	Update Media Plan	Update the media plan to reflect the additional budget and send to Priya by end of the week	task	high	to_do		\N	t	f	2026-03-30 08:47:57.25928+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
2a3caa3d-3432-4cfb-90bf-bc66253c0b73	187a1d57-2ae0-458c-8c82-31c05e07163e	00000000-0000-0000-0000-000000000034	\N	Write Landing Page Copy for Summer Body Campaign	Write the landing page copy for the summer body campaign	task	high	to_do		\N	t	f	2026-03-30 08:51:51.703777+00	2026-04-28 10:17:15.151061+00	\N	0	\N	f	0	\N	d1fa8182-1ccd-430a-a7a4-e2c057ef5cdb
8fa8868a-0199-41ac-a93b-653b43725a21	c8083bf0-920b-4ca1-934a-4ff296b2480e	00000000-0000-0000-0000-000000000031	\N	Review campaign brief	Review and finalise the campaign brief discussed on the call.	account_management	normal	to_do		\N	t	f	2026-03-30 14:54:52.021153+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	d68649dc-bb81-46cb-9db2-2e49f73a7cde
5102417c-56e4-4cde-9899-0cdfe9a2f8a0	c8083bf0-920b-4ca1-934a-4ff296b2480e	00000000-0000-0000-0000-000000000031	\N	Create content assets	Design and produce the content assets required for the upcoming campaign.	design	high	to_do		\N	t	f	2026-03-30 14:54:52.021153+00	2026-04-28 10:17:15.151061+00	\N	0	\N	t	0	\N	c3971884-bc2c-4c4a-b7a5-6a8212a6fb0e
\.


--
-- Data for Name: time_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_logs (id, ticket_id, user_id, hours, comment, log_type, created_at, updated_at, revision_cycle) FROM stdin;
00000000-0000-0000-0000-000000000083	00000000-0000-0000-0000-000000000062	00000000-0000-0000-0000-000000000013	4.00	Keyword research	partial	2026-03-19 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000084	00000000-0000-0000-0000-000000000062	00000000-0000-0000-0000-000000000013	8.00	On-page optimization	partial	2026-03-23 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000085	00000000-0000-0000-0000-000000000064	00000000-0000-0000-0000-000000000012	2.00	Client review calls	partial	2026-03-21 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000086	00000000-0000-0000-0000-000000000066	00000000-0000-0000-0000-000000000015	6.00	Primary keyword research	partial	2026-03-16 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000087	00000000-0000-0000-0000-000000000066	00000000-0000-0000-0000-000000000015	6.00	Long-tail analysis	partial	2026-03-21 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000088	00000000-0000-0000-0000-000000000067	00000000-0000-0000-0000-000000000013	4.00	Report completed	final	2026-03-16 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000089	00000000-0000-0000-0000-000000000068	00000000-0000-0000-0000-000000000011	3.50	Debugging and fix deployed	final	2026-03-19 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000090	00000000-0000-0000-0000-000000000069	00000000-0000-0000-0000-000000000012	4.00	Report drafted	partial	2026-03-22 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000091	00000000-0000-0000-0000-000000000071	00000000-0000-0000-0000-000000000011	4.50	HubSpot workflow setup	partial	2026-03-24 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000092	00000000-0000-0000-0000-000000000072	00000000-0000-0000-0000-000000000014	3.80	Report compiled	final	2026-03-23 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000093	00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000011	1.50	Kickoff and audience research	partial	2026-03-26 15:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000094	00000000-0000-0000-0000-000000000075	00000000-0000-0000-0000-000000000015	5.00	Competitor landscape mapping	partial	2026-03-25 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000095	00000000-0000-0000-0000-000000000076	00000000-0000-0000-0000-000000000014	8.00	Template design v1	partial	2026-03-23 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000096	00000000-0000-0000-0000-000000000077	00000000-0000-0000-0000-000000000013	1.20	Diagnosed and patched Zap	partial	2026-03-26 12:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
00000000-0000-0000-0000-000000000097	00000000-0000-0000-0000-000000000078	00000000-0000-0000-0000-000000000012	6.00	All banners delivered	final	2026-03-11 17:34:36.425223+00	2026-03-31 09:44:54.433117+00	0
cb17ae98-2503-4617-ab88-8f7dfaafedab	40682b46-d3de-4f7b-81c0-34eafa729d79	00000000-0000-0000-0000-000000000011	2.00	resolved  create assets 	partial	2026-03-28 11:35:57.429791+00	2026-03-31 09:44:54.433117+00	0
5b8fcb6e-c891-40a2-af97-69b220d3e0e4	40682b46-d3de-4f7b-81c0-34eafa729d79	00000000-0000-0000-0000-000000000011	0.00	completed	final	2026-03-28 11:36:07.451336+00	2026-03-31 09:44:54.433117+00	0
63be3934-300b-40b5-b71a-5680c5a26621	00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000011	1.00	add mail	partial	2026-03-30 05:47:12.223601+00	2026-03-31 09:44:54.433117+00	0
178d45bb-a908-41c9-9e2f-3e76f66c62b1	00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000011	0.00	resolveed	final	2026-03-30 06:57:23.944945+00	2026-03-31 09:44:54.433117+00	0
49c8c7a6-2126-473e-a298-6dd4f1cd2bc6	8827d2d3-4349-4ecd-a793-7ca638ad7e19	00000000-0000-0000-0000-000000000011	1.00	setuped tracking	partial	2026-03-30 07:23:57.150765+00	2026-03-31 09:44:54.433117+00	0
54154952-5b5e-4ce8-b5d0-224b86032ef8	d29c5547-d5e7-41ab-b9bb-a8785838a2f3	00000000-0000-0000-0000-000000000011	1.00	staring	partial	2026-03-30 08:20:54.009603+00	2026-03-31 09:44:54.433117+00	0
70ef57a9-b81f-4634-acc9-06765bac8110	8827d2d3-4349-4ecd-a793-7ca638ad7e19	00000000-0000-0000-0000-000000000011	1.00	complere	final	2026-03-30 10:44:23.395223+00	2026-03-31 09:44:54.433117+00	0
4591d696-98fd-477b-9f65-3d4dd1a753ed	175ad63b-e82c-487c-991f-f807234e9ba4	00000000-0000-0000-0000-000000000011	1.00	half portion of the ticket completed	partial	2026-03-30 14:44:42.099547+00	2026-03-31 09:44:54.433117+00	0
04cba81e-8092-40aa-b247-436aa1af9435	175ad63b-e82c-487c-991f-f807234e9ba4	00000000-0000-0000-0000-000000000011	1.00	full complete	partial	2026-03-30 14:45:16.466133+00	2026-03-31 09:44:54.433117+00	0
e19e54c8-bdee-4cc9-9372-a482529109fe	175ad63b-e82c-487c-991f-f807234e9ba4	00000000-0000-0000-0000-000000000011	2.00	i worked on	final	2026-03-30 14:46:22.567853+00	2026-03-31 09:44:54.433117+00	0
a1d6d844-2da7-4a15-8913-06d8edb315a9	597bb41f-023d-4911-8a8f-7c36c99ab846	00000000-0000-0000-0000-000000000011	0.17	send workflow	partial	2026-03-31 09:51:22.713539+00	2026-03-31 09:51:22.713539+00	0
0fd6c717-4803-412b-84b1-ee6130edadc8	597bb41f-023d-4911-8a8f-7c36c99ab846	00000000-0000-0000-0000-000000000011	0.33	final delivery	partial	2026-03-31 09:52:35.638415+00	2026-03-31 09:52:35.638415+00	0
688b150b-6f9a-49f8-88a3-6bb314591e6f	597bb41f-023d-4911-8a8f-7c36c99ab846	00000000-0000-0000-0000-000000000011	0.50	done	final	2026-03-31 09:52:47.628611+00	2026-03-31 09:52:47.628611+00	0
fdc8b2fb-9649-4948-837d-02d3b8647cd9	64a5f0c7-8857-49c3-addf-18387a9e6778	00000000-0000-0000-0000-000000000001	0.00	ki	final	2026-04-01 09:16:25.208339+00	2026-04-01 09:16:25.208339+00	0
4ce23755-358e-4034-baaa-bc4af5dbc412	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	0.50	d smf	partial	2026-04-01 09:28:47.991555+00	2026-04-01 09:28:47.991555+00	0
5bd9f83a-eb7d-43a4-8550-9c7f77b8d6d0	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	0.53	gfbyt	partial	2026-04-01 09:45:34.906746+00	2026-04-01 09:45:34.906746+00	0
e6e5ec0d-7873-4408-a7de-b9de4b680281	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	1.03	dad	final	2026-04-01 09:49:10.674814+00	2026-04-01 09:49:10.674814+00	0
c7671127-4b37-41ad-88db-bcfb3f989c71	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000001	0.00	resolved	revision	2026-04-01 10:48:42.40155+00	2026-04-01 10:48:42.40155+00	1
66469803-5fd4-47ca-89c7-0ece92463e7e	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	0.33	done	partial	2026-04-01 10:50:01.709125+00	2026-04-01 10:50:01.709125+00	1
7c4ebbee-4cc8-436d-9103-9ca94e7555d8	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	1.36	done	final	2026-04-01 10:50:11.382951+00	2026-04-01 10:50:11.382951+00	1
d01b25b3-d11e-471d-89d9-acc446c745f9	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000001	0.00	do agina	revision	2026-04-01 11:30:36.843435+00	2026-04-01 11:30:36.843435+00	2
de31916a-bd39-437b-8331-6af20ae10142	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	40.00	done	partial	2026-04-01 11:31:07.115577+00	2026-04-01 11:31:07.115577+00	2
e22cc821-4c84-4578-aba1-c5352cc60f1e	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	41.36	copled	final	2026-04-01 11:31:20.373653+00	2026-04-01 11:31:20.373653+00	2
96de7d62-e077-40f2-b169-ada017360635	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000001	0.00	new feature	revision	2026-04-01 11:37:53.535137+00	2026-04-01 11:37:53.535137+00	3
a179d834-64f1-4a3b-a0a0-adebcc3cc045	ff26d6b8-a2be-45e0-a265-49bd889835b1	00000000-0000-0000-0000-000000000011	0.50	feature upated	partial	2026-04-01 11:38:54.008432+00	2026-04-01 11:38:54.008432+00	3
f8335e80-132d-47b4-b2e7-dea608961153	c58f052b-64fb-4087-9545-95354227f611	00000000-0000-0000-0000-000000000011	5.00	done	partial	2026-04-01 11:40:41.125807+00	2026-04-01 11:40:41.125807+00	0
10ac41af-7347-43ce-afa3-0d9d3c6cd611	c58f052b-64fb-4087-9545-95354227f611	00000000-0000-0000-0000-000000000011	5.00	completed	final	2026-04-01 11:40:51.675418+00	2026-04-01 11:40:51.675418+00	0
5aa47acc-04bd-422b-95d0-4eb9c35a7534	c58f052b-64fb-4087-9545-95354227f611	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	add some feature	revision	2026-04-01 11:42:47.130589+00	2026-04-01 11:42:47.130589+00	1
dcb9a8a2-c884-4290-bcc9-d9bc0b38775b	c58f052b-64fb-4087-9545-95354227f611	00000000-0000-0000-0000-000000000011	0.17	done	partial	2026-04-01 11:43:17.868676+00	2026-04-01 11:43:17.868676+00	1
0fdcb12d-6aa5-483a-86c4-9661d5dad34c	c58f052b-64fb-4087-9545-95354227f611	00000000-0000-0000-0000-000000000011	5.17	done	final	2026-04-01 11:43:33.239465+00	2026-04-01 11:43:33.239465+00	1
b78d9efd-b434-4119-a99d-2af8c34ee75e	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	00000000-0000-0000-0000-000000000011	0.50	mj	partial	2026-04-01 12:16:23.70397+00	2026-04-01 12:16:23.70397+00	0
a0c429af-fe39-4731-8159-b551fc2fea78	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	00000000-0000-0000-0000-000000000011	0.50	resolved\n	final	2026-04-01 12:31:42.006+00	2026-04-01 12:31:42.006+00	0
94cd4290-171a-4d81-b201-89c26204b24d	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	00000000-0000-0000-0000-000000000001	0.00	do the again resolved	revision	2026-04-01 12:32:33.477215+00	2026-04-01 12:32:33.477215+00	1
1d89da07-c9d9-43b2-98f2-c5bf670d9e88	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	00000000-0000-0000-0000-000000000011	2.00	resolved again	partial	2026-04-01 12:33:54.888543+00	2026-04-01 12:33:54.888543+00	1
8b6d9ea4-f53e-4c5e-92c2-0603c24ee145	c2ce8bc3-d578-4e47-9b2f-8f7f6dd1d05d	00000000-0000-0000-0000-000000000011	2.50	again resolved 	final	2026-04-01 12:34:07.000381+00	2026-04-01 12:34:07.000381+00	1
066c0afd-cae6-46b0-a3ed-9063cfc0cd05	2afe7e9d-d9cc-4a80-a7b3-f7f76f732a3f	00000000-0000-0000-0000-000000000001	0.00	note	revision	2026-04-01 13:13:36.7391+00	2026-04-01 13:13:36.7391+00	1
7aae5cf2-f292-49db-a8c8-0d28e42bd695	2afe7e9d-d9cc-4a80-a7b3-f7f76f732a3f	00000000-0000-0000-0000-000000000011	0.33	df	partial	2026-04-03 05:24:53.128773+00	2026-04-03 05:24:53.128773+00	1
3b1d78dd-da3b-4b4e-a8ac-a18a99793949	2afe7e9d-d9cc-4a80-a7b3-f7f76f732a3f	00000000-0000-0000-0000-000000000011	0.33	rw	final	2026-04-03 05:25:03.733621+00	2026-04-03 05:25:03.733621+00	1
b451f3c9-645f-4354-95de-8881b60a51d1	00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000001	0.00	do again	revision	2026-04-03 05:26:46.665798+00	2026-04-03 05:26:46.665798+00	1
fd6e7646-faa0-4d63-9053-863cda1f8e77	00000000-0000-0000-0000-000000000074	00000000-0000-0000-0000-000000000011	0.50	resoveld again	partial	2026-04-03 05:27:15.142686+00	2026-04-03 05:27:15.142686+00	1
4d0612d1-a3e7-4890-b856-603e4580158c	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.50	done	partial	2026-04-03 05:31:48.638784+00	2026-04-03 05:31:48.638784+00	0
2163da1b-b155-4c40-b030-3b5b69c921ac	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.50	done	final	2026-04-03 05:32:29.922041+00	2026-04-03 05:32:29.922041+00	0
d3fb901c-f59e-4c58-bb95-46f71b6cbc84	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	again assign to sarach	revision	2026-04-03 05:32:49.369148+00	2026-04-03 05:32:49.369148+00	1
46cfe7c0-4dee-4e48-84d2-2966cb06961e	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.50	again revison completed	partial	2026-04-03 05:34:13.063779+00	2026-04-03 05:34:13.063779+00	1
397fda3f-3c68-43b7-83c3-13231042fc28	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	1.00	complted	final	2026-04-03 05:34:21.573385+00	2026-04-03 05:34:21.573385+00	1
5c6f92c9-6316-49ea-a964-3f3d0d7184ea	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	revison need	revision	2026-04-03 07:11:11.424829+00	2026-04-03 07:11:11.424829+00	2
0d6d3638-6b3e-4988-9fa1-c05a1607f076	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	notes	revision	2026-04-03 07:19:46.32442+00	2026-04-03 07:19:46.32442+00	3
e4fb794f-11ab-4fa4-997f-98d2c80e7a9b	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.50	done	partial	2026-04-03 07:20:41.181084+00	2026-04-03 07:20:41.181084+00	3
626762f9-f90c-401c-bd37-ee040eb9e81c	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-03 07:46:57.360548+00	2026-04-03 07:46:57.360548+00	3
38fbf4fe-7cc8-45f8-840f-2b8f58146695	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	forget	revision	2026-04-03 07:47:04.707408+00	2026-04-03 07:47:04.707408+00	4
e66d489f-20df-4287-92d2-4b560f096fa9	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.33	forget issues	partial	2026-04-03 07:49:06.658804+00	2026-04-03 07:49:06.658804+00	4
9a66cd42-46a2-43aa-86cf-5e59d0b8226a	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.17	remebr issues	partial	2026-04-03 07:49:18.560812+00	2026-04-03 07:49:18.560812+00	4
96fce7ff-6755-475c-adb9-896fd4d75d34	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	2.00	internal review completed	final	2026-04-03 07:49:40.456937+00	2026-04-03 07:49:40.456937+00	4
54f53b53-834a-4c85-ace7-c1734be0d05b	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-03 07:50:43.833045+00	2026-04-03 07:50:43.833045+00	4
d1a5f98a-0a9e-404e-b7dd-f8e59a878ce6	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-03 07:50:47.312075+00	2026-04-03 07:50:47.312075+00	4
93487568-91ef-4c78-b4d1-34474ca5cbb3	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	note client reviwe need some revison on graphics	revision	2026-04-03 07:51:06.91688+00	2026-04-03 07:51:06.91688+00	5
fd6ab47c-c89a-457d-bf4f-cbad2fcec7ee	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.50	review	partial	2026-04-03 07:52:10.465947+00	2026-04-03 07:52:10.465947+00	5
92fd43df-f739-4154-a941-c03405e1c086	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	2.50	reviclient	final	2026-04-03 07:52:20.904801+00	2026-04-03 07:52:20.904801+00	5
f4b9b752-021b-4f38-a719-82c4b43c5090	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-03 08:16:09.327542+00	2026-04-03 08:16:09.327542+00	5
abf52566-6029-40c7-99b1-233e6f2ac3f4	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-03 08:16:12.694968+00	2026-04-03 08:16:12.694968+00	5
edc01abb-da34-4321-b3f8-683dc92636de	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	compliance_review	transition	2026-04-03 08:16:16.075215+00	2026-04-03 08:16:16.075215+00	5
316ddbb3-7deb-4ecc-9827-681777e27566	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	compleicne revson	revision	2026-04-03 08:16:25.600552+00	2026-04-03 08:16:25.600552+00	6
f15ca584-a921-4313-8c0a-e82dcc02d600	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	0.33	done	partial	2026-04-03 08:16:42.61055+00	2026-04-03 08:16:42.61055+00	6
b5aebb67-cdd6-4264-8b5b-e65eaf433d31	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000011	2.83	done again	final	2026-04-03 08:16:52.321815+00	2026-04-03 08:16:52.321815+00	6
d2ecc348-9810-4d2b-8a61-961cae6c0b98	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-03 09:01:40.941602+00	2026-04-03 09:01:40.941602+00	6
c2d6cd38-4081-4c1b-b0d4-cfae14187b76	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	00000000-0000-0000-0000-000000000001	0.00	notes	revision	2026-04-03 09:02:03.30601+00	2026-04-03 09:02:03.30601+00	7
233b91d6-a14f-44ba-b6a6-6f91d4d5d01e	a5c36882-491e-4475-9e57-08637656f6e8	00000000-0000-0000-0000-000000000011	0.50	fj	partial	2026-04-06 06:17:14.809297+00	2026-04-06 06:17:14.809297+00	0
6a48b3cc-0521-447c-936f-8d2f691a5348	a5c36882-491e-4475-9e57-08637656f6e8	00000000-0000-0000-0000-000000000011	0.50	done	final	2026-04-06 06:18:05.604403+00	2026-04-06 06:18:05.604403+00	0
12e8c7ea-4e8a-4ad9-853b-f8b1a2803694	a5c36882-491e-4475-9e57-08637656f6e8	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 06:18:49.706989+00	2026-04-06 06:18:49.706989+00	0
00d4aa31-fe1b-4fe5-ba1b-fb9e3c0a8d72	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	00000000-0000-0000-0000-000000000011	5.00	done	partial	2026-04-06 07:05:18.905371+00	2026-04-06 07:05:18.905371+00	0
dc3ba141-c1f3-4c3b-aaf4-a315f272b34f	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	00000000-0000-0000-0000-000000000011	5.00	rsolved	final	2026-04-06 07:07:34.596299+00	2026-04-06 07:07:34.596299+00	0
6497c56e-be7b-49aa-b60b-0028bca7f8af	7247f5aa-f63a-4449-8b85-f7ad5d0ee94f	00000000-0000-0000-0000-000000000011	0.50	email	partial	2026-04-06 07:08:36.925686+00	2026-04-06 07:08:36.925686+00	0
7e84fdad-5a91-49b6-9a1a-6462a23288dd	7247f5aa-f63a-4449-8b85-f7ad5d0ee94f	00000000-0000-0000-0000-000000000011	1.00	byb	partial	2026-04-06 07:08:45.321398+00	2026-04-06 07:08:45.321398+00	0
31442eef-caa8-47e3-b051-ed1a0a410491	7247f5aa-f63a-4449-8b85-f7ad5d0ee94f	00000000-0000-0000-0000-000000000011	1.50	done	final	2026-04-06 07:08:55.593617+00	2026-04-06 07:08:55.593617+00	0
4a36c980-b20a-488b-a646-5a0a9e3e9a28	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	0.50	jhjb	partial	2026-04-06 07:09:25.056721+00	2026-04-06 07:09:25.056721+00	0
d760dd0f-b936-46a9-9b6d-6ad713e6685f	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	0.33	mn m	partial	2026-04-06 07:09:36.733576+00	2026-04-06 07:09:36.733576+00	0
10ea79d8-113d-4a4e-bb4c-d7e646f20db3	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	0.83	njn	final	2026-04-06 07:09:42.065195+00	2026-04-06 07:09:42.065195+00	0
a064efcc-6adf-4895-a682-5b71a8a8e76c	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 07:11:29.378041+00	2026-04-06 07:11:29.378041+00	0
ae39f689-373a-4321-ba48-6f5976e78800	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	add email	revision	2026-04-06 07:12:30.305508+00	2026-04-06 07:12:30.305508+00	1
c295635e-586a-4a3c-8cc8-d11affde825e	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	0.50	revsion	partial	2026-04-06 07:14:08.710301+00	2026-04-06 07:14:08.710301+00	1
e27b1dee-a3fc-4cd7-bfff-75c4b9d21890	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	1.33	done	final	2026-04-06 07:14:23.769047+00	2026-04-06 07:14:23.769047+00	1
c701a3e6-6988-4b19-97bb-9acd997fdd97	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 07:15:10.949102+00	2026-04-06 07:15:10.949102+00	1
4d304add-4618-43c6-b709-f03c380f1b3e	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-06 07:15:43.27754+00	2026-04-06 07:15:43.27754+00	1
b86525d4-dd2c-4519-b604-5c65ba050d4a	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	add name	revision	2026-04-06 07:15:58.785318+00	2026-04-06 07:15:58.785318+00	2
1c795dcb-13a4-41c4-9c68-2f4c2d906d21	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	0.50	dne	partial	2026-04-06 07:17:56.350704+00	2026-04-06 07:17:56.350704+00	2
cf827c93-2526-4cfd-b208-86bfeeed26bd	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000011	1.83	done	final	2026-04-06 07:18:05.449783+00	2026-04-06 07:18:05.449783+00	2
b3edf1ae-b387-4b01-b898-dd51fa6fba22	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 07:18:45.082889+00	2026-04-06 07:18:45.082889+00	2
49d98421-c82d-480f-b90e-8a6c6f81a1ee	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-06 07:18:49.692189+00	2026-04-06 07:18:49.692189+00	2
6dbd31d0-a397-48b1-8469-2c65a06053ca	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	compliance_review	transition	2026-04-06 07:18:53.277442+00	2026-04-06 07:18:53.277442+00	2
118209cd-2ec8-4854-962d-ede6c90d1193	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	approved	transition	2026-04-06 07:18:57.68132+00	2026-04-06 07:18:57.68132+00	2
22efed15-bf25-43bb-b952-e51ffcb273b4	8e8053fa-b48c-4ee8-ac27-0bee7ee23e07	00000000-0000-0000-0000-000000000001	0.00	closed	transition	2026-04-06 07:19:04.859692+00	2026-04-06 07:19:04.859692+00	2
60491fed-f40b-413e-b81f-1d3edda44f4a	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 07:28:37.689013+00	2026-04-06 07:28:37.689013+00	0
b29d7c54-6d96-41c0-9f85-7206d167f360	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-06 07:29:43.395338+00	2026-04-06 07:29:43.395338+00	0
c7bfbb97-6866-474f-a433-9918ba435e96	f4cf8898-543a-4ff6-87f1-b4c7b3746d84	00000000-0000-0000-0000-000000000001	0.00	compliance_review	transition	2026-04-06 07:30:20.091101+00	2026-04-06 07:30:20.091101+00	0
eb76b06a-76cd-446e-9d9c-7a36effa9b8c	8a01f979-55d2-4fe4-9eb5-d3280931c25c	00000000-0000-0000-0000-000000000011	0.50	call done	partial	2026-04-06 12:01:10.42088+00	2026-04-06 12:01:10.42088+00	0
e4ab1a39-39f6-4832-95b5-8e31875dddd0	8a01f979-55d2-4fe4-9eb5-d3280931c25c	00000000-0000-0000-0000-000000000011	0.50	done ebfre the time	final	2026-04-06 12:01:20.323602+00	2026-04-06 12:01:20.323602+00	0
98279b12-2561-462c-bbc4-e0a04ecd8503	8a01f979-55d2-4fe4-9eb5-d3280931c25c	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 12:02:37.728911+00	2026-04-06 12:02:37.728911+00	0
092d62b7-ea04-4ae5-8328-21082bf7e00a	8a01f979-55d2-4fe4-9eb5-d3280931c25c	00000000-0000-0000-0000-000000000001	0.00	agian call jordan	revision	2026-04-06 12:02:49.520586+00	2026-04-06 12:02:49.520586+00	1
a80dadb6-faeb-4ed4-ac12-9810f60fc3d3	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	internal_review	transition	2026-04-06 13:22:57.772443+00	2026-04-06 13:22:57.772443+00	7
23ce75b0-26c7-4e61-b69c-296f4a56c722	21bfa14e-ef65-4ebd-9332-5b01ddc302ea	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	client_review	transition	2026-04-06 13:23:02.429949+00	2026-04-06 13:23:02.429949+00	7
cbc6c72e-8c14-4ed4-9f15-aae762b11829	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	0.50	done	partial	2026-04-06 13:42:54.344659+00	2026-04-06 13:42:54.344659+00	0
54e1303e-f3ba-47b1-951e-e1345fc80c6b	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	0.50	1stdone	final	2026-04-06 13:43:11.679058+00	2026-04-06 13:43:11.679058+00	0
1ef83c02-e9ee-42fd-b376-252abd5cf6d2	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 13:46:11.959523+00	2026-04-06 13:46:11.959523+00	0
02f9f5a8-695d-4b46-a895-678b94917e55	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-06 13:46:58.988715+00	2026-04-06 13:46:58.988715+00	0
49d38768-ba0a-4495-9576-3cb7671bacda	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	dgruf	revision	2026-04-06 13:47:25.779172+00	2026-04-06 13:47:25.779172+00	1
6d007c37-53b5-4def-885c-10939f6da8b6	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	1.00	dgruf	partial	2026-04-06 13:48:02.976609+00	2026-04-06 13:48:02.976609+00	1
d04add8a-abed-4331-b974-50b1e04e1472	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	1.50	dgruf	final	2026-04-06 13:48:19.806185+00	2026-04-06 13:48:19.806185+00	1
9f1b377b-aec1-413a-9bc7-93a3dbc9205e	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 13:49:27.780402+00	2026-04-06 13:49:27.780402+00	1
ed35945e-3111-4c2c-9409-3a1b5b4855f9	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	efh5u	revision	2026-04-06 13:49:38.904734+00	2026-04-06 13:49:38.904734+00	2
96fd0dfa-ca98-42f7-ac4d-b5df0c61500e	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	1.00	dgruf	partial	2026-04-06 13:50:05.727893+00	2026-04-06 13:50:05.727893+00	2
145e7d51-dbb7-4aa9-a748-7f91d26bb860	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000011	2.50	dgruf	final	2026-04-06 13:50:29.58656+00	2026-04-06 13:50:29.58656+00	2
f41d8b1f-ef1f-46d5-b5cd-86d109d70493	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	internal_review	transition	2026-04-06 13:50:40.639825+00	2026-04-06 13:50:40.639825+00	2
77a66529-ec94-4750-bc79-c49bc063d174	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	client_review	transition	2026-04-06 13:50:45.973437+00	2026-04-06 13:50:45.973437+00	2
52ef3e4b-cfc4-4e2c-b103-9d310fd4b792	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	compliance_review	transition	2026-04-06 13:50:53.135675+00	2026-04-06 13:50:53.135675+00	2
6a7503ce-f563-4846-a490-91d4033b2990	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	approved	transition	2026-04-06 13:50:56.212055+00	2026-04-06 13:50:56.212055+00	2
70967fae-0409-430d-98d3-927875fc80c0	981d58c2-e2e9-46b5-94fb-7e6a7316858d	00000000-0000-0000-0000-000000000001	0.00	closed	transition	2026-04-06 13:50:59.384665+00	2026-04-06 13:50:59.384665+00	2
a475bbac-a8bb-4090-aa73-5025b285cb11	b7216b1c-c50d-41f1-a140-a6d778336c9c	00000000-0000-0000-0000-000000000011	1.33	first quick 	partial	2026-04-06 14:22:00.475234+00	2026-04-06 14:22:00.475234+00	0
c5a05565-ece7-4bb4-9239-733b35e694ba	b7216b1c-c50d-41f1-a140-a6d778336c9c	00000000-0000-0000-0000-000000000011	0.50	second log	partial	2026-04-06 14:22:13.627251+00	2026-04-06 14:22:13.627251+00	0
b0332740-92b9-44c9-8134-d9ff8b651205	b7216b1c-c50d-41f1-a140-a6d778336c9c	00000000-0000-0000-0000-000000000011	1.83	this ticket has been resolved	final	2026-04-06 14:23:19.07542+00	2026-04-06 14:23:19.07542+00	0
e5a142bf-5461-4412-a1ec-87c3514f885f	b7216b1c-c50d-41f1-a140-a6d778336c9c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	internal_review	transition	2026-04-06 14:24:39.295447+00	2026-04-06 14:24:39.295447+00	0
690ae2a4-59b4-40f2-a81b-2a8ae603d0ae	b7216b1c-c50d-41f1-a140-a6d778336c9c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	you forget to fix the padding there	revision	2026-04-06 14:25:11.092979+00	2026-04-06 14:25:11.092979+00	1
6beb3819-4d9b-4092-9026-453b91595b19	b7216b1c-c50d-41f1-a140-a6d778336c9c	00000000-0000-0000-0000-000000000011	1.00	this has been fixed the paadding issue	partial	2026-04-06 14:26:04.639787+00	2026-04-06 14:26:20.4864+00	1
e7c188ca-00fc-4c28-85e2-0a7813debced	b7216b1c-c50d-41f1-a140-a6d778336c9c	00000000-0000-0000-0000-000000000011	2.83	the padding issue has been resolved	final	2026-04-06 14:26:38.907843+00	2026-04-06 14:26:38.907843+00	1
ef8fb45b-4ba1-4761-958d-192ba1ed1762	b7216b1c-c50d-41f1-a140-a6d778336c9c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	internal_review	transition	2026-04-06 14:27:27.533106+00	2026-04-06 14:27:27.533106+00	1
da21e318-3320-401c-8204-e1df912700c5	b7216b1c-c50d-41f1-a140-a6d778336c9c	f48ddd55-60d6-4bec-8040-94fbecd18fd6	0.00	client_review	transition	2026-04-06 14:27:50.844665+00	2026-04-06 14:27:50.844665+00	1
\.


--
-- Data for Name: transcripts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transcripts (id, fireflies_id, title, call_date, duration_sec, participants, raw_transcript, firm_id, archived, created_at, fetched_at) FROM stdin;
16d6911c-b383-481d-99f6-8ad4632d9b27	manual_7bd4e7de-bb88-4644-a3a1-ada120d20190	email soniya	2026-03-28 00:00:00+00	0	["alice"]	alice : email soniya	00000000-0000-0000-0000-000000000031	f	2026-03-28 09:33:26.06711+00	\N
f6b12bc8-1552-4cf4-a801-b168a0b912c5	manual_91f5ce5e-fdf1-4bed-a887-5cb49e008763	project manager discuss upcoming project	2026-03-30 00:00:00+00	480	["pm", "dev"]	PM (00:00): Hey Abhishek, do you have a few minutes to discuss the Teams module updates?\n\nDev (00:10): Yes, sure. I’ve been working on the Teams list and member details flow. What would you like to review?\n\nPM (00:25): I saw the current version where clicking on a member name expands details inline. Are we keeping that behavior?\n\nDev (00:40): Yes, partially. We’re keeping the inline expansion when clicking on the name. But I’m introducing a separate "View" button that opens a dedicated detailed page.\n\nPM (01:00): Okay, what’s the reason for splitting those two actions?\n\nDev (01:10): The inline view is quick and lightweight, good for basic info. But for tickets, duration, and deeper insights, a full page gives better structure and scalability.\n\nPM (01:30): Makes sense. What kind of data will be on the detailed page?\n\nDev (01:40): It will include member profile info, assigned tickets, ticket status, and time duration spent. Possibly filters in the next iteration.\n\nPM (02:00): Good. Is the API ready for that?\n\nDev (02:10): Partially. We have basic member data, but ticket aggregation and duration calculations are still in progress. I may need backend support.\n\nPM (02:30): Noted. I’ll coordinate with the backend team. What about permissions? Can all users access this page?\n\nDev (02:45): No, I was planning to implement RBAC. Only users with "view_member_detail" permission should access the detailed page.\n\nPM (03:05): And what about the inline expansion?\n\nDev (03:10): That will require a lower-level permission like "view_team", since it’s less sensitive.\n\nPM (03:25): That’s a good separation. How are you managing roles?\n\nDev (03:35): Roles like Admin, Manager, and Member. Permissions are mapped to roles, not directly to users.\n\nPM (03:50): Perfect. Any UI challenges so far?\n\nDev (04:00): Yes, handling state for expanded rows while keeping performance smooth. Also ensuring navigation doesn’t break user context.\n\nPM (04:20): Are you using routing for the detailed page?\n\nDev (04:25): Yes, dynamic routing like /member/:id.\n\nPM (04:40): Good practice. What about loading states?\n\nDev (04:45): I’m adding skeleton loaders for better UX while fetching ticket data.\n\nPM (05:00): Nice. Any blockers?\n\nDev (05:05): Just waiting on finalized API for ticket duration. Also need clarity on edge cases like users with no tickets.\n\nPM (05:25): For now, show an empty state message like "No tickets assigned."\n\nDev (05:35): Got it, I’ll handle that.\n\nPM (05:45): Timeline for completion?\n\nDev (05:50): UI part by tomorrow. API integration depends on backend, maybe 1–2 more days.\n\nPM (06:05): Okay. Also, ensure consistency with existing design system.\n\nDev (06:15): Yes, I’m reusing components like cards and tables.\n\nPM (06:25): Great. One more thing — can we track user activity on the detailed page?\n\nDev (06:35): Yes, we can log events like page visits and interactions.\n\nPM (06:50): That would help analytics.\n\nDev (07:00): I’ll add event tracking hooks.\n\nPM (07:10): Perfect. Anything else from your side?\n\nDev (07:20): Just one suggestion — we might later add filters like date range for tickets.\n\nPM (07:35): Good idea, but let’s keep it for phase 2.\n\nDev (07:45): Agreed.\n\nPM (07:50): Alright, thanks. Let’s sync again after API is ready.\n\nDev (08:00): Sure, thanks!	\N	f	2026-03-30 13:40:22.266549+00	\N
93e75831-1973-4c26-aca0-09eac2ac2187	manual_55fbe658-5e4e-41e3-833b-44747a327e99	Client Meeting – Campaigns & Content Discussion (5 mins)	2026-03-30 00:00:00+00	0	["Client (Mr. Sharma)", "Marketing Manager (Priya)", "Content Strategist (Rohit)", "Developer (Abhishek)"]	Client (00:00): Hi everyone, thanks for joining. I wanted to quickly review the current status of our campaigns and content pipeline.\n\nPriya (00:10): Hi, thanks for your time. Currently, we have two active campaigns running — one for lead generation and another for brand awareness.\n\nClient (00:25): Okay, and how is the performance so far?\n\nPriya (00:30): The lead generation campaign is performing well, CTR is around 3.5%, but the conversion rate can be improved.\n\nClient (00:45): Any idea what’s affecting conversions?\n\nRohit (00:50): Yes, from a content perspective, we feel the landing page messaging is slightly misaligned with the ad creatives. We’re working on refining that.\n\nClient (01:05): That makes sense. When can we expect the updated content?\n\nRohit (01:10): We’ll share revised copies and headlines by tomorrow for approval.\n\nClient (01:20): Great. And what about the campaign targeting?\n\nPriya (01:25): We’re currently targeting a broad audience, but we’re planning to narrow it down based on initial engagement data.\n\nClient (01:40): Good approach. Abhishek, from a tech side, is everything running smoothly?\n\nAbhishek (01:50): Yes, overall everything is stable. Tracking scripts and analytics are properly integrated. We’re capturing user interactions and campaign data accurately.\n\nClient (02:05): That’s good to hear. Are we tracking user behavior on the landing pages?\n\nAbhishek (02:10): Yes, we’re tracking clicks, session duration, and form submissions. We can also add heatmaps if needed.\n\nClient (02:25): That would be helpful. Let’s include heatmaps for better insights.\n\nPriya (02:35): Noted, we’ll plan that.\n\nClient (02:40): What about upcoming campaigns?\n\nPriya (02:45): We’re preparing a new campaign focused on retargeting users who visited but didn’t convert.\n\nClient (03:00): Good, that’s important. Will the content differ for retargeting?\n\nRohit (03:05): Yes, the messaging will be more personalized and action-driven, focusing on benefits and urgency.\n\nClient (03:20): Perfect. Make sure the tone stays consistent with the brand.\n\nRohit (03:25): Absolutely.\n\nClient (03:30): Any blockers or support needed from our side?\n\nPriya (03:35): We’ll need quick approvals on the updated content to avoid delays.\n\nClient (03:45): Understood, we’ll prioritize that.\n\nAbhishek (03:50): Also, if there are any changes in tracking requirements, please let me know in advance so we can implement them smoothly.\n\nClient (04:00): Sure, will do.\n\nClient (04:05): Alright, this looks good. Let’s connect again after the updated content is live.\n\nPriya (04:15): Sounds good, thank you.\n\nRohit (04:20): Thanks everyone.\n\nAbhishek (04:25): Thanks!	\N	f	2026-03-30 13:46:51.559752+00	\N
cc2b4bf6-ae44-49f0-b4b2-55713bd292cf	manual_484669af-5f54-4436-ad1f-96d47f772ecf	Recent call	2026-03-28 00:00:00+00	0	["abhishek"]	client: Good morning. Let's go over what we need for the upcoming product launch.                                        \n  We need to finalize the requirements document and make sure everything is tracked in Jira.                               \n  The roadmap should be updated to reflect the new timeline by end of this week.                                           \n                                                                                                                           \n  We also need to set up the CI/CD pipeline for the new deployment. The Kubernetes cluster                                 \n  needs to be configured for auto-scaling and the infrastructure migration should be planned carefully.                    \n                                                                                                                           \n  On the frontend side, we need to redesign the dashboard UI and implement the new design system components.               \n  The bundle size should be optimized for better mobile performance.                                                       \n                                                                                                                           \n  For the backend, we need to refactor the authentication service to support OAuth.                                        \n  We should implement caching for the product catalog data to improve response times.\n  The database optimization must be completed before launch, including proper indexing.                                    \n                                                                                                                           \n  Finally, let's have a checkpoint meeting next week to review all deliverables.                                           \n  All tasks must be documented and tracked properly.                                                                       \n                                                                                                                           \n  receiver: Understood, we will assign these to the respective teams and update you by Thursday.	00000000-0000-0000-0000-000000000031	f	2026-03-28 11:33:10.852154+00	\N
98d84b26-d668-4d57-b687-041ba13759fd	manual_edba53bf-2fa3-4ad8-8f24-e923da2cf21f	Q3 Product launch Priorites	2026-03-28 00:00:00+00	1200	["alice"]	lient: Good morning team. Let's align on the Q3 product launch priorities.                                              \n                                                                                                                           \n  We need to finalize the requirements document for the new onboarding flow by Friday.                                     \n  The project roadmap must be updated to reflect the revised milestones and all tasks should be tracked in Jira.\n  We also need to plan a checkpoint meeting with stakeholders next week to review progress.                                \n                                                                                                                           \n  On the infrastructure side, we need to set up a new Kubernetes cluster for the staging environment.                      \n  The CI/CD pipeline needs to be updated to support automated deployments.                                                 \n  We should also plan the infrastructure migration from the old data center.                                               \n                                                                                                                           \n  For the frontend, we need to redesign the user onboarding UI from scratch.                                               \n  The new design system components must be implemented and the bundle size should be optimized for mobile.                 \n  We also need to improve the overall performance of the dashboard page.                                                   \n                                                                                                                           \n  On the backend, we need to refactor the authentication service to support multi-factor authentication.                   \n  We should implement caching for the user session data to reduce database load.                                           \n  The database optimization must be completed this sprint including index improvements.                                    \n  We also need to update the payment service to support the new billing model.                                             \n                                                                                                                           \n  receiver: Got it. We will break these down and assign to respective teams by tomorrow.	00000000-0000-0000-0000-000000000036	f	2026-03-28 11:46:31.612198+00	\N
a8059fc9-e0bb-4414-a163-d839c327ed03	manual_d9e6da90-7ae2-4296-937b-8ed944dd3452	Q2 Campaign Planning Call — Bright Spark Agency x Nova Fitness Brand	2026-03-30 00:00:00+00	2280	["Sarah (Account Manager", "Bright Spark)", "James (Project Manager", "Bright Spark)", "Priya (Marketing Director", "Nova Fitness)"]	Sarah: Okay we're all on, great. Priya thanks for joining, let's jump straight in. So the main agenda today is finalizing the Q2 campaign plan for Nova Fitness, reviewing the content calendar, and talking through the website landing page work.\n\nPriya: Perfect, yes I have some updates on the budget side too so let's make sure we cover that.\n\nSarah: Absolutely. James do you want to kick off with where we are on the campaign structure?\n\nJames: Sure. So for Q2 we've agreed on three core campaign pillars — the summer body transformation push, the app relaunch, and the gym equipment product line. The summer body campaign is the biggest priority and needs to go live by April 21st. That's a hard deadline because it ties to their influencer partnership announcements.\n\nPriya: Yes April 21st is non-negotiable. We've already committed to the influencers.\n\nJames: Understood. So for that we still need the hero banner designed, the landing page copy written and approved, and the Facebook and Instagram ad creatives — we're looking at six static ads and two video ads for each platform.\n\nPriya: On the video ads, can we do three instead of two? We want to test different hooks — one pain point angle, one aspirational, one social proof.\n\nJames: That's fine, I'll update the brief. So three video ads per platform, six static per platform. Sarah can you make sure the creative brief gets updated and sent to the design team today?\n\nSarah: Yes I'll do that this afternoon.\n\nPriya: Also on the landing page — we talked last time about adding a before and after section with customer testimonials. Has that been scoped?\n\nJames: Not yet, that needs to go to the dev team. It's a new section so it's probably a half day of work. I'll raise a development ticket for that.\n\nPriya: Great. And the landing page copy — who's writing that?\n\nSarah: That's on us. I'll assign it to Tom on the content team. He needs the brand tone of voice doc though, Priya can you send that over?\n\nPriya: I'll send it today, yes.\n\nSarah: Perfect. Tom will need about three days once he has it so we should have a draft by April 4th for your review.\n\nPriya: That works. I need at least two days to review internally so if we get it April 4th we can turn it by April 7th. That still gives us enough time before the 21st.\n\nJames: Good. Let's talk about the app relaunch next. The dev work is still on track, the app itself should be ready for QA by April 10th. We need to plan the announcement campaign around that. Sarah what's the status on the email sequence?\n\nSarah: The email sequence is drafted — three emails, we just need design to do the HTML templates. I'll check with the design team on capacity but realistically that's two days of work. We should have those ready by April 8th.\n\nJames: And we need the app store screenshots updated too. That's a design task. Can the design team turn those around in a day?\n\nSarah: They should be able to, yes. I'll add it to the design queue.\n\nPriya: On the app relaunch — we also want to do a press release. Can Bright Spark handle that or should we use our PR agency?\n\nSarah: We can handle a first draft but for distribution you'd want your PR agency. We'll write it and hand it over to them. I'll add that to Tom's workload — he can do the press release alongside the landing page copy.\n\nPriya: Okay. Press release needs to be done by April 12th so the PR agency has time to distribute ahead of the April 17th announcement date.\n\nJames: Got it. April 12th for press release draft. Let me also flag — we haven't started on the gym equipment product line campaign yet. That one's lower priority for now but we need to at least get the strategy document done in April so we can hit the ground running in May.\n\nPriya: Agreed. Can you put together a campaign strategy doc for the equipment line by end of April?\n\nJames: Yes, I'll own that. End of April delivery.\n\nSarah: Budget update Priya — you mentioned you had something?\n\nPriya: Yes, so the board approved an additional fifteen thousand for Q2 on paid media. Split it how you think is most effective but my preference is heavier on Instagram given our audience demographic.\n\nSarah: That's great news. James can you update the media plan to reflect that and send a revised allocation to Priya by end of this week?\n\nJames: Will do. I'd recommend putting about sixty percent on Instagram, thirty on Facebook, ten on Google retargeting given the funnel stage.\n\nPriya: That sounds right. Send it over and I'll confirm.\n\nSarah: One last thing — the UTM tracking setup. Last campaign we had some attribution issues. Can we make sure the dev team sets up proper UTM parameters for all campaign links before anything goes live?\n\nJames: Good call. I'll raise a dev task for that. Should be straightforward, maybe two hours of work.\n\nPriya: Yes please. Our analytics were a mess last time.\n\nSarah: Okay I think we've covered everything. Let me recap the actions — James is updating the creative brief, raising the landing page dev ticket, following up on the app QA timeline, requesting app store screenshots, updating the media plan by Friday, and writing the equipment line strategy by end of April. Tom is writing the landing page copy due April 4th, writing the press release due April 12th. Design team is doing the HTML email templates, the ad creatives, the hero banner, and the app store screenshots. Dev team is doing the before and after testimonial section and the UTM tracking setup. Priya is sending the tone of voice doc today and reviewing the landing page copy by April 7th.\n\nPriya: That all sounds right. Thanks both, good call.\n\nSarah: Great, speak soon.	\N	f	2026-03-30 08:47:11.403157+00	\N
00000000-0000-0000-0000-000000000042	ff_onboard_stellartech	Client Onboarding: Stellar Tech	2026-03-22 17:34:36.425223+00	1965	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Priya Mehta", "email": "p.mehta@nexusdigital.io"}, {"name": "Jordan Lee", "email": "j.lee@marketingwiz.io"}]		00000000-0000-0000-0000-000000000034	f	2026-03-22 17:34:36.425223+00	2026-03-22 17:34:36.425223+00
00000000-0000-0000-0000-000000000043	ff_content_cal_nov	Content Calendar Review - November	2026-03-21 17:34:36.425223+00	3484	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Chris Park", "email": "c.park@luminatech.com"}, {"name": "Maya Kapoor", "email": "m.kapoor@marketingwiz.io"}, {"name": "Marcus Thorne", "email": "m.thorne@marketingwiz.io"}, {"name": "Tom Harris", "email": "t.harris@marketingwiz.io"}, {"name": "Sam Greenfield", "email": "s.green@evergreen.com"}]		00000000-0000-0000-0000-000000000035	f	2026-03-21 17:34:36.425223+00	2026-03-21 17:34:36.425223+00
00000000-0000-0000-0000-000000000044	ff_budget_roi_q3	Budget Allocation & ROI Analysis	2026-03-19 17:34:36.425223+00	4320	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Tony Stark", "email": "t.stark@starkent.com"}, {"name": "Jordan Lee", "email": "j.lee@marketingwiz.io"}]		00000000-0000-0000-0000-000000000033	f	2026-03-19 17:34:36.425223+00	2026-03-19 17:34:36.425223+00
00000000-0000-0000-0000-000000000045	ff_ad_creative_winter	Ad Creative Brainstorm: Winter Sale	2026-03-17 17:34:36.425223+00	1458	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Sam Greenfield", "email": "s.green@evergreen.com"}, {"name": "Maya Kapoor", "email": "m.kapoor@marketingwiz.io"}, {"name": "Marcus Thorne", "email": "m.thorne@marketingwiz.io"}, {"name": "Tom Harris", "email": "t.harris@marketingwiz.io"}]		00000000-0000-0000-0000-000000000036	f	2026-03-17 17:34:36.425223+00	2026-03-17 17:34:36.425223+00
00000000-0000-0000-0000-000000000046	ff_seo_keyword_techblog	SEO Keyword Research - Tech Blog	2026-03-14 17:34:36.425223+00	2515	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Carlos Rivera", "email": "c.rivera@globex.com"}, {"name": "Tom Harris", "email": "t.harris@marketingwiz.io"}, {"name": "Jordan Lee", "email": "j.lee@marketingwiz.io"}]		00000000-0000-0000-0000-000000000032	f	2026-03-14 17:34:36.425223+00	2026-03-14 17:34:36.425223+00
00000000-0000-0000-0000-000000000041	ff_wk_strategy_q4	Weekly Strategy Sync - Q4 Planning	2026-03-23 17:34:36.425223+00	2712	[{"name": "Alex Rivers", "email": "admin@marketingwiz.io"}, {"name": "Jane Smith", "email": "jane@acmecorp.com"}, {"name": "Sarah Chen", "email": "s.chen@marketingwiz.io"}, {"name": "Carlos Rivera", "email": "c.rivera@globex.com"}]		00000000-0000-0000-0000-000000000031	t	2026-03-23 17:34:36.425223+00	2026-03-23 17:34:36.425223+00
41ded39a-6ac7-49db-be5a-9371ab8761f4	manual_38d6eeef-f993-45d3-9494-06cbb2f5c3f7	he	2026-03-30 00:00:00+00	1200	["abhishek utkarsh"]	hi	\N	t	2026-03-30 14:52:38.34324+00	\N
c0c52364-26c1-4290-9332-a192ad035cae	manual_7765ce32-50dc-45c4-b219-0f44721c37d1	Project Meeting Transcript: Timesheet Tracking System	2026-04-09 00:00:00+00	0	["Participants:  Craig – Product Manager Utkarsh – Technical Lead Abhishek – Backend Developer Shubham – Frontend Developer"]	1. Meeting Introduction\n\nCraig:\nGood morning, everyone. The purpose of today’s meeting is to discuss improvements to the timesheet tracking system. Our client wants a more accurate and reliable way to track the time spent on tickets.\n\nUtkarsh:\nThanks, Craig. We’ve reviewed the current implementation and identified a few gaps that we’ll discuss today.\n\n2. Current System Overview\n\nCraig:\nAbhishek, could you walk us through the current setup?\n\nAbhishek:\nSure. At the moment, users manually start and stop timers when working on a ticket. The logged time is stored in the system and displayed in reports. However, the issue arises when users start a timer and switch to another task without stopping it.\n\nCraig:\nThat’s exactly the concern raised by the client.\n\n3. Identified Challenges\n\nUtkarsh:\nThe main problems include:\n\nInaccurate time tracking due to manual errors.\nUsers forgetting to stop timers.\nLack of validation for idle or inactive sessions.\nNo mechanism to prevent overlapping timers.\n\nShubham:\nFrom the UI side, users need better visual indicators and reminders to manage timers efficiently.\n\n4. Proposed Solutions\n\nAbhishek:\nI propose the following enhancements:\n\nSingle Active Timer: Only one timer can run at a time.\nIdle Detection: Automatically pause the timer after a period of inactivity.\nActivity Logs: Track user actions such as start, pause, resume, and stop.\nAudit Trail: Maintain detailed logs for reporting and compliance.\n\nUtkarsh:\nAdditionally, we can implement automatic reminders if a timer runs for an unusually long duration.\n\nCraig:\nThat sounds like a bulletproof solution. Will this address the client’s concerns?\n\nAbhishek:\nYes, it will significantly improve accuracy and transparency.\n\n5. Technical Approach\n\nUtkarsh:\nHere’s the proposed technical plan:\n\nBackend: Node.js with a relational database (PostgreSQL).\nTimer Validation: Server-side checks to prevent overlapping timers.\nAPIs: Secure REST APIs for time logging.\nAnalytics: Reporting dashboards for administrators.\n\nShubham:\nOn the frontend, I’ll add:\n\nStart/Pause/Resume/Stop controls.\nIdle detection alerts.\nReal-time timer updates.\nClear visual indicators.\n6. Action Items\nTask\tOwner\tDeadline\nDesign database schema for time logs\tAbhishek\tApril 11, 2026\nDefine API endpoints\tUtkarsh & Abhishek\tApril 12, 2026\nDesign UI for timer controls\tShubham\tApril 13, 2026\nShare proposal with the client\tCraig\tApril 14, 2026\nImplement idle detection\tDevelopment Team\tApril 16, 2026\n7. Closing Remarks\n\nCraig:\nGreat discussion, everyone. This plan aligns well with the client’s expectations. Let’s proceed with the action items and reconvene next week for progress updates.\n\nUtkarsh:\nAgreed. Thanks, everyone.\n\nAbhishek & Shubham:\nThank you!	00000000-0000-0000-0000-000000000032	t	2026-04-09 05:53:26.323376+00	\N
8949fcde-9558-49d8-bde9-1b3dee35cf3b	manual_6325da95-e11c-44e7-87fc-0b43f2de6fea	call with client	2026-03-30 00:00:00+00	2700	["Craig", "Utkarsh"]	craig: Hi Everyone ,	\N	f	2026-03-30 14:40:35.111363+00	\N
f42423e8-0136-40ee-bdd8-19f1448cadd8	manual_6bece16f-9f29-4c6a-8062-fd96f73e0567	Project Meeting Transcript – Product Launch Discussion	2026-03-30 00:00:00+00	0	["Raj (Project Manager)", "Neha (Developer)", "Arjun (Marketing Lead)"]	Raj (Project Manager):\nGood morning, everyone. Thanks for joining. The goal today is to review the progress of our product launch and address any blockers. Let’s start with development. Neha, where do we stand?\n\nNeha (Developer):\nMorning! The core features are mostly complete. We’ve finished the user authentication, dashboard, and payment integration. Right now, we’re working on fixing a few bugs in the checkout flow.\n\nRaj:\nThat’s good progress. Are there any critical issues that could delay the timeline?\n\nNeha:\nNothing major, but the payment gateway is taking longer than expected to fully test. We want to ensure everything works smoothly before release.\n\nRaj:\nUnderstood. Quality is important. Do you need any additional support?\n\nNeha:\nMaybe one more QA resource for faster testing would help.\n\nRaj:\nNoted. I’ll see what we can arrange.\nArjun, how’s the marketing side coming along?\n\nArjun (Marketing Lead):\nWe’ve started pre-launch campaigns. Social media creatives are ready, and we’re planning to run ads starting next week. The landing page is also live.\n\nRaj:\nGreat. Are we aligned with the product messaging?\n\nArjun:\nYes, but we might need a final confirmation on the pricing and key features to highlight.\n\nRaj:\nFair point. Neha, when can we freeze the feature list?\n\nNeha:\nBy the end of this week, we should have a stable version.\n\nRaj:\nPerfect. Let’s lock that as a milestone.\nAny risks we should be aware of?\n\nArjun:\nIf the product gets delayed, we may need to reschedule the ad campaigns.\n\nRaj:\nUnderstood. Let’s keep communication tight. I’ll share updates if timelines shift.\n\nNeha:\nSounds good.\n\nArjun:\nWorks for me.\n\nRaj:\nAlright, action items:\n\nNeha: Complete testing and finalize features by Friday\nArjun: Prepare campaigns but hold final launch date confirmation\nRaj: Arrange additional QA support	\N	t	2026-03-30 14:12:16.132579+00	\N
\.


--
-- Data for Name: user_skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_skills (user_id, skill_id, created_at, experience) FROM stdin;
dbc2a155-359a-4038-8a19-c0d9ac99acc0	8d6db17c-5f80-4320-b32e-a0fd891a0989	2026-04-27 11:16:24.183294+00	0-2 Years
4b119384-96ce-460a-98ec-a8a492971d42	8d6db17c-5f80-4320-b32e-a0fd891a0989	2026-04-27 13:41:20.401758+00	0-2 Years
5a1db9e2-eadf-4fec-abec-40d6c550c1ee	b6242bb7-aa6b-4c2a-a94b-8e37676a48f3	2026-04-27 13:55:36.653199+00	\N
2e0315dd-60f2-44c4-909b-a78358468b86	b6242bb7-aa6b-4c2a-a94b-8e37676a48f3	2026-04-28 07:33:06.922373+00	2-5 Years
2e0315dd-60f2-44c4-909b-a78358468b86	8d6db17c-5f80-4320-b32e-a0fd891a0989	2026-04-28 07:33:06.922373+00	10+ Years
2e0315dd-60f2-44c4-909b-a78358468b86	b6391a03-e0ae-475c-ba96-c78d923d73d6	2026-04-28 07:33:06.922373+00	2-5 Years
2e0315dd-60f2-44c4-909b-a78358468b86	0dbb2960-bea7-4e94-bab5-1408ab1dbb7e	2026-04-28 07:33:06.922373+00	5 Years
2e0315dd-60f2-44c4-909b-a78358468b86	be39d6e1-c415-4111-b183-d7e9c8687e08	2026-04-30 09:57:22.89632+00	\N
00000000-0000-0000-0000-000000000001	b6242bb7-aa6b-4c2a-a94b-8e37676a48f3	2026-04-23 14:14:09.56335+00	\N
4b119384-96ce-460a-98ec-a8a492971d42	be39d6e1-c415-4111-b183-d7e9c8687e08	2026-04-30 09:57:22.89632+00	\N
c23e802e-4164-4c07-8a5e-9ae08da68f97	be39d6e1-c415-4111-b183-d7e9c8687e08	2026-04-30 09:57:22.89632+00	\N
00000000-0000-0000-0000-000000000001	3e5f4e5d-997d-4bb6-93b0-507481e888da	2026-04-23 14:14:09.56335+00	\N
00000000-0000-0000-0000-000000000001	8d6db17c-5f80-4320-b32e-a0fd891a0989	2026-04-23 14:14:09.56335+00	\N
4b119384-96ce-460a-98ec-a8a492971d42	f47f8468-e87c-4e50-ab60-1bffa5f09d96	2026-04-30 09:57:40.479878+00	\N
9591be28-f262-425d-a5a7-7d7672160c3c	3e5f4e5d-997d-4bb6-93b0-507481e888da	2026-05-04 06:52:13.692783+00	0-2 Years
36e92bea-b422-405f-ab41-8325a934866f	4f2e698b-916b-4513-977d-8f467545b93e	2026-05-04 07:24:49.987571+00	100
2e0315dd-60f2-44c4-909b-a78358468b86	f68ef51b-0ded-47f4-8fee-ed948dcaba4f	2026-05-04 07:58:23.314025+00	\N
cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	36ebb11b-9c3c-44d4-af11-6394f2cfbc20	2026-05-04 08:00:16.842421+00	500
5dd3dffe-e83d-4f6f-9952-fdedf978e5f0	272ace33-9110-4bc4-a523-38acc199c3d7	2026-05-04 10:30:39.55696+00	\N
c23e802e-4164-4c07-8a5e-9ae08da68f97	272ace33-9110-4bc4-a523-38acc199c3d7	2026-05-04 10:30:39.55696+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, role, created_at, updated_at, permissions, member_role, status, first_name, last_name, phone_number, avatar_url, invite_nonce, rate_amount, rate_frequency) FROM stdin;
116b3e45-ae86-47a0-9af6-980b95a99233	abhishekwins369@gmail.com	abhishekwins369@gmail.com	admin	2026-04-27 06:48:02.867175+00	2026-04-27 06:48:03.563036+00	{}	\N	invited	\N	\N	\N	\N	4a32b35b9470d1333fe30b5eec7c46f2	500.00	Weekly
4b119384-96ce-460a-98ec-a8a492971d42	manishnickelfox14@yopmail.com	Manish Yadav	member	2026-04-27 13:03:43.765397+00	2026-04-27 13:41:20.06657+00	{}	\N	Active	Manisha	Yadav	+915454535454	\N	\N	500.00	Weekly
9591be28-f262-425d-a5a7-7d7672160c3c	manishnickelfox15@yopmail.com	Manish Yadav	member	2026-05-04 06:48:58.226867+00	2026-05-04 07:01:52.859258+00	{view_global_timesheet}	\N	Active	Manish	Yadav	+91767676767676	\N	\N	500.00	Weekly
00000000-0000-0000-0000-000000000013	j.lee@marketingwiz.io	Jordan Lee	member	2026-02-09 17:34:36.425223+00	2026-04-23 12:19:11.072047+00	{}	\N	Active	Jordan	Lee	\N	\N	\N	\N	\N
5dd3dffe-e83d-4f6f-9952-fdedf978e5f0	manishnickelfox11@yopmail.com	manishnickelfox11@yopmail.com	member	2026-04-27 09:42:17.215366+00	2026-04-27 09:42:17.672359+00	{}	\N	invited	\N	\N	\N	\N	1a65f41ddda29501fbe10ddcc5e09773	100.00	Weekly
c23e802e-4164-4c07-8a5e-9ae08da68f97	manishnickelfox12@yopmail.com	manishnickelfox12@yopmail.com	member	2026-04-27 09:53:37.319857+00	2026-04-27 09:53:37.848579+00	{}	\N	invited	\N	\N	\N	\N	46a9d6fe5a47996e77b59f4b8386e804	120.00	Weekly
00000000-0000-0000-0000-000000000001	admin@marketingwiz.io	Alex Rivers	admin	2025-11-26 17:34:36.425223+00	2026-04-23 14:14:09.051756+00	{}	\N	Active	Alex	Rivers	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000014	m.kapoor@marketingwiz.io	Maya Kapoor	member	2026-02-24 17:34:36.425223+00	2026-04-27 10:11:22.715932+00	{}	\N	Disabled	Maya	Kapoor	\N	\N	\N	\N	\N
13070258-4e0f-40ca-988c-30f578c8f743	abhishekshawrma@nickelfox.com	abhishekshawrma@nickelfox.com	admin	2026-04-23 14:03:48.277382+00	2026-04-27 06:40:40.777648+00	{}	\N	invited	\N	\N	\N	\N	d2aa0a29783bc0d14ece90baaac3afd8	5000.00	Weekly
36e92bea-b422-405f-ab41-8325a934866f	manishnickelfox16@yopmail.com	Manish Yadav	member	2026-05-04 07:23:06.431016+00	2026-05-04 07:24:49.29542+00	{}	\N	Active	Manish	Yadav	+915444454545	\N	\N	500.00	Weekly
dbc2a155-359a-4038-8a19-c0d9ac99acc0	manishnickelfox13@yopmail.com	Manish Yadav	member	2026-04-27 09:55:32.616852+00	2026-04-27 11:16:23.482105+00	{}	\N	Active	Manish	Yadav	+91676767676767	\N	\N	100.00	Weekly
2e0315dd-60f2-44c4-909b-a78358468b86	chall@marketingwiz.co	Craig Hall	admin	2026-04-27 14:24:19.133818+00	2026-04-28 07:33:06.628321+00	{}	\N	Active	Craig	Hall	+15188578171	https://qtrkmxplboonzaasahpg.supabase.co/storage/v1/object/public/avatars/2e0315dd-60f2-44c4-909b-a78358468b86.jpeg	\N	1000.00	Weekly
f48ddd55-60d6-4bec-8040-94fbecd18fd6	superadmin@youragency.com	Super Admin	admin	2026-03-30 12:44:11.59649+00	2026-04-28 09:00:57.030661+00	{}	\N	Active	Super	Admin	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000012	m.thorne@marketingwiz.io	Marcus Thorne	member	2026-01-25 17:34:36.425223+00	2026-04-15 09:24:51.704089+00	{}	\N	Active	Marcus	Thorne	\N	\N	\N	\N	\N
00000000-0000-0000-0000-000000000015	t.harris@marketingwiz.io	Tom Harris	member	2026-03-11 17:34:36.425223+00	2026-04-15 09:24:51.704089+00	{}	\N	Active	Tom	Harris	\N	\N	\N	\N	\N
cf4cdb2b-8b6d-4c1e-9c7e-ece85acccb80	abhisheksharma@nickelfox.com	abhishek sharma	admin	2026-05-04 07:59:15.45863+00	2026-05-04 08:00:16.195807+00	{}	\N	Active	abhishek	sharma	+918755465950	\N	\N	500.00	Weekly
00000000-0000-0000-0000-000000000011	s.chen@marketingwiz.io	Sarah Chen	member	2025-12-26 17:34:36.425223+00	2026-04-15 09:24:51.704089+00	{}	\N	Active	Sarah	Chen	\N	\N	\N	\N	\N
5a1db9e2-eadf-4fec-abec-40d6c550c1ee	gautam.vashistha@nickelfox.com	Gautam V	project_manager	2026-04-27 13:41:51.995559+00	2026-04-27 13:55:36.383454+00	{create_projects}	\N	Active	Gautam	V	+9123568	https://qtrkmxplboonzaasahpg.supabase.co/storage/v1/object/public/avatars/5a1db9e2-eadf-4fec-abec-40d6c550c1ee.jpeg	\N	50.00	Daily
\.


--
-- Name: firms firms_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_name_unique UNIQUE (name);


--
-- Name: firms firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: org_settings org_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_settings
    ADD CONSTRAINT org_settings_pkey PRIMARY KEY (id);


--
-- Name: processing_sessions processing_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_sessions
    ADD CONSTRAINT processing_sessions_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);


--
-- Name: projects projects_name_firm_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_name_firm_unique UNIQUE (firm_id, name);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: skills skills_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_unique UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: task_type_members task_type_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_type_members
    ADD CONSTRAINT task_type_members_pkey PRIMARY KEY (task_type_id, user_id);


--
-- Name: task_types task_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_types
    ADD CONSTRAINT task_types_name_unique UNIQUE (name);


--
-- Name: task_types task_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_types
    ADD CONSTRAINT task_types_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: transcripts transcripts_fireflies_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_fireflies_id_key UNIQUE (fireflies_id);


--
-- Name: transcripts transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (user_id, skill_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_firms_account_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firms_account_manager_id ON public.firms USING btree (account_manager_id) WHERE (account_manager_id IS NOT NULL);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read) WHERE (read = false);


--
-- Name: idx_processing_sessions_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_sessions_created_by ON public.processing_sessions USING btree (created_by);


--
-- Name: idx_processing_sessions_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_sessions_firm_id ON public.processing_sessions USING btree (firm_id);


--
-- Name: idx_processing_sessions_prompt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_sessions_prompt_id ON public.processing_sessions USING btree (prompt_id);


--
-- Name: idx_processing_sessions_transcript_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_sessions_transcript_id ON public.processing_sessions USING btree (transcript_id);


--
-- Name: idx_project_members_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_project_id ON public.project_members USING btree (project_id);


--
-- Name: idx_project_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_user_id ON public.project_members USING btree (user_id);


--
-- Name: idx_projects_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_end_date ON public.projects USING btree (end_date) WHERE ((end_date IS NOT NULL) AND (status = 'active'::text));


--
-- Name: idx_projects_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_firm_id ON public.projects USING btree (firm_id);


--
-- Name: idx_projects_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_priority ON public.projects USING btree (firm_id, priority) WHERE (status = 'active'::text);


--
-- Name: idx_prompts_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_firm_id ON public.prompts USING btree (firm_id);


--
-- Name: idx_task_type_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_type_members_user_id ON public.task_type_members USING btree (user_id);


--
-- Name: idx_tickets_approved_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_approved_created_at ON public.tickets USING btree (created_at) WHERE (status = 'approved'::text);


--
-- Name: idx_tickets_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_archived ON public.tickets USING btree (archived) WHERE (archived = true);


--
-- Name: idx_tickets_assigned_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assigned_assignee ON public.tickets USING btree (assignee_id) WHERE ((status = 'assigned'::text) AND (archived = false));


--
-- Name: idx_tickets_assignee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assignee_id ON public.tickets USING btree (assignee_id);


--
-- Name: idx_tickets_assignee_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assignee_status ON public.tickets USING btree (assignee_id, status);


--
-- Name: idx_tickets_discarded_firm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_discarded_firm_created_at ON public.tickets USING btree (firm_id, created_at DESC) WHERE (status = 'discarded'::text);


--
-- Name: idx_tickets_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_firm_id ON public.tickets USING btree (firm_id);


--
-- Name: idx_tickets_firm_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_firm_status ON public.tickets USING btree (firm_id, status);


--
-- Name: idx_tickets_manual_firm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_manual_firm_created_at ON public.tickets USING btree (firm_id, created_at DESC) WHERE (ai_generated = false);


--
-- Name: idx_tickets_overdue_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_overdue_deadline ON public.tickets USING btree (deadline) WHERE ((deadline IS NOT NULL) AND (archived = false) AND (status = ANY (ARRAY['to_do'::text, 'assigned'::text, 'in_progress'::text, 'revisions'::text, 'internal_review'::text, 'client_review'::text])));


--
-- Name: idx_tickets_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_project_id ON public.tickets USING btree (project_id);


--
-- Name: idx_tickets_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_session_id ON public.tickets USING btree (session_id);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tickets_task_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_task_type_id ON public.tickets USING btree (task_type_id) WHERE (task_type_id IS NOT NULL);


--
-- Name: idx_tickets_to_do_firm_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_to_do_firm_created_at ON public.tickets USING btree (firm_id, created_at DESC) WHERE (status = 'to_do'::text);


--
-- Name: idx_tickets_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_updated_at ON public.tickets USING btree (updated_at DESC);


--
-- Name: idx_time_logs_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_ticket_id ON public.time_logs USING btree (ticket_id);


--
-- Name: idx_time_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_user_id ON public.time_logs USING btree (user_id);


--
-- Name: idx_transcripts_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_archived ON public.transcripts USING btree (archived);


--
-- Name: idx_transcripts_archived_call_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_archived_call_date ON public.transcripts USING btree (archived, call_date DESC);


--
-- Name: idx_transcripts_call_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_call_date ON public.transcripts USING btree (call_date DESC);


--
-- Name: idx_transcripts_fetched_at_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_fetched_at_active ON public.transcripts USING btree (fetched_at NULLS FIRST) WHERE (archived = false);


--
-- Name: idx_transcripts_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_firm_id ON public.transcripts USING btree (firm_id);


--
-- Name: idx_user_skills_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_skills_skill_id ON public.user_skills USING btree (skill_id);


--
-- Name: idx_user_skills_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_skills_user_id ON public.user_skills USING btree (user_id);


--
-- Name: projects projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: prompts prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prompts_updated_at BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tickets tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: time_logs time_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER time_logs_updated_at BEFORE UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.update_time_logs_updated_at();


--
-- Name: org_settings trg_org_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_settings_updated_at BEFORE UPDATE ON public.org_settings FOR EACH ROW EXECUTE FUNCTION public.update_org_settings_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: firms firms_account_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_account_manager_id_fkey FOREIGN KEY (account_manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: firms firms_default_prompt_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_default_prompt_fk FOREIGN KEY (default_prompt_id) REFERENCES public.prompts(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: processing_sessions processing_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_sessions
    ADD CONSTRAINT processing_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: processing_sessions processing_sessions_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_sessions
    ADD CONSTRAINT processing_sessions_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: processing_sessions processing_sessions_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_sessions
    ADD CONSTRAINT processing_sessions_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE RESTRICT;


--
-- Name: processing_sessions processing_sessions_transcript_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_sessions
    ADD CONSTRAINT processing_sessions_transcript_id_fkey FOREIGN KEY (transcript_id) REFERENCES public.transcripts(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: prompts prompts_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE SET NULL;


--
-- Name: task_type_members task_type_members_task_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_type_members
    ADD CONSTRAINT task_type_members_task_type_id_fkey FOREIGN KEY (task_type_id) REFERENCES public.task_types(id) ON DELETE CASCADE;


--
-- Name: task_type_members task_type_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_type_members
    ADD CONSTRAINT task_type_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.processing_sessions(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_task_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_task_type_id_fkey FOREIGN KEY (task_type_id) REFERENCES public.task_types(id) ON DELETE SET NULL;


--
-- Name: time_logs time_logs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transcripts transcripts_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE SET NULL;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: firms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

--
-- Name: firms firms_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_delete_admin ON public.firms FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: firms firms_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_insert_admin ON public.firms FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: firms firms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_select ON public.firms FOR SELECT USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'member'::text])));


--
-- Name: firms firms_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_update_admin ON public.firms FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert ON public.notifications FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: org_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: org_settings org_settings_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_settings_select_all ON public.org_settings FOR SELECT USING (true);


--
-- Name: org_settings org_settings_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_settings_update_admin ON public.org_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- Name: processing_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processing_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members project_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_delete ON public.project_members FOR DELETE TO authenticated USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text, 'project_manager'::text])));


--
-- Name: project_members project_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_insert ON public.project_members FOR INSERT TO authenticated WITH CHECK ((public.current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text, 'project_manager'::text])));


--
-- Name: project_members project_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated USING (true);


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete_admin ON public.projects FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: projects projects_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert_admin ON public.projects FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: projects projects_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_select ON public.projects FOR SELECT USING ((public.current_user_role() = ANY (ARRAY['admin'::text, 'member'::text])));


--
-- Name: projects projects_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update_admin ON public.projects FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: prompts prompts_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prompts_delete_admin ON public.prompts FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: prompts prompts_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prompts_insert_admin ON public.prompts FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: prompts prompts_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prompts_select ON public.prompts FOR SELECT USING ((public.current_user_role() = 'admin'::text));


--
-- Name: prompts prompts_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prompts_update_admin ON public.prompts FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: processing_sessions sessions_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_delete_admin ON public.processing_sessions FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: processing_sessions sessions_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_insert_admin ON public.processing_sessions FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: processing_sessions sessions_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_select_admin ON public.processing_sessions FOR SELECT USING ((public.current_user_role() = 'admin'::text));


--
-- Name: processing_sessions sessions_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_update_admin ON public.processing_sessions FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

--
-- Name: skills skills_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY skills_delete_admin ON public.skills FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- Name: skills skills_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY skills_insert_admin ON public.skills FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- Name: skills skills_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY skills_select_all ON public.skills FOR SELECT USING (true);


--
-- Name: skills skills_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY skills_update_admin ON public.skills FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'project_manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'project_manager'::text]))))));


--
-- Name: task_type_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_type_members ENABLE ROW LEVEL SECURITY;

--
-- Name: task_type_members task_type_members_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_type_members_admin ON public.task_type_members USING ((public.current_user_role() = 'admin'::text));


--
-- Name: task_type_members task_type_members_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_type_members_select_all ON public.task_type_members FOR SELECT USING (true);


--
-- Name: task_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

--
-- Name: task_types task_types_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_types_delete_admin ON public.task_types FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: task_types task_types_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_types_insert_admin ON public.task_types FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: task_types task_types_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_types_select_all ON public.task_types FOR SELECT USING (true);


--
-- Name: task_types task_types_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_types_update_admin ON public.task_types FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets tickets_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_delete_admin ON public.tickets FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: tickets tickets_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_insert_admin ON public.tickets FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: tickets tickets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_select ON public.tickets FOR SELECT USING (((public.current_user_role() = 'admin'::text) OR ((public.current_user_role() = 'member'::text) AND (assignee_id = auth.uid()))));


--
-- Name: tickets tickets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tickets_update ON public.tickets FOR UPDATE USING (((public.current_user_role() = 'admin'::text) OR ((public.current_user_role() = 'member'::text) AND (assignee_id = auth.uid())))) WITH CHECK (((public.current_user_role() = 'admin'::text) OR ((public.current_user_role() = 'member'::text) AND (assignee_id = auth.uid()))));


--
-- Name: time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: time_logs time_logs_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_logs_delete_admin ON public.time_logs FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: time_logs time_logs_insert_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_logs_insert_member ON public.time_logs FOR INSERT WITH CHECK (((public.current_user_role() = ANY (ARRAY['admin'::text, 'member'::text])) AND (user_id = auth.uid())));


--
-- Name: time_logs time_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_logs_select ON public.time_logs FOR SELECT USING (((public.current_user_role() = 'admin'::text) OR ((public.current_user_role() = 'member'::text) AND (user_id = auth.uid()))));


--
-- Name: time_logs time_logs_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_logs_update_admin ON public.time_logs FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: transcripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

--
-- Name: transcripts transcripts_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transcripts_delete_admin ON public.transcripts FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: transcripts transcripts_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transcripts_insert_admin ON public.transcripts FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: transcripts transcripts_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transcripts_select_admin ON public.transcripts FOR SELECT USING ((public.current_user_role() = 'admin'::text));


--
-- Name: transcripts transcripts_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transcripts_update_admin ON public.transcripts FOR UPDATE USING ((public.current_user_role() = 'admin'::text)) WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: user_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: user_skills user_skills_modify_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_skills_modify_admin ON public.user_skills USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- Name: user_skills user_skills_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_skills_select_all ON public.user_skills FOR SELECT USING (true);


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_admin ON public.users FOR DELETE USING ((public.current_user_role() = 'admin'::text));


--
-- Name: users users_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_admin ON public.users FOR INSERT WITH CHECK ((public.current_user_role() = 'admin'::text));


--
-- Name: users users_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_self ON public.users FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT USING (((auth.uid() = id) OR (public.current_user_role() = 'admin'::text)));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_self ON public.users FOR UPDATE USING (((auth.uid() = id) OR (public.current_user_role() = 'admin'::text))) WITH CHECK (((auth.uid() = id) OR (public.current_user_role() = 'admin'::text)));


--
-- PostgreSQL database dump complete
--

\unrestrict ZwF4Q5IsngzmfmYZt474KbHmqg75eSl0nOA3aYDeOeEs8TZFNr0zalFE8v34dQs

