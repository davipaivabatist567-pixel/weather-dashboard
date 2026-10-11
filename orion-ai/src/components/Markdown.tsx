// Renderização segura de Markdown (sem HTML bruto) com blocos de código copiáveis.
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({ lang, children }: { lang?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = String(Array.isArray(children) ? children.join("") : children ?? "").replace(/\n$/, "");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <pre>
      {lang && <span className="code-lang">{lang}</span>}
      <button className="btn small copy-btn" onClick={copy} type="button">{copied ? "Copiado" : "Copiar"}</button>
      <code>{text}</code>
    </pre>
  );
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const isBlock = !!lang || String(children ?? "").includes("\n");
            return isBlock ? <CodeBlock lang={lang}>{children}</CodeBlock> : <code>{children}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
