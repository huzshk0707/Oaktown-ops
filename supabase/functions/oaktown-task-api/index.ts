import {createHandler} from './server.mjs';
const url=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_ANON_KEY');
if(!url||!key)throw Error('Supabase public connection settings are missing');
// No service-role key is read or used. Each database call forwards the verified
// resource-bound user's OAuth JWT and uses the dedicated task role.
Deno.serve(createHandler({supabaseUrl:url,publishableKey:key}));
