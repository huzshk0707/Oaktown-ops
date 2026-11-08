import {createRemoteJWKSet, jwtVerify} from 'jose';
export const RESOURCE='https://wjdzaexhhjsjtdgxivyw.supabase.co/functions/v1/oaktown-task-api/mcp';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createVerifier(supabaseUrl,resource=RESOURCE,keySet){
 const issuer=supabaseUrl.replace(/\/$/,'')+'/auth/v1';
 const keys=keySet||createRemoteJWKSet(new URL(issuer+'/.well-known/jwks.json'),{timeoutDuration:5000,cooldownDuration:30000});
 return async token=>{
  const {payload}=await jwtVerify(token,keys,{issuer,audience:resource,algorithms:['ES256','RS256'],
   requiredClaims:['exp','iat','sub','session_id','client_id','role']});
  if(payload.role!=='oaktown_task_agent'||payload.is_anonymous!==false||!UUID.test(payload.sub)||
    !UUID.test(payload.session_id)||typeof payload.client_id!=='string'||!payload.client_id)
   throw Error('A scoped Oaktown staff connection is required');
  return payload;
 };
}
