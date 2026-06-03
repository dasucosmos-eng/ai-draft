"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLLMJSON = parseLLMJSON;
// @ts-nocheck
function parseLLMJSON(text) {
    if (!text)
        throw new Error("Empty response");
    try {
        return JSON.parse(text.trim());
    }
    catch { }
    const cb = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (cb) {
        try {
            return JSON.parse(cb[1].trim());
        }
        catch { }
    }
    const fb = text.indexOf('{');
    if (fb >= 0) {
        let d = 0, s = false, e = false;
        for (let i = fb; i < text.length; i++) {
            const c = text[i];
            if (e) {
                e = false;
                continue;
            }
            if (c === '\\') {
                e = true;
                continue;
            }
            if (c === '"') {
                s = !s;
                continue;
            }
            if (s)
                continue;
            if (c === '{')
                d++;
            if (c === '}') {
                d--;
                if (d === 0) {
                    try {
                        return JSON.parse(text.substring(fb, i + 1));
                    }
                    catch {
                        try {
                            return JSON.parse(text.substring(fb, i + 1).replace(/,\s*([\]}])/g, '$1').replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, ''));
                        }
                        catch {
                            return null;
                        }
                    }
                }
            }
        }
    }
    throw new Error("Could not parse JSON from response");
}
