#!/usr/bin/env bash
# Exact Phase 3 historical CI fixture + real-RPC action test. Review evidence only.
# Use a fresh isolated PostgreSQL 16 cluster with no production network connection.
set -euo pipefail
[[ ${PGDATABASE:-} == oaktown_portfolio_ci ]] || { echo 'Disposable oaktown_portfolio_ci required' >&2; exit 1; }
[[ $# == 1 ]] || { echo 'Supply the exact Phase 3 source export' >&2; exit 1; }
cd "$1"
psql -v ON_ERROR_STOP=1 \
  -f tests/portfolio-schema-setup.sql \
  -f supabase/migrations/20261026171822_oaktown_portfolio_relational_core_v05.sql \
  -f supabase/migrations/20261026171941_oaktown_portfolio_foreign_key_indexes_v05.sql \
  -f tests/portfolio-schema-check.sql \
  -f supabase/migrations/20261027074200_oaktown_whole_property_renewal_cases_v05.sql \
  -f supabase/schema/task_intake_v1.sql \
  -f supabase/schema/task_cleanup_v1.sql \
  -f supabase/schema/today_task_editor_v1.sql \
  -f supabase/schema/task_delete_archived_v1.sql \
  -f supabase/migrations/20261103211729_lease_reference_document_library.sql \
  -f tests/lease-reference-documents-check.sql \
  -f tests/portfolio-hardening-check.sql \
  -f tests/task-intake-check.sql \
  -f tests/task-cleanup-check.sql \
  -f tests/today-task-editor-check.sql \
  -f tests/task-delete-archived-check.sql \
  -f supabase/migrations/20261108050604_master_backlog_controlled_import.sql \
  -f tests/master-backlog-import-check.sql
node tests/focus-actions-database.cjs
