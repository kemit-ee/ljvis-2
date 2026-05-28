-- liquibase formatted sql
-- changeset ljvis:20260527153102-rollback ignore:true
-- EPIC 09 guarded rollback
-- Removes indexes before dropping tables so dependencies unwind in a predictable order.
-- All drops are guarded to keep rollback safe when objects are already missing.
DROP INDEX IF EXISTS idx_cvl_is_valid;
DROP INDEX IF EXISTS idx_cvl_code;
DROP INDEX IF EXISTS idx_cvl_classifier_code;
DROP INDEX IF EXISTS idx_cvl_classifier_id;
DROP INDEX IF EXISTS idx_cvl_classifier_value_id_created_at;
DROP INDEX IF EXISTS idx_cl_name_lower;
DROP INDEX IF EXISTS idx_cl_code;
DROP INDEX IF EXISTS idx_cl_classifier_id_created_at;
DROP INDEX IF EXISTS idx_cvvs_valid_until;
DROP INDEX IF EXISTS idx_cvvs_value_id_created_at;
DROP INDEX IF EXISTS idx_cv_name;
DROP INDEX IF EXISTS idx_cv_code;
DROP INDEX IF EXISTS idx_cv_classifier_id;
DROP INDEX IF EXISTS idx_cns_name;
DROP INDEX IF EXISTS idx_cns_classifier_id_created_at;
DROP INDEX IF EXISTS idx_classifier_code;
DROP INDEX IF EXISTS uq_classifier_code;

DROP TABLE IF EXISTS classifier_value_latest CASCADE;
DROP TABLE IF EXISTS classifier_latest CASCADE;
DROP TABLE IF EXISTS classifier_value_validity_state CASCADE;
DROP TABLE IF EXISTS classifier_value CASCADE;
DROP TABLE IF EXISTS classifier_name_state CASCADE;
DROP TABLE IF EXISTS classifier CASCADE;
