"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CodeBlock({
  language,
  code,
  filename,
}: {
  language: string;
  code: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isHtml = language === "html" || language === "htm";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const ext =
      language === "python" || language === "py"
        ? "py"
        : language === "javascript" || language === "js"
          ? "js"
          : language === "typescript" || language === "ts"
            ? "ts"
            : language === "html" || language === "htm"
              ? "html"
              : language === "css"
                ? "css"
                : language === "json"
                  ? "json"
                  : "txt";
    const name = filename || `kilo.${ext}`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="lang">{filename || language || "code"}</span>
        <div className="code-actions">
          {isHtml && (
            <button type="button" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Preview"}
            </button>
          )}
          <button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={download}>
            Download
          </button>
        </div>
      </div>
      {showPreview && isHtml ? (
        <iframe
          className="preview-frame"
          title="HTML preview"
          sandbox="allow-scripts"
          srcDoc={code}
        />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

export default function Markdown({ content }: { content: string }) {
  const components = useMemo(
    () => ({
      code({
        className,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { className?: string }) {
        const match = /language-([\w+-]+)(?::([^\s]+))?/.exec(className || "");
        const isBlock = Boolean(match) || (className || "").includes("language-");
        const code = String(children).replace(/\n$/, "");

        if (isBlock && match) {
          return (
            <CodeBlock language={match[1]} filename={match[2]} code={code} />
          );
        }

        // Inline code or fenced without language
        if (String(children).includes("\n") || (className || "").startsWith("language-")) {
          const lang = match?.[1] || "text";
          return <CodeBlock language={lang} code={code} />;
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      pre({ children }: { children?: React.ReactNode }) {
        // Let the code component handle the block; avoid double wrapper
        return <>{children}</>;
      },
    }),
    []
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
