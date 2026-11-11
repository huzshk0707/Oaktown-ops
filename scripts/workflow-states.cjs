#!/usr/bin/env node
'use strict';
// Offline inventory and executable lifecycle contract. Never reads application records.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const inventory=require('../docs/workflow-state-inventory.json');
const W=require('../reviewed-write-model.js');
const args=process.argv.slice(2);
if(args.length>1||args.some(arg=>!['--check','--json'].includes(arg))){
 console.error('Usage: node scripts/workflow-states.cjs [--check|--json]');process.exit(2);
}
const errors=[],covered=new Set(),ids=new Set();
function exists(file){
 const resolved=path.resolve(root,file),relative=path.relative(root,resolved);
 return !relative.startsWith('..')&&!path.isAbsolute(relative)&&fs.existsSync(resolved)&&fs.statSync(resolved).isFile();
}
for(const item of inventory.machines){
 if(ids.has(item.id))errors.push('Duplicate workflow: '+item.id);ids.add(item.id);
 for(const file of [...item.sources,...item.tests])if(!exists(file))errors.push(item.id+': missing '+file);
 item.sources.forEach(file=>covered.add(file));
 if(!item.states.length||!item.guards.length||!item.tests.length)errors.push('Incomplete inventory: '+item.id);
 if(item.representation==='explicit'&&(item.states.some(state=>!Object.hasOwn(W.transitions,state))||Object.keys(W.transitions).some(state=>!item.states.includes(state))))errors.push('Unknown executable state: '+item.id);
}
const active=new Set();
for(const entry of inventory.entrypoints){
 if(!covered.has(entry))errors.push('Unmapped entrypoint: '+entry);
 const html=fs.readFileSync(path.join(root,entry),'utf8');
 for(const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)){
  const src=match[1].split(/[?#]/)[0];
  if(/^(?:https?:)?\/\//.test(src)||src.startsWith('vendor/'))continue;
  const file=path.posix.normalize(path.posix.join(path.posix.dirname(entry),src));active.add(file);
  if(!covered.has(file))errors.push('Active script has no workflow inventory entry: '+file);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
if(args.includes('--json'))console.log(JSON.stringify({...inventory,reviewed_write_transitions:W.transitions},null,2));
else console.log('Workflow inventory: '+ids.size+' families; '+active.size+' active first-party scripts covered; source/test references resolve.');
