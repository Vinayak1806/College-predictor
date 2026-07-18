\copy cities (id, name, district, region) FROM 'data/processed/postgres/cities.csv' WITH (FORMAT csv, HEADER true);
\copy universities (id, name) FROM 'data/processed/postgres/universities.csv' WITH (FORMAT csv, HEADER true);
\copy colleges (id, institute_code, name, slug, city_id, university_id, college_type, autonomous, minority_type, official_website) FROM 'data/processed/postgres/colleges.csv' WITH (FORMAT csv, HEADER true);
\copy branches (id, branch_code, official_name, display_name, search_group) FROM 'data/processed/postgres/branches.csv' WITH (FORMAT csv, HEADER true);
\copy college_branches (id, college_id, branch_id, academic_year, intake) FROM 'data/processed/postgres/college_branches.csv' WITH (FORMAT csv, HEADER true);
\copy seat_types (id, code, category, gender, university_type, special_type) FROM 'data/processed/postgres/seat_types.csv' WITH (FORMAT csv, HEADER true);
\copy cutoff_datasets (id, academic_year, admission_route, cap_round, quota, source_filename, source_url, file_hash, status) FROM 'data/processed/postgres/cutoff_datasets.csv' WITH (FORMAT csv, HEADER true);
\copy cutoffs (id, dataset_id, college_branch_id, seat_type_id, stage, opening_rank, closing_rank, opening_score, closing_score, source_page, verified, needs_review, review_reason) FROM 'data/processed/postgres/cutoffs.csv' WITH (FORMAT csv, HEADER true);

