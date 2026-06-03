'use client'

import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
  /** Default text size: 'xs' | 'sm' | 'base' */
  size?: 'xs' | 'sm' | 'base'
}

/**
 * Renders markdown content as properly formatted HTML elements.
 * Used across the app to display AI-generated text that contains
 * markdown formatting (headings, bold, lists, etc.)
 */
export default function MarkdownContent({ content, className, size = 'sm' }: MarkdownContentProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
  }

  return (
    <div className={cn('markdown-content', sizeClasses[size], className)}>
      <Markdown
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mt-5 mb-2.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-foreground mt-2 mb-1">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-semibold text-foreground mt-2 mb-1">{children}</h6>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="text-inherit leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          // Unordered lists
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>
          ),
          // Ordered lists
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>
          ),
          // List items
          li: ({ children }) => (
            <li className="text-inherit leading-relaxed">{children}</li>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-primary/30 pl-3 my-2 italic text-foreground/80">
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-border" />
          ),
          // Inline code
          code: ({ className: codeClass, children }) => {
            const isBlock = codeClass?.includes('language-')
            if (isBlock) {
              return (
                <pre className="bg-secondary rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono">
                  <code>{children}</code>
                </pre>
              )
            }
            return (
              <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            )
          },
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-inherit border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-secondary px-2 py-1 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">{children}</td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}
