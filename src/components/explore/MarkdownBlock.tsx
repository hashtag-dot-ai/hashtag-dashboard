import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

/**
 * Renders chunk text as markdown. remark-breaks turns single newlines into
 * line breaks (chunk text is often plain-ish text where "\n" means a new
 * line, not a joined paragraph); remark-gfm adds table support since
 * markdown tables are ingested as dedicated table chunks.
 */
export default function MarkdownBlock({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('text-sm text-gray-700 leading-relaxed break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: (props) => <h1 className="text-base font-bold mt-3 mb-1.5" {...props} />,
          h2: (props) => <h2 className="text-sm font-bold mt-3 mb-1.5" {...props} />,
          h3: (props) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
          h4: (props) => <h4 className="text-sm font-semibold mt-2 mb-1" {...props} />,
          p: (props) => <p className="mb-2 last:mb-0" {...props} />,
          ul: (props) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
          ol: (props) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
          a: (props) => <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" {...props} />,
          code: (props) => <code className="bg-gray-100 rounded px-1 font-mono text-[0.85em]" {...props} />,
          pre: (props) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-2 overflow-x-auto text-xs mb-2 [&_code]:bg-transparent [&_code]:p-0" {...props} />,
          blockquote: (props) => <blockquote className="border-l-2 border-gray-200 pl-3 text-gray-500 italic mb-2" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto mb-2">
              <table className="text-xs border-collapse" {...props} />
            </div>
          ),
          th: (props) => <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold" {...props} />,
          td: (props) => <td className="border border-gray-200 px-2 py-1 align-top" {...props} />,
          hr: () => <hr className="border-gray-200 my-3" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
