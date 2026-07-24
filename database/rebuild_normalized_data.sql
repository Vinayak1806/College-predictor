\set ON_ERROR_STOP on

BEGIN;

TRUNCATE TABLE
    seat_matrices,
    college_fees,
    college_profiles,
    cutoffs,
    college_branches,
    branches,
    seat_types,
    cutoff_datasets,
    colleges,
    cities,
    universities
RESTART IDENTITY CASCADE;

\copy cities (id, name, district, region) FROM 'data/processed/postgres/cities.csv' WITH (FORMAT csv, HEADER true);
\copy universities (id, name) FROM 'data/processed/postgres/universities.csv' WITH (FORMAT csv, HEADER true);
\copy colleges (id, institute_code, name, slug, city_id, university_id, college_type, autonomous, minority_type, official_website) FROM 'data/processed/postgres/colleges.csv' WITH (FORMAT csv, HEADER true);
\copy branches (id, branch_code, official_name, display_name, search_group) FROM 'data/processed/postgres/branches.csv' WITH (FORMAT csv, HEADER true);
\copy college_branches (id, college_id, branch_id, academic_year, intake) FROM 'data/processed/postgres/college_branches.csv' WITH (FORMAT csv, HEADER true);
\copy seat_types (id, code, category, gender, university_type, special_type) FROM 'data/processed/postgres/seat_types.csv' WITH (FORMAT csv, HEADER true);
\copy cutoff_datasets (id, academic_year, admission_route, cap_round, quota, source_filename, source_url, file_hash, status) FROM 'data/processed/postgres/cutoff_datasets.csv' WITH (FORMAT csv, HEADER true);
\copy cutoffs (id, dataset_id, college_branch_id, seat_type_id, stage, opening_rank, closing_rank, opening_score, closing_score, source_page, verified, needs_review, review_reason) FROM 'data/processed/postgres/cutoffs.csv' WITH (FORMAT csv, HEADER true);

\copy seat_matrices (academic_year, admission_route, institute_code, college_name, college_status, college_type, autonomous, cap_seats, branch_code, branch_name, sanctioned_intake, maharashtra_seats, minority_seats, all_india_seats, institute_seats, orphan_seats, ews_seats, tfws_choice_code, tfws_seats, source_file, source_page, needs_review, review_reason) FROM 'data/staging/FE_2023_SeatMatrix.csv' WITH (FORMAT csv, HEADER true);
\copy seat_matrices (academic_year, admission_route, institute_code, college_name, college_status, college_type, autonomous, cap_seats, branch_code, branch_name, sanctioned_intake, maharashtra_seats, minority_seats, all_india_seats, institute_seats, orphan_seats, ews_seats, tfws_choice_code, tfws_seats, source_file, source_page, needs_review, review_reason) FROM 'data/staging/FE_2024_SeatMatrix.csv' WITH (FORMAT csv, HEADER true);
\copy seat_matrices (academic_year, admission_route, institute_code, college_name, college_status, college_type, autonomous, cap_seats, branch_code, branch_name, sanctioned_intake, maharashtra_seats, minority_seats, all_india_seats, institute_seats, orphan_seats, ews_seats, tfws_choice_code, tfws_seats, source_file, source_page, needs_review, review_reason) FROM 'data/staging/FE_2025_SeatMatrix.csv' WITH (FORMAT csv, HEADER true);

SELECT setval(pg_get_serial_sequence('cities', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM cities;
SELECT setval(pg_get_serial_sequence('universities', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM universities;
SELECT setval(pg_get_serial_sequence('colleges', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM colleges;
SELECT setval(pg_get_serial_sequence('branches', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM branches;
SELECT setval(pg_get_serial_sequence('college_branches', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM college_branches;
SELECT setval(pg_get_serial_sequence('seat_types', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM seat_types;
SELECT setval(pg_get_serial_sequence('cutoff_datasets', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM cutoff_datasets;
SELECT setval(pg_get_serial_sequence('cutoffs', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM cutoffs;

COMMIT;
