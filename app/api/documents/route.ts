import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../../db/raw';
export async function POST(req:Request){const u=await getChatGPTUser();if(!u)return new Response('Sign in required',{status:401});if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});try{if(Number(req.headers.get('content-length'))>11*1024*1024)return Response.json({error:'Files must be 10 MB or smaller.'},{status:413});const f=await req.formData();const file=f.get('file');const project=f.get('project');const kind=f.get('kind');if(!(file instanceof File)||!file.size||file.size>10*1024*1024||!['Quotation','Invoice','Receipt'].includes(String(kind)))return Response.json({error:'Choose a quotation, invoice or receipt file up to 10 MB.'},{status:400});if(!/\.(pdf|png|jpe?g|docx?|xlsx?|csv)$/i.test(file.name))return Response.json({error:'Use PDF, an image, Word, Excel, or CSV.'},{status:400});const p=await db().prepare('SELECT id FROM projects WHERE id=? AND owner=?').bind(project,u.userId).first();if(!p)return new Response('Not found',{status:404});if(!env.BUCKET)throw new Error('File storage unavailable');const id=crypto.randomUUID();await env.BUCKET.put(id,await file.arrayBuffer());try{await db().prepare('INSERT INTO documents (id,owner,project,name,kind,size,created) VALUES (?,?,?,?,?,?,?)').bind(id,u.userId,project,file.name.slice(0,255),kind,file.size,new Date().toISOString()).run();}catch(e){await env.BUCKET.delete(id);throw e;}return Response.json({ok:true});}catch(e){console.error(e);return Response.json({error:'Upload failed. Please try again.'},{status:503});}}
export async function GET(req:Request){const u=await getChatGPTUser();if(!u)return new Response('Sign in required',{status:401});try{const id=new URL(req.url).searchParams.get('id');const d=await db().prepare('SELECT * FROM documents WHERE id=? AND owner=?').bind(id,u.userId).first<{name:string}>();if(!d)return new Response('Not found',{status:404});const obj=await env.BUCKET?.get(id!);if(!obj)return new Response('File unavailable',{status:404});const type=({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'} as Record<string,string>)[d.name.split('.').pop()!.toLowerCase()];const preview=new URL(req.url).searchParams.get('preview')==='1';if(preview&&!type)return new Response('Preview is not available for this file type.',{status:415});return new Response(obj.body,{headers:{'Content-Type':preview?type:'application/octet-stream','Content-Disposition':`${preview?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(d.name)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});}catch(e){console.error(e);return new Response('Download unavailable. Please try again.',{status:503});}}

export async function PATCH(req:Request){
 const u=await getChatGPTUser();if(!u)return Response.json({error:'Please sign in again.'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Forbidden'},{status:403});
 try{
  const p=await req.json() as {id?:unknown;name?:unknown;kind?:unknown};
  if(typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>255||/[\x00-\x1f\x7f/\\]/.test(p.name)||!['Quotation','Invoice','Receipt'].includes(String(p.kind)))return Response.json({error:'Enter a document name and choose Quotation, Invoice, or Receipt.'},{status:400});
  const old=await db().prepare('SELECT name FROM documents WHERE id=? AND owner=?').bind(p.id,u.userId).first<{name:string}>();
  if(!old)return Response.json({error:'This document no longer exists.'},{status:404});
  const extension=old.name.match(/\.[^.]+$/)?.[0]||'';
  const name=p.name.trim();
  if(extension&&!name.toLowerCase().endsWith(extension.toLowerCase()))return Response.json({error:`Keep the original ${extension} file extension.`},{status:400});
  const result=await db().prepare('UPDATE documents SET name=?,kind=? WHERE id=? AND owner=?').bind(name,p.kind,p.id,u.userId).run();
  if(!result.meta.changes)return Response.json({error:'This document no longer exists.'},{status:404});
  return Response.json({ok:true,name,kind:p.kind});
 }catch(e){console.error(e);return Response.json({error:'Unable to update the document. Please try again.'},{status:503});}
}
export async function DELETE(req:Request){
 const u=await getChatGPTUser();if(!u)return Response.json({error:'Please sign in again.'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Forbidden'},{status:403});
 try{
  const id=new URL(req.url).searchParams.get('id');if(!id)return Response.json({error:'Choose a document to delete.'},{status:400});
  const old=await db().prepare('SELECT id FROM documents WHERE id=? AND owner=?').bind(id,u.userId).first();
  if(!old)return Response.json({ok:true});
  if(!env.BUCKET)throw new Error('File storage unavailable');
  await env.BUCKET.delete(id);
  await db().prepare('DELETE FROM documents WHERE id=? AND owner=?').bind(id,u.userId).run();
  return Response.json({ok:true});
 }catch(e){console.error(e);return Response.json({error:'Deletion could not finish. Please retry to complete it.'},{status:503});}
}
