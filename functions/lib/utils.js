"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripMarkdown = stripMarkdown;
exports.stripMarkdownFromData = stripMarkdownFromData;
/**
 * Strip markdown formatting from AI-generated legal text.
 * Preserves structure (numbered lists, paragraph breaks) while removing markdown syntax.
 */
function stripMarkdown(text) {
    if (!text)
        return text;
    return text
        .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        .replace(/^#{1,6}\s+(.+)$/gm, "$1") // Keep heading text, just remove # prefix
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/^[-*_]{3,}\s*$/gm, "") // Remove horizontal rules
        .replace(/^>\s?/gm, "") // Remove blockquote markers
        .replace(/^[-*+]\s+/gm, "") // Remove bullet markers but keep text
        .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
        .split("\n").map((l) => l.trimEnd()).join("\n")
        .trim();
}
/**
 * Strip markdown from all 'content' fields in a data object (recursive for nested objects).
 * Used to clean AI-generated document content before sending to client.
 */
function stripMarkdownFromData(data) {
    if (!data || typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(stripMarkdownFromData);
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === 'content' || key === 'memoOfCalculation' || key === 'analysis') {
            result[key] = typeof value === 'string' ? stripMarkdown(value) : value;
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = stripMarkdownFromData(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
