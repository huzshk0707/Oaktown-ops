-- Keep the installed function and its grants. Replace only the reviewed
-- my_connections query, whose clients alias conflicts with the PL/pgSQL row variable.
do $migration$
declare
  previous_query constant text := $previous$  return coalesce((select jsonb_agg(jsonb_build_object('client_id',c.client_id,'label',c.label,'enabled',c.enabled,'can_read_plans',c.can_read_plans,'can_submit_plans',c.can_submit_plans,
   'my_can_read_plans',coalesce(pc.can_read_plans and pc.revoked_at is null,false),'my_can_submit_plans',coalesce(pc.can_submit_plans and pc.revoked_at is null,false)) order by c.label)
   from ops_agent_private.clients c join auth.oauth_consents ac on ac.client_id::text=c.client_id and ac.user_id=actor and ac.revoked_at is null
   left join ops_agent_private.plan_consents pc on pc.client_id=c.client_id and pc.actor_id=actor),'[]');$previous$;
  updated_query constant text := $updated$  return coalesce((
   select jsonb_agg(jsonb_build_object(
    'client_id', registered_client.client_id,
    'label', registered_client.label,
    'enabled', registered_client.enabled,
    'can_read_plans', registered_client.can_read_plans,
    'can_submit_plans', registered_client.can_submit_plans,
    'my_can_read_plans', coalesce(pc.can_read_plans and pc.revoked_at is null, false),
    'my_can_submit_plans', coalesce(pc.can_submit_plans and pc.revoked_at is null, false)
   ) order by registered_client.label)
   from ops_agent_private.clients registered_client
   join auth.oauth_consents ac
    on ac.client_id::text = registered_client.client_id and ac.user_id = actor and ac.revoked_at is null
   left join ops_agent_private.plan_consents pc
    on pc.client_id = registered_client.client_id and pc.actor_id = actor
  ), '[]');$updated$;
  function_definition text := pg_catalog.pg_get_functiondef('ops_agent_private.morning_plan(text,jsonb)'::regprocedure);
  query_start integer := strpos(function_definition, previous_query);
begin
  if query_start = 0 or strpos(substr(function_definition, query_start + length(previous_query)), previous_query) > 0 then
    raise exception 'Expected one Morning Plan my_connections query. Review the installed function before applying this migration.';
  end if;

  execute replace(function_definition, previous_query, updated_query);
end;
$migration$;
