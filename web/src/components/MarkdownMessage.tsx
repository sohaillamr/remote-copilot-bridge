import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'

interface Props {
  content: string
  className?: string
}

// ── Content pre-processing ─────────────────────────────────
// Even after agent-side cleaning, some noise can slip through
// (e.g. from streamed lines that bypass the final cleaner).

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07/g
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●○◐◑◒◓◔◕]/g
const SEPARATOR_RE = /^[\s─━═—_\-~]{5,}$/
const MULTI_BLANK_RE = /\n{3,}/g

function preprocessContent(raw: string): string {
  let text = raw
    .replace(ANSI_RE, '')        // strip any leftover ANSI
    .replace(SPINNER_RE, '')     // strip spinner chars

  // Remove pure separator lines
  const lines = text.split('\n')
  const cleaned = lines.filter(l => !SEPARATOR_RE.test(l.trim()))
  text = cleaned.join('\n')

  // Collapse 3+ blank lines → 1
  text = text.replace(MULTI_BLANK_RE, '\n\n')

  return text.trim()
}

// ── Detect if content is markdown ──────────────────────────

function looksLikeMarkdown(text: string): boolean {
  // Quick patterns that indicate the text contains markdown formatting
  const markers = [
    /^#{1,6}\s/m,                 // headings
    /\*\*[^*]+\*\*/,              // bold
    /```[\s\S]*?```/,             // fenced code blocks
    /^\s*[-*+]\s/m,               // unordered lists
    /^\s*\d+\.\s/m,               // ordered lists
    /\[.+?\]\(.+?\)/,             // links
    /^\s*>\s/m,                   // blockquotes
    /\|.+\|.+\|/,                // tables
  ]
  return markers.some(re => re.test(text))
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] rounded-t-lg border-b border-white/[0.06]">
        <span className="text-[10px] text-gray-500 font-mono">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          title="Copy code"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          background: 'rgba(255,255,255,0.02)',
          fontSize: '0.75rem',
          padding: '1rem',
        }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MarkdownMessage({ content, className = '' }: Props) {
  const processed = useMemo(() => preprocessContent(content), [content])

  if (!looksLikeMarkdown(processed)) {
    return (
      <pre className={`whitespace-pre-wrap font-mono text-xs sm:text-sm break-words text-gray-300 leading-relaxed ${className}`}>
        {processed}
      </pre>
    )
  }

  return (
    <div className={`markdown-body text-xs sm:text-sm text-gray-300 leading-relaxed space-y-1 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClass, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClass || '')
            const codeStr = String(children).replace(/\n$/, '')

            // Inline code
            if (!match && !codeStr.includes('\n')) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-synapse-300 text-xs font-mono" {...props}>
                  {children}
                </code>
              )
            }

            // Block code
            return <CodeBlock language={match?.[1] || ''}>{codeStr}</CodeBlock>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          h1({ children }) {
            return <h1 className="text-base font-bold mb-2 text-white">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-sm font-bold mb-2 text-white">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-sm font-semibold mb-1.5 text-white">{children}</h3>
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
          },
          li({ children }) {
            return <li className="text-gray-300">{children}</li>
          },
          blockquote({ children }) {
            return <blockquote className="border-l-2 border-synapse-500/30 pl-3 my-2 text-gray-400 italic">{children}</blockquote>
          },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-synapse-400 hover:text-synapse-300 underline underline-offset-2">{children}</a>
          },
          table({ children }) {
            return <div className="overflow-x-auto my-2"><table className="min-w-full text-xs">{children}</table></div>
          },
          th({ children }) {
            return <th className="px-2 py-1 text-left border-b border-white/[0.08] text-gray-400 font-medium">{children}</th>
          },
          td({ children }) {
            return <td className="px-2 py-1 border-b border-white/[0.04]">{children}</td>
          },
          hr() {
            return <hr className="border-white/[0.08] my-3" />
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
