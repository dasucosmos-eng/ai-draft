'use client';

import ReactMarkdown from 'react-markdown';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-sm leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-1 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-1 text-sm">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-4 py-1 my-2 text-muted-foreground italic">{children}</blockquote>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline
              ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
              : <code className="block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</code>;
          },
          pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">{children}</pre>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-border/50 my-4" />,
          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-sm border-collapse border border-border/50">{children}</table></div>,
          th: ({ children }) => <th className="border border-border/50 bg-muted px-3 py-1.5 text-left font-medium text-xs">{children}</th>,
          td: ({ children }) => <td className="border border-border/50 px-3 py-1.5 text-xs">{children}</td>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
