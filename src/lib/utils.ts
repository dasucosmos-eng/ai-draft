import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Strips all markdown formatting from text so it renders as clean plain text.
 * Handles: **bold**, *italic*, # headings, - bullets, > blockquotes, `code`,
 * [links](url), numbered lists, horizontal rules, and trailing whitespace.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text;
  return text
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
    // Inline code
    .replace(/`([^`]+)`/g, "$1")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // Italic
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Headings — convert "## Title" to "TITLE" (uppercase for emphasis)
    .replace(/^#{1,6}\s+(.+)$/gm, (_, t) => t.toUpperCase())
    // Strikethrough
    .replace(/~~(.+?)~~/g, "$1")
    // Links — keep text, drop URL
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Images — keep alt text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Blockquotes
    .replace(/^>\s?/gm, "")
    // Bullet list markers
    .replace(/^\s*[-*+]\s+/gm, "")
    // Numbered list markers
    .replace(/^\s*\d+\.\s+/gm, "")
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Trim trailing whitespace per line
    .split("\n").map((l) => l.trimEnd()).join("\n")
    .trim();
}
