-- Migration to clear all price tables and entries for a "flawless" clean start
-- WARNING: This deletes all pricing data!
-- Created at: 2026-01-05 23:00:00

BEGIN;

TRUNCATE TABLE price_matrix_entries CASCADE;
TRUNCATE TABLE price_tables CASCADE;

COMMIT;
