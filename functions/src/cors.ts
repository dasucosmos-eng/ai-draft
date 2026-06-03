import cors from "cors";
const ALLOWED = process.env.ALLOWED_ORIGINS || "https://aidraft.bond";
const originChecker = (origin: string | undefined, cb: (e: Error | null, a?: boolean) => void) => {
  if (!origin) return cb(null, true);
  const list = ALLOWED.split(",").map((o) => o.trim());
  if (list.includes(origin) || origin.startsWith("http://localhost")) return cb(null, true);
  console.warn(`[CORS] Blocked: ${origin}`);
  return cb(new Error("Not allowed by CORS"));
};
export const restrictedCors = cors({ origin: originChecker as any });
