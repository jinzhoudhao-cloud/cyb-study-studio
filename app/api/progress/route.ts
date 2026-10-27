import { env } from "cloudflare:workers";
import { handleProgress } from "../../../lib/progress.mjs";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return handleProgress(request, env.DB); }
export function PUT(request: Request) { return handleProgress(request, env.DB); }
export function DELETE(request: Request) { return handleProgress(request, env.DB); }
