CREATE TABLE public.district_scheme_progress (
    id integer NOT NULL,
    district_id integer NOT NULL,
    scheme_name text NOT NULL,
    metric_a_label text NOT NULL,
    metric_a bigint,
    metric_b_label text,
    metric_b bigint,
    metric_c_label text,
    metric_c bigint,
    as_of_date date NOT NULL,
    source_id integer NOT NULL
);
CREATE SEQUENCE public.district_scheme_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.district_scheme_progress_id_seq OWNED BY public.district_scheme_progress.id;
CREATE TABLE public.districts (
    id integer NOT NULL,
    state_id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    unit_type text NOT NULL,
    unit_note text,
    display_order integer DEFAULT 0 NOT NULL,
    lgd_code integer,
    effective_from date,
    CONSTRAINT districts_unit_type_check CHECK ((unit_type = ANY (ARRAY['district'::text, 'urban_local_body'::text])))
);
CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;
CREATE TABLE public.exam_paper_leaks (
    id integer NOT NULL,
    state_id integer,
    exam_name text NOT NULL,
    conducting_body text,
    occurred_year integer NOT NULL,
    candidates_affected text,
    outcome text NOT NULL,
    summary text NOT NULL,
    outlet text NOT NULL,
    url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.exam_paper_leaks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.exam_paper_leaks_id_seq OWNED BY public.exam_paper_leaks.id;
CREATE TABLE public.findings (
    id integer NOT NULL,
    state_id integer,
    kind text NOT NULL,
    tag_label text NOT NULL,
    headline text NOT NULL,
    body text NOT NULL,
    computed_from_source boolean DEFAULT false NOT NULL,
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT findings_kind_check CHECK ((kind = ANY (ARRAY['audit'::text, 'underspend'::text, 'allocation'::text, 'shortfall'::text])))
);
CREATE SEQUENCE public.findings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.findings_id_seq OWNED BY public.findings.id;
CREATE TABLE public.ingestion_runs (
    id integer NOT NULL,
    adapter text NOT NULL,
    target_key text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    error text,
    counts jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT ingestion_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'ok'::text, 'failed'::text])))
);
CREATE SEQUENCE public.ingestion_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.ingestion_runs_id_seq OWNED BY public.ingestion_runs.id;
CREATE TABLE public.policy_roundup (
    id integer NOT NULL,
    happened_on date NOT NULL,
    region_label text NOT NULL,
    headline text NOT NULL,
    summary text NOT NULL,
    impact text NOT NULL,
    outlet text NOT NULL,
    url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.policy_roundup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.policy_roundup_id_seq OWNED BY public.policy_roundup.id;
CREATE TABLE public.raw_documents (
    id integer NOT NULL,
    run_id integer NOT NULL,
    url text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    media_type text,
    byte_size integer NOT NULL,
    sha256 text NOT NULL,
    extracted_text text,
    source_slug text NOT NULL,
    source_title text NOT NULL,
    source_publisher text NOT NULL,
    source_note text,
    document_date date,
    document_date_is_inferred boolean DEFAULT true NOT NULL
);
CREATE SEQUENCE public.raw_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.raw_documents_id_seq OWNED BY public.raw_documents.id;
CREATE TABLE public.sources (
    id integer NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    publisher text NOT NULL,
    url text NOT NULL,
    document_date date NOT NULL,
    document_date_is_inferred boolean DEFAULT false NOT NULL,
    retrieved_on date NOT NULL,
    note text
);
CREATE SEQUENCE public.sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.sources_id_seq OWNED BY public.sources.id;
CREATE TABLE public.staged_facts (
    id integer NOT NULL,
    run_id integer NOT NULL,
    raw_document_id integer,
    target_table text NOT NULL,
    natural_key text NOT NULL,
    payload jsonb NOT NULL,
    diff_kind text NOT NULL,
    previous_payload jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp with time zone,
    review_note text,
    promoted_at timestamp with time zone,
    CONSTRAINT staged_facts_diff_kind_check CHECK ((diff_kind = ANY (ARRAY['new'::text, 'changed'::text, 'unchanged'::text]))),
    CONSTRAINT staged_facts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'promoted'::text])))
);
CREATE SEQUENCE public.staged_facts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.staged_facts_id_seq OWNED BY public.staged_facts.id;
CREATE TABLE public.state_budget_headlines (
    id integer NOT NULL,
    state_id integer NOT NULL,
    fiscal_year text NOT NULL,
    label text NOT NULL,
    amount_cr numeric(14,2),
    qualifier text,
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.state_budget_headlines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.state_budget_headlines_id_seq OWNED BY public.state_budget_headlines.id;
CREATE TABLE public.state_budget_news (
    id integer NOT NULL,
    state_id integer NOT NULL,
    headline text NOT NULL,
    summary text NOT NULL,
    outlet text NOT NULL,
    url text NOT NULL,
    published_on date NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    category text DEFAULT 'budget'::text NOT NULL,
    scheme_name text,
    reported_amount text,
    CONSTRAINT state_budget_news_category_check CHECK ((category = ANY (ARRAY['budget'::text, 'loss'::text])))
);
CREATE SEQUENCE public.state_budget_news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.state_budget_news_id_seq OWNED BY public.state_budget_news.id;
CREATE TABLE public.state_scheme_allocations (
    id integer NOT NULL,
    state_id integer NOT NULL,
    scheme_name text NOT NULL,
    sector text,
    amount_cr numeric(12,2) NOT NULL,
    fiscal_year text NOT NULL,
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.state_scheme_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.state_scheme_allocations_id_seq OWNED BY public.state_scheme_allocations.id;
CREATE TABLE public.state_sector_budgets (
    id integer NOT NULL,
    state_id integer NOT NULL,
    sector text NOT NULL,
    actuals_prev_cr numeric(12,2),
    budgeted_cr numeric(12,2),
    revised_cr numeric(12,2),
    next_budget_cr numeric(12,2),
    provision_note text,
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.state_sector_budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.state_sector_budgets_id_seq OWNED BY public.state_sector_budgets.id;
CREATE TABLE public.states (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    lgd_code integer,
    CONSTRAINT states_kind_check CHECK ((kind = ANY (ARRAY['state'::text, 'ut_with_legislature'::text, 'ut_without_legislature'::text])))
);
CREATE SEQUENCE public.states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;
CREATE TABLE public.union_budget_headlines (
    id integer NOT NULL,
    fiscal_year text NOT NULL,
    label text NOT NULL,
    amount_cr numeric(14,2),
    qualifier text,
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.union_budget_headlines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.union_budget_headlines_id_seq OWNED BY public.union_budget_headlines.id;
CREATE TABLE public.union_ministry_budgets (
    id integer NOT NULL,
    ministry text NOT NULL,
    actuals_prev_cr numeric(14,2),
    budgeted_cr numeric(14,2),
    revised_cr numeric(14,2),
    next_budget_cr numeric(14,2),
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.union_ministry_budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.union_ministry_budgets_id_seq OWNED BY public.union_ministry_budgets.id;
CREATE TABLE public.union_scheme_allocations (
    id integer NOT NULL,
    scheme_name text NOT NULL,
    actuals_prev_cr numeric(12,2),
    budgeted_cr numeric(12,2),
    revised_cr numeric(12,2),
    next_budget_cr numeric(12,2),
    source_id integer NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);
CREATE SEQUENCE public.union_scheme_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.union_scheme_allocations_id_seq OWNED BY public.union_scheme_allocations.id;
ALTER TABLE ONLY public.district_scheme_progress ALTER COLUMN id SET DEFAULT nextval('public.district_scheme_progress_id_seq'::regclass);
ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);
ALTER TABLE ONLY public.exam_paper_leaks ALTER COLUMN id SET DEFAULT nextval('public.exam_paper_leaks_id_seq'::regclass);
ALTER TABLE ONLY public.findings ALTER COLUMN id SET DEFAULT nextval('public.findings_id_seq'::regclass);
ALTER TABLE ONLY public.ingestion_runs ALTER COLUMN id SET DEFAULT nextval('public.ingestion_runs_id_seq'::regclass);
ALTER TABLE ONLY public.policy_roundup ALTER COLUMN id SET DEFAULT nextval('public.policy_roundup_id_seq'::regclass);
ALTER TABLE ONLY public.raw_documents ALTER COLUMN id SET DEFAULT nextval('public.raw_documents_id_seq'::regclass);
ALTER TABLE ONLY public.sources ALTER COLUMN id SET DEFAULT nextval('public.sources_id_seq'::regclass);
ALTER TABLE ONLY public.staged_facts ALTER COLUMN id SET DEFAULT nextval('public.staged_facts_id_seq'::regclass);
ALTER TABLE ONLY public.state_budget_headlines ALTER COLUMN id SET DEFAULT nextval('public.state_budget_headlines_id_seq'::regclass);
ALTER TABLE ONLY public.state_budget_news ALTER COLUMN id SET DEFAULT nextval('public.state_budget_news_id_seq'::regclass);
ALTER TABLE ONLY public.state_scheme_allocations ALTER COLUMN id SET DEFAULT nextval('public.state_scheme_allocations_id_seq'::regclass);
ALTER TABLE ONLY public.state_sector_budgets ALTER COLUMN id SET DEFAULT nextval('public.state_sector_budgets_id_seq'::regclass);
ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);
ALTER TABLE ONLY public.union_budget_headlines ALTER COLUMN id SET DEFAULT nextval('public.union_budget_headlines_id_seq'::regclass);
ALTER TABLE ONLY public.union_ministry_budgets ALTER COLUMN id SET DEFAULT nextval('public.union_ministry_budgets_id_seq'::regclass);
ALTER TABLE ONLY public.union_scheme_allocations ALTER COLUMN id SET DEFAULT nextval('public.union_scheme_allocations_id_seq'::regclass);
ALTER TABLE ONLY public.district_scheme_progress
    ADD CONSTRAINT district_scheme_progress_district_id_scheme_name_as_of_date_key UNIQUE (district_id, scheme_name, as_of_date);
ALTER TABLE ONLY public.district_scheme_progress
    ADD CONSTRAINT district_scheme_progress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_slug_key UNIQUE (state_id, slug);
ALTER TABLE ONLY public.exam_paper_leaks
    ADD CONSTRAINT exam_paper_leaks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ingestion_runs
    ADD CONSTRAINT ingestion_runs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.policy_roundup
    ADD CONSTRAINT policy_roundup_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.raw_documents
    ADD CONSTRAINT raw_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.staged_facts
    ADD CONSTRAINT staged_facts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.staged_facts
    ADD CONSTRAINT staged_facts_run_id_target_table_natural_key_key UNIQUE (run_id, target_table, natural_key);
ALTER TABLE ONLY public.state_budget_headlines
    ADD CONSTRAINT state_budget_headlines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.state_budget_headlines
    ADD CONSTRAINT state_budget_headlines_state_id_fiscal_year_label_key UNIQUE (state_id, fiscal_year, label);
ALTER TABLE ONLY public.state_budget_news
    ADD CONSTRAINT state_budget_news_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.state_budget_news
    ADD CONSTRAINT state_budget_news_state_id_url_key UNIQUE (state_id, url);
ALTER TABLE ONLY public.state_scheme_allocations
    ADD CONSTRAINT state_scheme_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.state_scheme_allocations
    ADD CONSTRAINT state_scheme_allocations_state_id_scheme_name_fiscal_year_key UNIQUE (state_id, scheme_name, fiscal_year);
ALTER TABLE ONLY public.state_sector_budgets
    ADD CONSTRAINT state_sector_budgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.state_sector_budgets
    ADD CONSTRAINT state_sector_budgets_state_id_sector_key UNIQUE (state_id, sector);
ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.union_budget_headlines
    ADD CONSTRAINT union_budget_headlines_fiscal_year_label_key UNIQUE (fiscal_year, label);
ALTER TABLE ONLY public.union_budget_headlines
    ADD CONSTRAINT union_budget_headlines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.union_ministry_budgets
    ADD CONSTRAINT union_ministry_budgets_ministry_key UNIQUE (ministry);
ALTER TABLE ONLY public.union_ministry_budgets
    ADD CONSTRAINT union_ministry_budgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.union_scheme_allocations
    ADD CONSTRAINT union_scheme_allocations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.union_scheme_allocations
    ADD CONSTRAINT union_scheme_allocations_scheme_name_key UNIQUE (scheme_name);
CREATE UNIQUE INDEX districts_lgd_code_idx ON public.districts USING btree (lgd_code);
CREATE INDEX districts_state_idx ON public.districts USING btree (state_id, display_order);
CREATE INDEX exam_paper_leaks_state_idx ON public.exam_paper_leaks USING btree (state_id, occurred_year DESC);
CREATE INDEX exam_paper_leaks_union_idx ON public.exam_paper_leaks USING btree (occurred_year DESC) WHERE (state_id IS NULL);
CREATE INDEX findings_state_idx ON public.findings USING btree (state_id, display_order);
CREATE INDEX progress_district_idx ON public.district_scheme_progress USING btree (district_id);
CREATE UNIQUE INDEX raw_documents_run_url_idx ON public.raw_documents USING btree (run_id, url);
CREATE INDEX sector_state_idx ON public.state_sector_budgets USING btree (state_id, display_order);
CREATE INDEX staged_facts_key_idx ON public.staged_facts USING btree (target_table, natural_key, id DESC);
CREATE INDEX staged_facts_review_idx ON public.staged_facts USING btree (status, target_table) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));
CREATE INDEX state_budget_news_state_idx ON public.state_budget_news USING btree (state_id, published_on DESC);
CREATE UNIQUE INDEX states_lgd_code_idx ON public.states USING btree (lgd_code);
CREATE INDEX union_ministry_idx ON public.union_ministry_budgets USING btree (display_order);
CREATE INDEX union_scheme_idx ON public.union_scheme_allocations USING btree (display_order);
ALTER TABLE ONLY public.district_scheme_progress
    ADD CONSTRAINT district_scheme_progress_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.district_scheme_progress
    ADD CONSTRAINT district_scheme_progress_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.exam_paper_leaks
    ADD CONSTRAINT exam_paper_leaks_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.findings
    ADD CONSTRAINT findings_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.raw_documents
    ADD CONSTRAINT raw_documents_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.ingestion_runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.staged_facts
    ADD CONSTRAINT staged_facts_raw_document_id_fkey FOREIGN KEY (raw_document_id) REFERENCES public.raw_documents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.staged_facts
    ADD CONSTRAINT staged_facts_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.ingestion_runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.state_budget_headlines
    ADD CONSTRAINT state_budget_headlines_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.state_budget_headlines
    ADD CONSTRAINT state_budget_headlines_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.state_budget_news
    ADD CONSTRAINT state_budget_news_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.state_scheme_allocations
    ADD CONSTRAINT state_scheme_allocations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.state_scheme_allocations
    ADD CONSTRAINT state_scheme_allocations_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.state_sector_budgets
    ADD CONSTRAINT state_sector_budgets_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.state_sector_budgets
    ADD CONSTRAINT state_sector_budgets_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.union_budget_headlines
    ADD CONSTRAINT union_budget_headlines_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.union_ministry_budgets
    ADD CONSTRAINT union_ministry_budgets_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
ALTER TABLE ONLY public.union_scheme_allocations
    ADD CONSTRAINT union_scheme_allocations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);
