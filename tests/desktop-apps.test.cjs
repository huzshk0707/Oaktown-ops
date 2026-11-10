'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../desktop-apps-model.js'),Zip=require('../vendor/jszip-3.10.1.min.js');
const app=()=>({id:'pdfcraft',name:'Fictional PDF tool',executable:'C:\\Tools\\PDF editor & tools\\tool.exe'}),config=()=>({version:1,apps:[app()]});
test('app requests contain one approved ID and never include executable paths or arguments',()=>{
 assert.equal(M.uri('pdfcraft'),'oaktown-ops://launch/pdfcraft');
 for(const id of [undefined,null,'../pdfcraft','pdfcraft?args=anything','PDFCraft','pdfcraft#x','pdfcraft/','pdfcraft\n','C:\\tool.exe'])assert.throws(()=>M.uri(id));
 assert.equal(M.path('"'+app().executable+'"'),app().executable);
 for(const path of ['\\\\server\\share\\tool.exe','file:///C:/tool.exe','C:\\tool.cmd','C:\\tool.exe:stream.exe','C:\\tool.exe\narg','%USERPROFILE%\\tool.exe','C:\\tool.exe" -x'])assert.throws(()=>M.path(path));
});
test('device catalog restores safe defaults, validates IDs and keeps incomplete setup separate from launch shortcuts',()=>{
 assert.equal(M.read(null).apps[0].id,'pdfcraft');assert.equal(M.read('invalid').apps[0].executable,'');
 assert.deepEqual(M.validate(config()),config());assert.throws(()=>M.validate(M.defaults(),true));
 for(const bad of [{version:2,apps:[]},{version:1,apps:[app(),app()]},{version:1,apps:[{...app(),id:undefined}]},{version:1,apps:[{...app(),arguments:'C:\\private.pdf'}]},{version:1,apps:[{...app(),name:'x\ny'}]},{version:1,apps:Array(21).fill(app())}])assert.throws(()=>M.validate(bad));
 assert.equal(M.validate({version:1,apps:[]}).apps.length,0);
});
test('setup ZIP contains generic audited sources and only the approved local app list',async()=>{
 const sources=Object.fromEntries(M.FILES.map(n=>[n,fs.readFileSync('assets/windows-launcher/'+n,'utf8')])),bytes=await M.bundle(Zip,sources,config()),zip=await Zip.loadAsync(bytes);
 assert.deepEqual(JSON.parse(await zip.file('apps.json').async('string')),config());
 assert.deepEqual(Object.keys(zip.files).sort(),[...M.FILES,'apps.json'].sort());
 assert.match(await zip.file('Install.cmd').async('string'),/-NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"/);
 assert.match(await zip.file('Launcher.cs').async('string'),/start.UseShellExecute = false/);
 await assert.rejects(M.bundle(Zip,{},config()));
});
