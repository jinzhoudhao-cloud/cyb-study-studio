import { env } from "cloudflare:workers";
import { handleStorageHealth } from "../../../lib/progress.mjs";
export const dynamic = "force-dynamic";
export function GET() { return handleStorageHealth(env.DB); }
