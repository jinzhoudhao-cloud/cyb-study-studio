import { env } from 'cloudflare:workers';
import { handleCommunity } from '../../../../lib/community.mjs';
export const dynamic = 'force-dynamic';
function handle(request: Request) { return handleCommunity(request, env, new URL(request.url).pathname.split('/').pop()); }
export const GET=handle, POST=handle, PUT=handle, DELETE=handle;
