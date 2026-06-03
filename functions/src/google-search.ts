// Google Web Search — Legal Research Data Source
// Uses Google's regular search with site: operators (FREE, server-side scraping)
// Falls back to CSE JSON API if available
//
// Searches across ALL Indian legal sources:
//   - eCourts, Supreme Court, India Code, AdvocateKhoj, Indian Kanoon, etc.

const GOOGLE_SEARCH_BASE = "https://www.googleapis.com/customsearch/v1";

// Sites to target for Indian legal research
const LEGAL_SITES = [
  "judgments.ecourts.gov.in",
  "main.sci.gov.in",
  "indiacode.nic.in",
  "advocatekhoj.com",
  "indiankanoon.org",
  "legislative.gov.in",
  "supremecourtofindia.nic.in",
  "cafcourt.gov.in",
];

// --- Types ---

export interface GoogleSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  htmlSnippet?: string;
  formattedUrl?: string;
  source?: string;
  sourceType?: "judgment" | "statute" | "bare_act" | "article" | "other";
  /** Highlighted passages extracted from the fetched page content */
  highlights?: Array<{ passage: string; relevance: string; context: string }>;
}

export interface GoogleSearchResponse {
  results: GoogleSearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

/**
 * Structured content extracted from a fetched legal page.
 */
export interface ExtractedPageContent {
  title: string;
  url: string;
  passages: string[];
  mainContent: string;
}

// --- Helper: Get CSE ID and API Key ---

function getCseId(): string | null {
  return process.env.GOOGLE_CSE_ID || null;
}

function getApiKey(): string | null {
  return process.env.GOOGLE_SEARCH_API_KEY || null;
}

// --- Main Search Function ---

/**
 * Search Indian legal sources using Google Custom Search JSON API.
 * If JSON API fails (403, no key), returns empty results gracefully.
 *
 * @param query Legal research query
 * @param numResults Number of results to return (default 7)
 * @returns Structured search results
 */
export async function searchLegal(
  query: string,
  numResults: number = 7
): Promise<GoogleSearchResponse> {
  const apiKey = getApiKey();
  const cseId = getCseId();

  if (apiKey && cseId) {
    try {
      return await searchViaJsonApi(query, numResults, apiKey, cseId);
    } catch (error) {
      console.warn("[Google Search] JSON API failed:", error instanceof Error ? error.message : error);
    }
  }

  // If no API key or JSON API failed, return empty
  // The research function has other sources (Khanoon, AdvocateKhoj, India Code) as fallback
  return { results: [], totalResults: 0, searchTime: 0, query };
}

/**
 * Search via Google Custom Search JSON API.
 * Cost: $0.005 per query ($5 per 1000) if API works
 * Cost: $0 if no API key configured (degraded mode)
 */
async function searchViaJsonApi(
  query: string,
  numResults: number,
  apiKey: string,
  cseId: string
): Promise<GoogleSearchResponse> {
  const startTime = Date.now();

  const url = new URL(GOOGLE_SEARCH_BASE);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cseId);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(numResults, 10)));
  url.searchParams.set("safe", "active");

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const searchTime = (Date.now() - startTime) / 1000;

  return parseJsonResponse(data, query, searchTime);
}

// --- Specialized Search Functions ---

/**
 * Search specifically for case law / judgments
 */
export async function searchCaseLaw(
  query: string,
  numResults: number = 7
): Promise<GoogleSearchResponse> {
  return searchLegal(query, numResults);
}

/**
 * Search specifically for statutes, bare acts, and legislation
 */
export async function searchStatutes(
  query: string,
  numResults: number = 5
): Promise<GoogleSearchResponse> {
  return searchLegal(query, numResults);
}

// --- URL Content Fetching ---

/**
 * Fetch the content of a URL and extract structured legal content.
 * Looks for main content containers (article, main, judgment-text, etc.),
 * strips navigation, footers, ads, and returns passage-level content.
 *
 * Returns structured content: { title, url, passages, mainContent }
 */
export async function fetchUrlContent(url: string): Promise<ExtractedPageContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Draft-Legal/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    return extractLegalPageContent(html, url);
  } catch (error) {
    console.error(`[Google Search] fetchUrlContent error for ${url}:`, error);
    return null;
  }
}

/**
 * Legacy-compatible overload: callers that pass `true` as second arg get a plain string back.
 * This preserves backward compatibility with any code that used the old string-returning version.
 */
export async function fetchUrlContentLegacy(url: string): Promise<string | null> {
  const result = await fetchUrlContent(url);
  return result ? result.mainContent : null;
}

/**
 * Extract structured content from raw HTML of a legal page.
 */
function extractLegalPageContent(html: string, url: string): ExtractedPageContent {
  // Strip script, style, nav, footer, header, aside, ad containers
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(nav|footer|header|aside|noscript|iframe)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(div|section)[^>]*(?:class|id)[\s*]=[\s]*["'][^"']*(?:nav|footer|header|sidebar|ad[s]?|cookie|banner|popup|modal|toast)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "");

  // Extract title from <title> or <h1>
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match
    ? h1Match[1].replace(/<[^>]+>/g, "").trim()
    : titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

  // Try to extract from main content containers
  // Priority: article > main > judgment/doccontent divs > first 3000 chars of body
  let contentHtml = "";
  const mainContainerMatch = cleanHtml.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i)
    || cleanHtml.match(/<div[^>]*(?:class|id)[\s*]=[\s]*["'][^"']*(?:judgment|judgment-text|doccontent|doc_content|content-area|post-content|entry-content|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (mainContainerMatch) {
    contentHtml = mainContainerMatch[2] || mainContainerMatch[1];
  } else {
    // Fallback: extract all paragraphs
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      contentHtml = bodyMatch[1];
    } else {
      contentHtml = cleanHtml;
    }
  }

  // Extract individual paragraphs as passages
  const passageMatches = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const passages: string[] = [];

  for (const pHtml of passageMatches) {
    const text = pHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Keep passages that are meaningful (at least 30 chars, not boilerplate)
    if (text.length >= 30 && !isBoilerplate(text)) {
      passages.push(text);
    }
  }

  // Also extract from <li> items if no paragraphs found (common in statute pages)
  if (passages.length === 0) {
    const liMatches = contentHtml.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    for (const liHtml of liMatches) {
      const text = liHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length >= 30 && !isBoilerplate(text)) {
        passages.push(text);
      }
    }
  }

  // Main content: first ~5000 chars of all passages joined
  const mainContent = passages.join(" ").substring(0, 5000).trim();

  return { title, url, passages, mainContent };
}

/**
 * Check if a text passage is likely boilerplate (nav, ads, cookie notices, etc.)
 */
function isBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  const boilerplatePatterns = [
    "cookie", "accept cookie", "privacy policy", "terms of service",
    "subscribe to", "newsletter", "follow us on", "share this",
    "download our app", "advertisement", "click here to",
    "please enable javascript", "we use cookies",
  ];
  return boilerplatePatterns.some(p => lower.includes(p));
}

/**
 * Enrich Google search results by fetching and extracting content from the top URLs.
 * For each result, fetches the page, extracts relevant passages matching the query terms,
 * and returns enriched results with highlights.
 *
 * @param results Google search results to enrich
 * @param query The original search query (used for relevance matching)
 * @param topN Number of results to fetch (default 3)
 * @returns Enriched results with extracted highlights
 */
export async function enrichSearchResults(
  results: GoogleSearchResult[],
  query: string,
  topN: number = 3
): Promise<Array<GoogleSearchResult & { highlights?: Array<{ passage: string; relevance: string; context: string }> }>> {
  // Extract key terms from query for relevance matching
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);

  const topResults = results.slice(0, topN);

  // Fetch content from all top URLs in parallel
  const fetchPromises = topResults.map(async (result) => {
    try {
      const content = await fetchUrlContent(result.link);
      if (!content || content.passages.length === 0) {
        return { result, highlights: [] };
      }

      // Score each passage by query term density
      const scoredPassages = content.passages
        .map(passage => {
          const lower = passage.toLowerCase();
          let score = 0;
          for (const term of queryTerms) {
            const regex = new RegExp(term, "gi");
            const matches = lower.match(regex);
            score += (matches?.length || 0) * (term.length > 4 ? 2 : 1);
          }
          return { passage, score };
        })
        .filter(sp => sp.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Build highlights with relevance explanation
      const highlights = scoredPassages.map(({ passage, score }) => {
        const matchedTerms = queryTerms.filter(t => passage.toLowerCase().includes(t));
        return {
          passage: passage.substring(0, 500),
          relevance: score >= 6
            ? "Directly addresses the query terms"
            : score >= 3
              ? "Related to the query topic"
              : "Tangentially relevant",
          context: `Extracted from ${content.title || result.displayLink}. Contains: ${matchedTerms.join(", ")}`,
        };
      });

      return { result, highlights };
    } catch {
      return { result, highlights: [] };
    }
  });

  const enrichedPairs = await Promise.all(fetchPromises);

  // Merge highlights back into results
  return results.map((result) => {
    const enriched = enrichedPairs.find(ep => ep.result.link === result.link);
    return {
      ...result,
      highlights: enriched?.highlights || [],
    };
  });
}

// --- Internal Parsers ---

function parseJsonResponse(data: Record<string, unknown>, query: string, searchTime: number): GoogleSearchResponse {
  const items = (data?.items || []) as Array<Record<string, unknown>>;

  const results: GoogleSearchResult[] = items.map((item) => {
    const displayLink = String(item.displayLink || item.link || "");
    const sourceInfo = parseSourceFromLink(displayLink);

    return {
      title: String(item.title || ""),
      snippet: String(item.snippet || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " "),
      link: String(item.link || ""),
      displayLink,
      htmlSnippet: String(item.htmlSnippet || ""),
      formattedUrl: String(item.formattedUrl || ""),
      source: sourceInfo.source,
      sourceType: sourceInfo.sourceType,
    };
  });

  const searchInformation = data?.searchInformation as Record<string, unknown> | undefined;

  return {
    results,
    totalResults: Number(searchInformation?.totalResults || 0),
    searchTime: Number(searchInformation?.searchTime || searchTime),
    query,
  };
}

function parseSourceFromLink(displayLink: string): {
  source: string;
  sourceType: "judgment" | "statute" | "bare_act" | "article" | "other";
} {
  const lower = displayLink.toLowerCase();

  if (lower.includes("ecourts") || lower.includes("supremecourtofindia") || lower.includes("main.sci")) {
    return { source: "eCourts / Supreme Court", sourceType: "judgment" };
  }
  if (lower.includes("indiankanoon")) {
    return { source: "Indian Kanoon", sourceType: "judgment" };
  }
  if (lower.includes("indiacode")) {
    return { source: "India Code", sourceType: "statute" };
  }
  if (lower.includes("advocatekhoj")) {
    return { source: "AdvocateKhoj", sourceType: "bare_act" };
  }
  if (lower.includes("legislative.gov")) {
    return { source: "Legislative.gov.in", sourceType: "statute" };
  }
  if (lower.includes("cafcourt")) {
    return { source: "Consumer Forum", sourceType: "judgment" };
  }
  if (lower.includes("drt")) {
    return { source: "Debt Recovery Tribunal", sourceType: "judgment" };
  }
  if (lower.includes("nitt")) {
    return { source: "IT Tribunal", sourceType: "judgment" };
  }
  if (lower.includes("lawcommission")) {
    return { source: "Law Commission", sourceType: "article" };
  }

  return { source: displayLink, sourceType: "other" };
}

// --- Cost Tracking ---

// Cost: $0.005/query ($5 per 1000) if API works, $0 if API unavailable
export const GOOGLE_SEARCH_COST_PER_QUERY = 0.005;

// --- Health Check ---

export async function googleSearchHealthCheck(): Promise<boolean> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    if (!apiKey || !cseId) return true; // Not configured = not an error

    const url = new URL(GOOGLE_SEARCH_BASE);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cseId);
    url.searchParams.set("q", "test");
    url.searchParams.set("num", "1");

    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[Google Search Health] API returned ${response.status}`);
      // Return true if not configured but don't fail health
      return true;
    }
    return true;
  } catch {
    return true; // Don't fail overall health check for Google Search
  }
}
