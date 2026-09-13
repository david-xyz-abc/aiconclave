import { parseCookies } from '../../functions/_shared/auth.js';
export const COOKIE = '__Host-room_finder';
export const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json','cache-control':'no-store',...extra}});
const hex = bytes => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
async function signature(value, secret) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
}
export async function token(secret) {
 const value = `${Date.now()+12*60*60*1000}.${crypto.randomUUID()}`;
 return `${value}.${await signature(value,secret)}`;
}
export function cookie(value, age=43200) { return `${COOKIE}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`; }
export async function authenticated({request,env}) {
 const raw=parseCookies(request)[COOKIE];
 if (!raw || !env.FINDER_SESSION_SECRET) return false;
 const parts=raw.split('.');
 if(parts.length!==3 || !/^\d+$/.test(parts[0]) || Number(parts[0])<=Date.now() || Number(parts[0])>Date.now()+43200000) return false;
 const expected=await signature(parts.slice(0,2).join('.'),env.FINDER_SESSION_SECRET);
 const {constantTimeEqual}=await import('../../functions/_shared/auth.js');
 return constantTimeEqual(parts[2],expected);
}
