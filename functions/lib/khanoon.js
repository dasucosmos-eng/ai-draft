"use strict";
// Indian Kanoon - Indian legal database search
// REST API: POST https://api.indiankanoon.org/search/
// Auth: Token header
// Body: form-urlencoded with formInput field
// API key via INDIAN_KHANOON_API_KEY
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCaseLaw = searchCaseLaw;
exports.getCaseDetail = getCaseDetail;
exports.searchStatute = searchStatute;
exports.khanoonHealthCheck = khanoonHealthCheck;
const KHANOON_API_URL = "https://api.indiankanoon.org";
function getApiKey() {
    const apiKey = process.env.INDIAN_KHANOON_API_KEY;
    if (!apiKey) {
        throw new Error("INDIAN_KHANOON_API_KEY environment variable is not set");
    }
    return apiKey;
}
/**
 * Search Indian case law by query with optional filters
 * @param query Search query string
 * @param filters Optional filters (court, year, caseType, page, limit)
 * @returns Array of case results matching the research format
 */
async function searchCaseLaw(query, filters) {
    const apiKey = getApiKey();
    try {
        const params = new URLSearchParams();
        params.set("maxcount", String(filters?.limit || 10));
        if (filters?.page && filters.page > 1) {
            params.set("pagenum", String(filters.page));
        }
        // Build query with filter parameters
        let filterQuery = query;
        if (filters?.court && filters.court !== "all") {
            filterQuery += ` tag:${filters.court.toLowerCase().replace(/\s+/g, "-")}`;
        }
        if (filters?.year && filters.year !== "all") {
            filterQuery += ` dct:${filters.year}`;
        }
        if (filters?.caseType && filters.caseType !== "all") {
            filterQuery += ` tag:${filters.caseType.toLowerCase().replace(/\s+/g, "-")}`;
        }
        params.set("formInput", filterQuery);
        const response = await fetch(`${KHANOON_API_URL}/search/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Authorization": `Token ${apiKey}`,
            },
            body: params.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Indian Kanoon search error (${response.status}): ${errorText}`);
            return [];
        }
        const data = (await response.json());
        return parseSearchResults(data);
    }
    catch (error) {
        console.error("Indian Kanoon searchCaseLaw error:", error);
        // Return empty array on failure — router can fall back to Gemini
        return [];
    }
}
/**
 * Get full details of a specific case by fetching the public Indian Kanoon page
 * @param caseId The unique tid for the case (also the docid in the URL)
 * @returns Full case detail or null if not found
 */
async function getCaseDetail(caseId) {
    try {
        const pageUrl = `https://indiankanoon.org/doc/${caseId}/`;
        const response = await fetch(pageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AI-Draft-Legal/1.0)",
                "Accept": "text/html",
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            console.error(`Indian Kanoon getCaseDetail: HTTP ${response.status} for ${pageUrl}`);
            return null;
        }
        const html = await response.text();
        return parseKanoonPage(html, caseId);
    }
    catch (error) {
        console.error("Indian Kanoon getCaseDetail error:", error);
        return null;
    }
}
/**
 * Search for relevant Indian statutes and legal sections
 * @param query Search query for statutes
 * @returns Array of matching statute results
 */
async function searchStatute(query) {
    const apiKey = getApiKey();
    try {
        const params = new URLSearchParams();
        params.set("formInput", query + " tag:statute tag:act");
        params.set("maxcount", "10");
        const response = await fetch(`${KHANOON_API_URL}/search/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Authorization": `Token ${apiKey}`,
            },
            body: params.toString(),
        });
        if (!response.ok)
            return [];
        const data = (await response.json());
        return parseStatuteResults(data);
    }
    catch (error) {
        console.error("Indian Kanoon searchStatute error:", error);
        return [];
    }
}
// --- Internal parsers ---
function parseSearchResults(data) {
    const docs = (data?.docs || []);
    return docs.map((item, index) => {
        // Extract court name from author or bench data
        const author = String(item.author || item.authorEncoded || "");
        const headline = String(item.headline || item.title || "");
        // Try to extract a clean title from headline by stripping HTML
        const cleanTitle = headline.replace(/<[^>]+>/g, "").trim();
        const title = cleanTitle || String(item.title || `Case ${item.tid || index}`);
        // Extract date as year
        const publishDate = String(item.publishdate || "");
        const year = publishDate.substring(0, 4) || "";
        // Extract a proper summary from the snippet field if available, otherwise from headline
        const snippet = String(item.snippet || "").replace(/<[^>]+>/g, "").trim();
        const summary = snippet.length > 30
            ? snippet.substring(0, 400)
            : cleanTitle.length > 20
                ? cleanTitle.substring(0, 400)
                : `Case ${item.tid || index}: ${headline.substring(0, 200)}`;
        // Extract citation from headline: look for patterns like (YEAR), Vol Reporter
        const citation = extractCitation(cleanTitle, year);
        return {
            id: String(item.tid || index),
            title,
            court: author || "Indian Court",
            year,
            summary,
            citation,
            relevance: Number(item.numcitedby || 100 - index * 10),
        };
    });
}
/**
 * Extract citation from the case title/headline.
 * Indian Kanoon headlines often contain citation-like info such as:
 *   "Party1 Vs Party2 on [date], decided by [court]" or
 * *   "Party1 Vs Party2, (Year) Vol Reporter Page"
 */
function extractCitation(text, year) {
    // Try standard Indian citation patterns: Party v. Party, Court (Year) Vol Reporter Page
    const citationPattern = /(\d{4})\s+(\d+\s+(?:SCC?|AIR|SCR|SLR|SCALE|SCC\s*OnLine|ILR\s*\w+|LL\s*\w+|BOMCR|CALCR|DELCR|MADRASCR|MANU\/[\w/]+))([,)].*?)?/i;
    const match = text.match(citationPattern);
    if (match) {
        return `${match[1]} ${match[2]}${match[3] || ""}`;
    }
    // Fallback: try to construct a minimal citation from parties + year
    const partiesMatch = text.match(/^(.+?)\s+(?:[Vv][sS]?\.?|[Vv]\.?)\s+(.+?)(?:\s+on\s|,|$)/);
    if (partiesMatch && year) {
        const p1 = partiesMatch[1].trim().substring(0, 60);
        const p2 = partiesMatch[2].trim().substring(0, 60);
        return `${p1} v. ${p2} (${year})`;
    }
    return "";
}
/**
 * Parse the Indian Kanoon public case page to extract full judgment content.
 */
function parseKanoonPage(html, caseId) {
    // Remove script/style tags for text extraction
    const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    // Extract title from <title> tag
    const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
        : "";
    // Extract court from the breadcrumb or metadata
    const courtMatch = cleanHtml.match(/(?:author|court)["']?\s*[:=]\s*["']?([^"',<]{3,80})/i)
        || cleanHtml.match(/class=["']?doccourt_name["']?[^>]*>([^<]+)/i);
    const court = courtMatch ? courtMatch[1].trim() : "";
    // Extract date
    const dateMatch = cleanHtml.match(/class=["']?docd_doc_date["']?[^>]*>([^<]+)/i)
        || cleanHtml.match(/(?:publishdate|decision.?date)["']?\s*[:=]\s*["']?([\d\-/.]+\s*\d{4})/i)
        || cleanHtml.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
    const date = dateMatch ? dateMatch[1].trim() : "";
    const yearMatch = date.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : caseId.substring(0, 4) || "";
    // Extract parties from heading (usually first bold text before "Vs.")
    const partiesMatch = cleanHtml.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i);
    const parties = partiesMatch
        ? partiesMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 300)
        : title.substring(0, 300);
    // Extract bench/judges — look for patterns like "Bench: ..." or judge names
    const benchMatch = cleanHtml.match(/(?:Bench[:\s]*|Judges?[:\s]*)([^<]{5,200})/i)
        || cleanHtml.match(/class=["']?docauthor["']?[^>]*>([^<]+)/i);
    const bench = benchMatch ? benchMatch[1].trim() : "";
    // Extract the judgment text — look for main content area
    // Indian Kanoon puts judgment in a div with class like "judgment" or "doccontent"
    const judgmentSection = cleanHtml.match(/class=["']?(?:judgment|doccontent|document|content)["'][^>]*>([\s\S]*?)<\/div/i)
        || cleanHtml.match(/id=["']?(?:judgment|doccontent|doc_content)["'][^>]*>([\s\S]*?)<\/div/i)
        || cleanHtml.match(/<div[^>]*(?:class|id)=["']?main["'][^>]*>([\s\S]*?)<\/div/i);
    let judgmentText = "";
    let headnote = "";
    if (judgmentSection) {
        // Clean HTML from judgment section
        judgmentText = judgmentSection[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 15000);
    }
    else {
        // Fallback: extract all paragraph text
        const paragraphs = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
        const pTexts = paragraphs.map(p => p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
            .filter(t => t.length > 50);
        judgmentText = pTexts.join("\n").substring(0, 15000);
    }
    // Headnote is typically the first meaningful paragraph(s) before the judgment body
    if (judgmentText.length > 500) {
        headnote = judgmentText.substring(0, 600).trim();
    }
    // Extract citation references from the page
    const citationRefs = [];
    const citedByMatch = cleanHtml.match(/numcitedby[^>]*>(\d+)/i);
    if (citedByMatch) {
        citationRefs.push(`Cited by ${citedByMatch[1]} cases`);
    }
    // Look for citation patterns in text
    const citationPatterns = judgmentText.match(/\d{4}\s+\d+\s+(?:SCC?|AIR|SCR|SLR|SCALE)[^)\s]{0,30}/g);
    if (citationPatterns) {
        const unique = [...new Set(citationPatterns)].slice(0, 10);
        citationRefs.push(...unique);
    }
    // Validate that we got meaningful content
    if (!title && !judgmentText) {
        return null;
    }
    return {
        id: caseId,
        title,
        court: court || "Indian Court",
        date,
        year,
        judgmentText,
        headnote,
        citations: citationRefs,
        parties,
        bench,
    };
}
function parseStatuteResults(data) {
    const docs = (data?.docs || []);
    return docs.map((item) => {
        const headline = String(item.headline || item.title || "").replace(/<[^>]+>/g, "").trim();
        return {
            section: String(item.tid || ""),
            act: headline.substring(0, 100),
            description: headline,
            text: headline,
        };
    });
}
// Health check for Indian Kanoon provider
async function khanoonHealthCheck() {
    try {
        const apiKey = process.env.INDIAN_KHANOON_API_KEY;
        if (!apiKey)
            return false;
        const params = new URLSearchParams();
        params.set("formInput", "bail");
        params.set("maxcount", "1");
        const response = await fetch(`${KHANOON_API_URL}/search/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "Authorization": `Token ${apiKey}`,
            },
            body: params.toString(),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
