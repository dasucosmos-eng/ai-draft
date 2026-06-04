"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripMarkdown = stripMarkdown;
exports.normalizeDocumentCase = normalizeDocumentCase;
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
 * Normalize ALL CAPS / block letter text to proper legal document casing.
 * - Lines that are entirely uppercase and match known heading patterns stay in ALL CAPS
 * - Other uppercase lines get converted to Title Case (for sub-headings) or Sentence case
 * - Normal mixed-case lines are left untouched
 */
const ALL_CAPS_HEADINGS = [
    // Court headers
    'IN THE SUPREME COURT OF INDIA',
    'IN THE HIGH COURT OF',
    'IN THE DISTRICT COURT',
    'IN THE FAMILY COURT',
    'IN THE COURT OF',
    'BEFORE THE HON\'BLE',
    'BEFORE THE JUDICIAL MAGISTRATE',
    'BEFORE THE MOTOR ACCIDENT',
    'BEFORE THE',
    // Document type headings
    'COMPLAINT',
    'PLAINT',
    'WRITTEN STATEMENT',
    'PETITION',
    'WRIT PETITION',
    'BAIL APPLICATION',
    'CRIMINAL REVISION PETITION',
    'CRIMINAL MISC.',
    'CRLMP',
    'AFFIDAVIT',
    'VERIFICATION',
    'VAKALATNAMA',
    'PRAYER',
    'CAUSE TITLE',
    'INTERLOCUTORY APPLICATION',
    'APPLICATION',
    'CLAIM PETITION',
    'SUIT',
    'MEMORANDUM OF APPEAL',
    'SPECIAL LEAVE PETITION',
    'TRANSFER PETITION',
    'INTERIM APPLICATION',
    'EXTRAORDINARY WRIT',
    // Common legal header patterns
    'IN THE MATTER OF',
    'AND IN THE MATTER OF',
    'BETWEEN',
    'VERSUS',
    'AND ANOTHER',
    'APPLICANT',
    'PETITIONER',
    'RESPONDENT',
    'COMPLAINANT',
    'ACCUSED',
    'PLAINTIFF',
    'DEFENDANT',
    'STATE OF',
    'UNION OF INDIA',
];
function isAllCapsLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3)
        return false;
    // Must be at least 70% uppercase letters to be considered "all caps"
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 3)
        return false;
    const upperCount = (letters.match(/[A-Z]/g) || []).length;
    return upperCount / letters.length >= 0.7;
}
function isKnownHeading(line) {
    const trimmed = line.trim().toUpperCase();
    return ALL_CAPS_HEADINGS.some(h => trimmed.startsWith(h) || trimmed === h);
}
function toTitleCase(str) {
    // Capitalize first letter of each word, lowercase the rest
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
    });
}
function toSentenceCase(str) {
    // Capitalize first letter, lowercase the rest
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
}
function normalizeDocumentCase(text) {
    if (!text || typeof text !== 'string')
        return text;
    const lines = text.split('\n');
    const result = [];
    for (const line of lines) {
        const trimmed = line.trim();
        // Leave empty lines, whitespace-only lines, and lines starting with numbers alone
        if (!trimmed || /^\d+$/.test(trimmed)) {
            result.push(line);
            continue;
        }
        // If the line is already mixed case (not all caps), leave it alone
        if (!isAllCapsLine(trimmed)) {
            result.push(line);
            continue;
        }
        // It's an ALL CAPS line — check if it's a known heading
        if (isKnownHeading(trimmed)) {
            // Keep known headings in ALL CAPS
            result.push(line);
            continue;
        }
        // It's an ALL CAPS line that's NOT a known heading
        // Check if it looks like a heading (short line, no period at end, or starts with common heading patterns)
        const isShortHeading = trimmed.length < 80 && !trimmed.endsWith('.') && !trimmed.match(/\d+\.$/);
        const isSubHeading = /^(CHAPTER|SECTION|PART|ANNEXURE|SCHEDULE|EXHIBIT|APPENDIX|CLAUSE)\s/i.test(trimmed);
        const isNumberedHeading = /^\d+\.?\s+[A-Z]/.test(trimmed) && trimmed.length < 100;
        if (isShortHeading || isSubHeading || isNumberedHeading) {
            // Convert to Title Case for sub-headings
            const leading = line.match(/^(\s*)/)?.[0] || '';
            result.push(leading + toTitleCase(trimmed));
        }
        else {
            // Convert to sentence case for body paragraphs
            const leading = line.match(/^(\s*)/)?.[0] || '';
            // Preserve proper nouns and legal terms that should stay capitalized
            let sentenceCased = toSentenceCase(trimmed);
            // Re-capitalize common legal terms and proper nouns
            const preserveTerms = [
                'Supreme Court', 'High Court', 'District Court', 'Family Court',
                'Article \\d+', 'Section \\d+', 'Act', 'Code',
                'Indian Penal Code', 'Criminal Procedure Code', 'Civil Procedure Code',
                'BNS', 'BNSS', 'BSA', 'IPC', 'CrPC', 'CPC', 'HMA', 'HAMA',
                'PWDVA', 'MVA', 'ISA', 'GW Act',
                'Constitution', 'India', 'Bharat',
            ];
            for (const term of preserveTerms) {
                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                sentenceCased = sentenceCased.replace(regex, (match) => {
                    // Capitalize each word in the match
                    return match.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                });
            }
            result.push(leading + sentenceCased);
        }
    }
    return result.join('\n');
}
/**
 * Strip markdown from all 'content' fields in a data object (recursive for nested objects).
 * Also normalizes text casing (removes ALL CAPS from body text).
 */
function stripMarkdownFromData(data) {
    if (!data || typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(stripMarkdownFromData);
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === 'content' || key === 'memoOfCalculation' || key === 'analysis') {
            if (typeof value === 'string') {
                let cleaned = stripMarkdown(value);
                cleaned = normalizeDocumentCase(cleaned);
                result[key] = cleaned;
            }
            else {
                result[key] = value;
            }
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
