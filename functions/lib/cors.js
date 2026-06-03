"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictedCors = void 0;
const cors_1 = __importDefault(require("cors"));
const ALLOWED = process.env.ALLOWED_ORIGINS || "https://aidraft.bond";
const originChecker = (origin, cb) => {
    if (!origin)
        return cb(null, true);
    const list = ALLOWED.split(",").map((o) => o.trim());
    if (list.includes(origin) || origin.startsWith("http://localhost"))
        return cb(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
};
exports.restrictedCors = (0, cors_1.default)({ origin: originChecker });
