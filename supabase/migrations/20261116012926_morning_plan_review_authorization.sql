-- WIP checkpoint: Phase 6 design is recorded; this migration is not implemented.
-- Do not apply. The deliberate exception prevents recording an empty migration.
do $$begin raise exception 'Phase 6 plan authorization is incomplete; do not apply this checkpoint';end$$;
