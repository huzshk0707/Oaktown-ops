/* Device-local app allowlist; paths never become launch URLs or server requests. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.OpsDesktopAppsModel=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID=/^[a-z0-9][a-z0-9-]{0,39}$/,FILES=['Launcher.cs','Install.ps1','Install.cmd','Uninstall.ps1','Uninstall.cmd','README.txt'];
 const defaults=()=>({version:1,apps:[{id:'pdfcraft',name:'PDFCraft',executable:''}]});
 function path(value){
  if(typeof value!=='string')throw Error('Enter the full Windows .exe path.');let s=value.trim();if(s.startsWith('"')&&s.endsWith('"'))s=s.slice(1,-1).trim();
  if(s.length>1024||!(/^[a-z]:\\/i.test(s))||/[\x00-\x1f\x7f"<>|?*]/.test(s)||s.slice(2).includes(':')||!s.toLowerCase().endsWith('.exe'))throw Error('Choose a local drive .exe path, such as C:\\Tools\\Example\\app.exe.');return s;
 }
 function validate(value,requirePaths=false){
  if(!value||value.version!==1||!Array.isArray(value.apps)||value.apps.length>20||Object.keys(value).some(k=>!['version','apps'].includes(k)))throw Error('Choose a valid Oaktown app list with up to 20 apps.');
  if(requirePaths&&!value.apps.length)throw Error('Add at least one app before downloading setup.');
  const ids=new Set();return {version:1,apps:value.apps.map(app=>{
   if(!app||typeof app.id!=='string'||!ID.test(app.id)||ids.has(app.id)||typeof app.name!=='string'||!app.name.trim()||app.name.length>80||/[\x00-\x1f\x7f]/.test(app.name)||Object.keys(app).some(k=>!['id','name','executable'].includes(k)))throw Error('Check the app name and remove duplicate shortcuts.');ids.add(app.id);
   const executable=app.executable===''&&!requirePaths?'':path(app.executable);return {id:app.id,name:app.name.trim(),executable};
  })};
 }
 function read(raw){if(raw==null)return defaults();try{return validate(JSON.parse(raw))}catch{return defaults()}}
 function uri(id){if(typeof id!=='string'||!ID.test(id))throw Error('Invalid app ID');return 'oaktown-ops://launch/'+id;}
 async function bundle(Zip,sources,value){const config=validate(value,true),zip=new Zip();for(const name of FILES){if(typeof sources[name]!=='string'||!sources[name])throw Error('Windows setup files could not load. Refresh and try again.');const text=sources[name].replace(/\r?\n/g,'\r\n');zip.file(name,text);}zip.file('apps.json',JSON.stringify(config,null,2)+'\r\n');return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});}
 return Object.freeze({FILES,defaults,path,validate,read,uri,bundle});
});
