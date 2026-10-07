import { env } from 'cloudflare:workers';
export function db(){if(!env.DB) throw new Error('Project storage unavailable'); return env.DB;}
