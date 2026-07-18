CREATE INDEX idx_cutoff_datasets_route_year_round
    ON cutoff_datasets (admission_route, academic_year, cap_round, quota, status);

CREATE INDEX idx_colleges_institute_code
    ON colleges (institute_code);

CREATE INDEX idx_college_fees_institute_code
    ON college_fees (institute_code);

CREATE INDEX idx_branches_branch_code
    ON branches (branch_code);

CREATE INDEX idx_seat_types_code_category
    ON seat_types (code, category);

CREATE INDEX idx_cutoffs_score
    ON cutoffs (closing_score);

CREATE INDEX idx_cutoffs_rank
    ON cutoffs (closing_rank);

CREATE INDEX idx_cutoffs_dataset_branch_seat
    ON cutoffs (dataset_id, college_branch_id, seat_type_id);

CREATE INDEX idx_colleges_city
    ON colleges (city_id);

CREATE INDEX idx_seat_matrices_year_branch
    ON seat_matrices (academic_year, branch_code);

CREATE INDEX idx_seat_matrices_institute
    ON seat_matrices (institute_code);

CREATE INDEX idx_seat_matrices_intake
    ON seat_matrices (sanctioned_intake, cap_seats);
