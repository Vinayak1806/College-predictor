# Cutoff Data Standard

Every extracted cutoff record uses these CSV columns:

- `academic_year`
- `admission_route`
- `cap_round`
- `quota`
- `institute_code`
- `college_name`
- `branch_code`
- `branch_name`
- `college_status`
- `university`
- `section`
- `seat_type`
- `category`
- `gender`
- `university_type`
- `stage`
- `opening_rank`
- `closing_rank`
- `opening_score`
- `closing_score`
- `source_file`
- `source_page`
- `extraction_method`
- `verified`
- `needs_review`
- `review_reason`

For the current FE Maharashtra cutoff PDFs, the official text states that the
rank value is the State General Merit Number and the bracketed value is the
merit percentile. The extractor therefore stores:

- `closing_rank`: the extracted merit number.
- `closing_score`: the extracted percentile.
- `opening_rank` and `opening_score`: blank until an official source provides
  opening values.

Unique cutoff key:

`academic_year + admission_route + cap_round + quota + institute_code + branch_code + seat_type`

