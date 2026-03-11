import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Terminal } from 'lucide-react'
import { useState, useCallback, useMemo, memo } from 'react'

interface Props {
  content: string
  className?: string
}

/* ── Preprocessing ────────────────────────────────────────── */

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07/g
const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏●○◐◑◒◓◔◕]/g
const SEPARATOR_RE = /^[\s━─╌—_\-~]{5,}$/
const MULTI_BLANK_RE = /\n{3,}/g

function preprocessContent(raw: string): string {
  let text = raw.replace(ANSI_RE, '').replace(SPINNER_RE, '')
  const lines = text.split('\n')
  const cleaned = lines.filter(l => !SEPARATOR_RE.test(l.trim()))
  text = cleaned.join('\n').replace(MULTI_BLANK_RE, '\n\n')
  return text.trim()
}

/* ── Content detection ────────────────────────────────────── */

function looksLikeMarkdown(text: string): boolean {
  const markers = [
    /^#{1,6}\s/m,
    /\*\*[^*]+\*\*/,
    /```[\s\S]*?```/,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /\[.+?\]\(.+?\)/,
    /^\s*>\s/m,
    /\|.+\|.+\|/,
  ]
  let count = 0
  for (const re of markers) if (re.test(text)) count++
  return count >= 2
}

/* ── Syntax-highlighted code block ────────────────────────── */

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
        <button onClick={handleCopy} className="text-gray-500 hover:text-gray-300 transition-colors p-1" title="Copy code">
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', padding: '1rem' }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

/* ── Terminal-style output ────────────────────────────────── */

function getLineStyle(line: string): { className: string; prefix: string } {
  const t = line.trim()
  if (!t) return { className: '', prefix: '' }

  // Tool calls: read_powershell ↳ 1 line...
  if (/^[a-z][a-z_]*\s+↳/i.test(t) || /^↳\s*\d+/i.test(t))
    return { className: 'text-amber-400/80', prefix: '⚡ ' }

  // Shell commands: $ Get-ChildItem ...
  if (/^\$\s+/.test(t) || /^>\s+/.test(t))
    return { className: 'text-emerald-400', prefix: '' }

  // Embedded PowerShell/bash commands
  if (/\$\s+(?:Get-|Set-|New-|Remove-|Invoke-|Select-|Where-|ForEach-)/i.test(t))
    return { className: 'text-emerald-400/90', prefix: '› ' }

  // stderr
  if (/^\[stderr\]/i.test(t))
    return { className: 'text-red-400/70 text-[11px]', prefix: '✗ ' }

  // Error lines
  if (/^(?:error|fail|fatal|✗|×)/i.test(t))
    return { className: 'text-red-400/80', prefix: '' }

  // Success
  if (/^(?:✓|✔|success|done|completed?|total)/i.test(t))
    return { className: 'text-emerald-300 font-medium', prefix: '' }

  // Paths (Windows / Unix)
  if (/^[A-Z]:\\/.test(t) || /^\/(?:home|usr|var|tmp|etc)\//.test(t))
    return { className: 'text-sky-400/70', prefix: '' }

  return { className: 'text-gray-300', prefix: '' }
}

function TerminalBlock({ content, className }: { content: string; className: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const lines = content.split('\n')

  return (
    <div className={`group rounded-xl overflow-hidden border border-white/[0.06] bg-[#0c0c14] ${className}`}>
      {/* macOS-style terminal header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.025] border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#febc2e]" />
            <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <Terminal size={11} className="text-gray-500" />
            <span className="text-[10px] text-gray-500 font-mono tracking-wide">output</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded-md text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
          title="Copy output"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      </div>

      {/* Terminal body */}
      <div className="px-3 sm:px-4 py-3 font-mono text-xs sm:text-[13px] leading-[1.75] overflow-x-auto scrollbar-hide">
        {lines.map((line, i) => {
          if (!line.trim()) return <div key={i} className="h-2" />
          const { className: cls, prefix } = getLineStyle(line)
          return (
            <div key={i} className={`break-words ${cls}`}>
              {prefix && <span className="select-none opacity-70 text-[10px]">{prefix}</span>}
              {line}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */

export default memo(function MarkdownMessage({ content, className = '' }: Props) {
  const processed = useMemo(() => preprocessContent(content), [content])

  /* Markdown content — render with ReactMarkdown */
  if (looksLikeMarkdown(processed)) {
    return (
      <div className={`markdown-body text-xs sm:text-sm text-gray-300 leading-relaxed space-y-1 ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className: codeClass, children, ...props }) {
              const match = /language-(\w+)/.exec(codeClass || '')
              const codeStr = String(children).replace(/\n$/, '')
              if (!match && !codeStr.includes('\n')) {
                return <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-synapse-300 text-xs font-mono" {...props}>{children}</code>
              }
              return <CodeBlock language={match?.[1] || ''}>{codeStr}</CodeBlock>
            },
            p({ children }) { return <p className="mb-2 last:mb-0">{children}</p> },
            h1({ children }) { return <h1 className="text-base font-bold mb-2 text-white">{children}</h1> },
            h2({ children }) { return <h2 className="text-sm font-bold mb-2 text-white">{children}</h2> },
            h3({ children }) { return <h3 className="text-sm font-semibold mb-1.5 text-white">{children}</h3> },
            ul({ children }) { return <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul> },
            ol({ children }) { return <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol> },
            li({ children }) { return <li className="text-gray-300">{children}</li> },
            blockquote({ children }) { return <blockquote className="border-l-2 border-synapse-500/30 pl-3 my-2 text-gray-400 italic">{children}</blockquote> },
            a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-synapse-400 hover:text-synapse-300 underline underline-offset-2">{children}</a> },
            table({ children }) { return <div className="overflow-x-auto my-2"><table className="min-w-full text-xs">{children}</table></div> },
            th({ children }) { return <th className="px-2 py-1 text-left border-b border-white/[0.08] text-gray-400 font-medium">{children}</th> },
            td({ children }) { return <td className="px-2 py-1 border-b border-white/[0.04]">{children}</td> },
            hr() { return <hr className="border-white/[0.08] my-3" /> },
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>
    )
  }

  /* Multi-line or substantial content — terminal-style block */
  if (processed.includes('\n') || processed.length > 120) {
    return <TerminalBlock content={processed} className={className} />
  }

  /* Short plain text */
  return (
    <pre className={`whitespace-pre-wrap font-mono text-xs sm:text-sm break-words text-gray-300 leading-relaxed ${className}`}>
      {processed}
    </pre>
  )
})