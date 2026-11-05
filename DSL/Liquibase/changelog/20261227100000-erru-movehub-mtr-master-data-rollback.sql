-- liquibase formatted sql
-- changeset ljvis:20261227100000-rollback ignore:true splitStatements:false
DROP TABLE IF EXISTS erru.mtr_penalty;
DROP TABLE IF EXISTS erru.mtr_infringement;
DROP TABLE IF EXISTS erru.mtr_certified_true_copy;
DROP TABLE IF EXISTS erru.mtr_community_licence;
DROP TABLE IF EXISTS erru.mtr_undertaking;
DROP TABLE IF EXISTS erru.mtr_cpc;
DROP TABLE IF EXISTS erru.mtr_person;
