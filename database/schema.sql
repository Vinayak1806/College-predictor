CREATE TABLE universities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE cities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT,
    region TEXT,
    UNIQUE (name, district)
);

CREATE TABLE colleges (
    id BIGSERIAL PRIMARY KEY,
    institute_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    city_id BIGINT REFERENCES cities(id),
    university_id BIGINT REFERENCES universities(id),
    college_type TEXT,
    autonomous BOOLEAN NOT NULL DEFAULT FALSE,
    minority_type TEXT,
    official_website TEXT
);

CREATE TABLE college_profiles (
    id BIGSERIAL PRIMARY KEY,
    institute_code TEXT NOT NULL UNIQUE REFERENCES colleges(institute_code),
    institute_name TEXT NOT NULL,
    current_cap_2025 TEXT,
    state TEXT,
    region TEXT,
    district_city TEXT,
    address TEXT,
    ownership_type TEXT,
    autonomy_status TEXT,
    minority_status TEXT,
    university TEXT,
    total_intake INTEGER,
    branch_records INTEGER,
    fee_year TEXT,
    total_approved_fee INTEGER,
    fe_preference_proxy NUMERIC(10, 4),
    dse_preference_proxy NUMERIC(10, 4),
    combined_preference_proxy NUMERIC(10, 4),
    preference_band TEXT,
    naac_status TEXT,
    nba_status TEXT,
    placement_data TEXT,
    official_website TEXT,
    website_completeness_score NUMERIC(10, 4),
    website_completeness_status TEXT,
    data_quality_note TEXT,
    source_url TEXT
);

CREATE TABLE college_fees (
    id BIGSERIAL PRIMARY KEY,
    academic_year TEXT NOT NULL,
    fra_institute_id TEXT NOT NULL,
    institute_code TEXT REFERENCES colleges(institute_code),
    institute_name TEXT NOT NULL,
    district TEXT,
    approval_status TEXT,
    meeting_date TEXT,
    tuition_fee INTEGER,
    development_fee INTEGER,
    total_approved_fee INTEGER,
    source_url TEXT,
    UNIQUE (academic_year, fra_institute_id)
);

CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    branch_code TEXT NOT NULL UNIQUE,
    official_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    search_group TEXT
);

CREATE TABLE college_branches (
    id BIGSERIAL PRIMARY KEY,
    college_id BIGINT NOT NULL REFERENCES colleges(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    academic_year TEXT NOT NULL,
    intake INTEGER,
    UNIQUE (college_id, branch_id, academic_year)
);

CREATE TABLE seat_types (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    gender TEXT NOT NULL,
    university_type TEXT NOT NULL,
    special_type TEXT
);

CREATE TABLE cutoff_datasets (
    id BIGSERIAL PRIMARY KEY,
    academic_year TEXT NOT NULL,
    admission_route TEXT NOT NULL CHECK (admission_route IN ('FE', 'DSE')),
    cap_round INTEGER NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
    quota TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_url TEXT,
    file_hash TEXT,
    status TEXT NOT NULL CHECK (
        status IN ('UPLOADED', 'PROCESSING', 'NEEDS_REVIEW', 'VERIFIED', 'PUBLISHED', 'REJECTED')
    ),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);

CREATE TABLE cutoffs (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES cutoff_datasets(id),
    college_branch_id BIGINT NOT NULL REFERENCES college_branches(id),
    seat_type_id BIGINT NOT NULL REFERENCES seat_types(id),
    stage TEXT,
    opening_rank INTEGER,
    closing_rank INTEGER,
    opening_score NUMERIC(10, 7),
    closing_score NUMERIC(10, 7),
    source_page INTEGER NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    needs_review BOOLEAN NOT NULL DEFAULT TRUE,
    review_reason TEXT,
    UNIQUE (dataset_id, college_branch_id, seat_type_id, stage)
);

CREATE TABLE seat_matrices (
    id BIGSERIAL PRIMARY KEY,
    academic_year TEXT NOT NULL,
    admission_route TEXT NOT NULL CHECK (admission_route IN ('FE', 'DSE')),
    institute_code TEXT NOT NULL,
    college_name TEXT NOT NULL,
    college_status TEXT,
    college_type TEXT,
    autonomous BOOLEAN NOT NULL DEFAULT FALSE,
    cap_seats INTEGER,
    branch_code TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    sanctioned_intake INTEGER,
    maharashtra_seats INTEGER,
    minority_seats INTEGER,
    all_india_seats INTEGER,
    institute_seats INTEGER,
    orphan_seats INTEGER,
    ews_seats INTEGER,
    tfws_choice_code TEXT,
    tfws_seats INTEGER,
    source_file TEXT NOT NULL,
    source_page INTEGER NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    review_reason TEXT,
    UNIQUE (academic_year, admission_route, branch_code)
);

CREATE TABLE rejected_records (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT REFERENCES cutoff_datasets(id),
    source_page INTEGER,
    raw_record JSONB NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shortlists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    college_branch_id BIGINT NOT NULL REFERENCES college_branches(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE preference_lists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name TEXT NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
