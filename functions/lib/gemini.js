"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiChat = geminiChat;
// @ts-nocheck
const https = __importStar(require("https"));
const MODEL = "gemini-2.5-flash";
function post(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, (res) => {
            let d = "";
            res.on("data", c => { d += c; });
            res.on("end", () => resolve({ status: res.statusCode, data: d }));
        });
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}
async function geminiChat(messages) {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        throw new Error("GEMINI_API_KEY not configured");
    let sys = "";
    const contents = [];
    for (const m of messages) {
        if (m.role === "system")
            sys = m.content;
        else
            contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
    }
    const b = { contents };
    if (sys)
        b.systemInstruction = { parts: [{ text: sys }] };
    const { status, data } = await post(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, JSON.stringify(b));
    if (status !== 200)
        throw new Error(`Gemini ${status}: ${data.substring(0, 300)}`);
    const p = JSON.parse(data);
    return p?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
