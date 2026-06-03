"use strict";
// Free Indian legal data sources
// All FREE, no API keys needed
//
// Sources:
//   1. AdvocateKhoj — Bare Acts with full text (advocatekhoj.com)
//   2. India Code — Central & State Acts registry (indiacode.nic.in)
//   3. eCourts eSCR — Judgments (judgments.ecourts.gov.in) [CAPTCHA protected - web only]
//   4. Supreme Court — SC Judgments (sci.gov.in)
//   5. Open Government Data — India Code legislative.gov.in
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUTE_INDEX = void 0;
exports.searchBareActs = searchBareActs;
exports.getBareAct = getBareAct;
exports.getBareActSection = getBareActSection;
exports.searchIndiaCode = searchIndiaCode;
exports.getIndiaCodeAct = getIndiaCodeAct;
exports.getRelevantStatutes = getRelevantStatutes;
exports.searchAllFreeLegalSources = searchAllFreeLegalSources;
exports.getSectionText = getSectionText;
exports.advocateKhojHealthCheck = advocateKhojHealthCheck;
exports.indiaCodeHealthCheck = indiaCodeHealthCheck;
exports.embeddedStatutesHealthCheck = embeddedStatutesHealthCheck;
const ADVOCATEKHOJ_BASE = "https://www.advocatekhoj.com/library/bareacts";
/**
 * Search bare acts index page for matching acts
 * Returns list of matching act titles with slugs
 */
async function searchBareActs(query) {
    try {
        const response = await fetch(`${ADVOCATEKHOJ_BASE}/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        if (!response.ok)
            return [];
        const html = await response.text();
        // Extract all bare act links: href="slug/index.php?Title=..."
        const matches = html.matchAll(/href="([^/]+)\/index\.php\?Title=([^"]+)"/g);
        const queryLower = query.toLowerCase();
        const results = [];
        for (const match of matches) {
            const slug = match[1];
            const title = decodeURIComponent(match[2]).trim();
            if (title.toLowerCase().includes(queryLower) || slug.toLowerCase().includes(queryLower)) {
                results.push({ title, slug });
            }
            if (results.length >= 10)
                break;
        }
        return results;
    }
    catch (error) {
        console.error("[AdvocateKhoj] Search error:", error);
        return [];
    }
}
/**
 * Get full text of a bare act by slug (e.g., "aadhaar2016")
 */
async function getBareAct(slug) {
    try {
        const response = await fetch(`${ADVOCATEKHOJ_BASE}/${slug}/index.php?Title=${slug}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        if (!response.ok)
            return null;
        const html = await response.text();
        // Extract title
        const titleMatch = html.match(/<p[^>]*><font[^>]*><b>([^<]+)<\/b><\/font><\/p>/);
        const title = titleMatch?.[1]?.trim() || slug;
        // Extract sections: href="N.php?Title=...&STitle=..."
        const sectionMatches = html.matchAll(/href="(\d+\.php)\?Title=([^&]+)&STitle=([^"]+)"/g);
        const sections = [];
        for (const match of sectionMatches) {
            sections.push({
                number: match[1].replace(".php", ""),
                title: decodeURIComponent(match[3]).trim(),
                url: `${ADVOCATEKHOJ_BASE}/${slug}/${match[1]}?Title=${match[2]}&STitle=${match[3]}`,
            });
        }
        return { title, slug, sections };
    }
    catch (error) {
        console.error(`[AdvocateKhoj] Get act "${slug}" error:`, error);
        return null;
    }
}
/**
 * Get specific section text from a bare act
 */
async function getBareActSection(slug, sectionNumber) {
    try {
        const url = `${ADVOCATEKHOJ_BASE}/${slug}/${sectionNumber}.php`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        if (!response.ok)
            return null;
        const html = await response.text();
        // Extract section content — AdvocateKhoj wraps section text in <font> tags
        const contentMatch = html.match(/<div[^>]*id="content_container"[^>]*>([\s\S]*?)<\/div>/);
        if (contentMatch) {
            // Strip HTML tags
            return contentMatch[1]
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }
        return null;
    }
    catch (error) {
        console.error(`[AdvocateKhoj] Get section "${slug}/${sectionNumber}" error:`, error);
        return null;
    }
}
// ============================================================
// 2. INDIA CODE — Central & State Acts Registry (FREE)
// ============================================================
const INDIA_CODE_BASE = "https://www.indiacode.nic.in";
/**
 * Search India Code for Central/State Acts
 * Uses the browse-by-short-title endpoint (no CAPTCHA, DSpace based)
 */
async function searchIndiaCode(query) {
    try {
        // India Code's simple search returns HTML with results
        const response = await fetch(`${INDIA_CODE_BASE}/simple-search?query=${encodeURIComponent(query)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        if (!response.ok)
            return [];
        const html = await response.text();
        // Extract links to act handles from search results
        // Format: /handle/123456789/XXXX/
        const matches = html.matchAll(/href="\/handle\/123456789\/(\d+)\/"[^>]*>([^<]+)/g);
        const queryLower = query.toLowerCase();
        const results = [];
        for (const match of matches) {
            const handle = match[1];
            const title = match[2].trim();
            if (title.toLowerCase().includes(queryLower) || queryLower.length > 2) {
                results.push({ title, handle });
            }
            if (results.length >= 10)
                break;
        }
        return results;
    }
    catch (error) {
        console.error("[India Code] Search error:", error);
        return [];
    }
}
/**
 * Get act details from India Code by handle ID
 */
async function getIndiaCodeAct(handle) {
    try {
        const response = await fetch(`${INDIA_CODE_BASE}/handle/123456789/${handle}/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        if (!response.ok)
            return null;
        const html = await response.text();
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 5000); // Limit text size
    }
    catch (error) {
        console.error(`[India Code] Get act "${handle}" error:`, error);
        return null;
    }
}
// ============================================================
// 3. LEGAL KNOWLEDGE BASE — Common Indian Statutes (Embedded)
// ============================================================
/**
 * Pre-loaded mapping of common legal queries to relevant Indian statutes.
 * This allows instant statute references without any external API calls.
 * Used as a fast first-pass before falling back to external scrapers.
 */
exports.STATUTE_INDEX = {
    "bail": [
        {
            name: "Code of Criminal Procedure, 1973 (CrPC)",
            sections: [
                { number: "436", description: "Bail in bailable offences — accused shall be released on bail" },
                { number: "437", description: "Bail in non-bailable offences — court's discretion" },
                { number: "438", description: "Anticipatory bail — direction for release on apprehension" },
                { number: "439", description: "Special powers of High Court and Court of Session regarding bail" },
                { number: "167", description: "Police custody — detention for investigation (max 15 days)" },
            ],
            relevance: 100,
        },
        {
            name: "Constitution of India",
            sections: [
                { number: "21", description: "Protection of life and personal liberty — no deprivation except by procedure established by law" },
                { number: "22", description: "Prevention of arrest and detention — protection against arbitrary arrest" },
            ],
            relevance: 80,
        },
    ],
    "cheque bounce": [
        {
            name: "Negotiable Instruments Act, 1881",
            sections: [
                { number: "138", description: "Dishonour of cheque for insufficiency of funds — penal provision" },
                { number: "139", description: "Complaint by payee — limitation of 30 days from receipt of notice" },
                { number: "141", description: "Offences by companies — every person in charge liable" },
            ],
            relevance: 100,
        },
        {
            name: "Code of Criminal Procedure, 1973 (CrPC)",
            sections: [
                { number: "143", description: "Cognizance of offence — magistrate takes cognizance on complaint" },
                { number: "204", description: "Issue of process — magistrate examines complainant and witnesses" },
            ],
            relevance: 70,
        },
    ],
    "divorce": [
        {
            name: "Hindu Marriage Act, 1955",
            sections: [
                { number: "13", description: "Divorce — grounds available to both parties" },
                { number: "13A", description: "Alternate relief — judicial separation instead of divorce" },
                { number: "13B", description: "Divorce by mutual consent — after 1 year separation, 6-month cooling" },
            ],
            relevance: 100,
        },
        {
            name: "Special Marriage Act, 1954",
            sections: [
                { number: "27", description: "Divorce — grounds for divorce" },
                { number: "28", description: "Divorce by mutual consent" },
            ],
            relevance: 80,
        },
        {
            name: "Muslim Personal Law (Shariat) Application Act, 1937",
            sections: [
                { number: "2", description: "Dissolution of Muslim marriage — Talaq, Khula, Mubarat" },
            ],
            relevance: 60,
        },
    ],
    "property dispute": [
        {
            name: "Transfer of Property Act, 1882",
            sections: [
                { number: "53A", description: "Part performance — doctrine of estoppel" },
                { number: "109", description: "Implied appointment of receiver" },
                { number: "123", description: "Transfer to unborn person — prior interest" },
            ],
            relevance: 100,
        },
        {
            name: "Code of Civil Procedure, 1908 (CPC)",
            sections: [
                { number: "Order 7", description: "Suit by partition — procedure for partition suits" },
                { number: "Order 21", description: "Execution of decrees — delivery of property" },
            ],
            relevance: 90,
        },
    ],
    "consumer complaint": [
        {
            name: "Consumer Protection Act, 2019",
            sections: [
                { number: "6", description: "Definition of consumer — who can file complaint" },
                { number: "18", description: "Product liability — defect in product" },
                { number: "35", description: "Jurisdiction of District Commission" },
                { number: "47", description: "Limitation — complaint within 2 years" },
            ],
            relevance: 100,
        },
    ],
    "criminal": [
        {
            name: "Indian Penal Code, 1860 (IPC)",
            sections: [
                { number: "302", description: "Punishment for murder — death or imprisonment for life" },
                { number: "304", description: "Culpable homicide not amounting to murder" },
                { number: "376", description: "Punishment for rape — not less than 10 years" },
                { number: "420", description: "Cheating and dishonestly inducing delivery of property" },
                { number: "498A", description: "Cruelty by husband or relatives of husband" },
            ],
            relevance: 90,
        },
        {
            name: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
            sections: [
                { number: "103", description: "Punishment for murder (replaces IPC 302)" },
                { number: "316", description: "Punishment for rape (replaces IPC 376)" },
                { number: "318", description: "Snatching (new offence)" },
            ],
            relevance: 70,
        },
    ],
    "contract": [
        {
            name: "Indian Contract Act, 1872",
            sections: [
                { number: "10", description: "What agreements are contracts — competent parties, free consent, lawful consideration" },
                { number: "23", description: "What consideration and objects are lawful" },
                { number: "73", description: "Compensation for loss or damage caused by breach of contract" },
                { number: "75", description: "Damages recoverable for breach — no remote or speculative damages" },
            ],
            relevance: 100,
        },
    ],
    "injunction": [
        {
            name: "Specific Relief Act, 1963",
            sections: [
                { number: "36", description: "Preventive injunction — when granted" },
                { number: "37", description: "Mandatory injunction — when to compel performance" },
                { number: "38", description: "Perpetual injunction — when defendant may be restrained permanently" },
                { number: "39", description: "Mandatory injunction — when to compel act" },
            ],
            relevance: 100,
        },
        {
            name: "Code of Civil Procedure, 1908 (CPC)",
            sections: [
                { number: "Order 39", description: "Temporary injunction — injunction pending suit" },
            ],
            relevance: 90,
        },
    ],
    "arbitration": [
        {
            name: "Arbitration and Conciliation Act, 1996",
            sections: [
                { number: "8", description: "Power to refer parties to arbitration — when court refers dispute to arbitration" },
                { number: "9", description: "Interim measures by court — provisional relief before tribunal constitution" },
                { number: "11", description: "Grounds for setting aside arbitration award" },
                { number: "34", description: "Application for setting aside arbitral award" },
            ],
            relevance: 100,
        },
    ],
};
/**
 * Get relevant statutes for a legal query using the embedded index.
 * This is instant (no network calls) and covers the most common Indian legal queries.
 */
function getRelevantStatutes(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    // Direct keyword match
    for (const [keyword, statutes] of Object.entries(exports.STATUTE_INDEX)) {
        if (queryLower.includes(keyword)) {
            for (const statute of statutes) {
                results.push({
                    name: statute.name,
                    sections: statute.sections,
                    source: "embedded-index",
                    relevance: statute.relevance,
                });
            }
        }
    }
    // Fuzzy match on statute names
    const allStatutes = Object.values(exports.STATUTE_INDEX).flat();
    for (const statute of allStatutes) {
        const nameLower = statute.name.toLowerCase();
        if (nameLower.includes(queryLower) || queryLower.includes(nameLower.split(",")[0].split("(")[0].trim().split(" ").pop() || "")) {
            if (!results.some(r => r.name === statute.name)) {
                results.push({
                    name: statute.name,
                    sections: statute.sections,
                    source: "embedded-index",
                    relevance: statute.relevance - 20,
                });
            }
        }
    }
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}
// ============================================================
// 4. COMBINED LEGAL SEARCH
// ============================================================
/**
 * Search all free legal sources in parallel for a query.
 * Returns statute references and bare act data.
 */
async function searchAllFreeLegalSources(query) {
    // 1. Instant lookup from embedded statute index
    const embeddedStatutes = getRelevantStatutes(query);
    // 2. AdvocateKhoj bare acts search (network call)
    const advocateKhojPromise = searchBareActs(query);
    // 3. India Code search (network call)
    const indiaCodePromise = searchIndiaCode(query);
    // Run network calls in parallel
    const [advocateKhojResults, indiaCodeResults] = await Promise.allSettled([
        advocateKhojPromise,
        indiaCodePromise,
    ]);
    const bareActs = advocateKhojResults.status === "fulfilled"
        ? advocateKhojResults.value.map((r) => ({ ...r, source: "advocatekhoj" }))
        : [];
    const indiaCode = indiaCodeResults.status === "fulfilled"
        ? indiaCodeResults.value
        : [];
    return {
        statutes: embeddedStatutes.map(s => ({
            name: s.name,
            sections: s.sections,
            source: s.source,
        })),
        bareActs,
        indiaCodeResults: indiaCode,
    };
}
/**
 * Get the text of a specific bare act section (tries AdvocateKhoj first)
 */
async function getSectionText(slug, sectionNumber) {
    return getBareActSection(slug, sectionNumber);
}
// ============================================================
// Health Checks
// ============================================================
async function advocateKhojHealthCheck() {
    try {
        const response = await fetch(`${ADVOCATEKHOJ_BASE}/`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function indiaCodeHealthCheck() {
    try {
        const response = await fetch(`${INDIA_CODE_BASE}/`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
async function embeddedStatutesHealthCheck() {
    // Always available — it's in-memory
    return Object.keys(exports.STATUTE_INDEX).length > 0;
}
