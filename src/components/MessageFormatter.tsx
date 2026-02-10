import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFormatterProps {
    content: string;
    role: 'user' | 'assistant';
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ content, role }) => {
    if (role === 'user') {
        // User messages - simple rendering
        return (
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {content}
            </div>
        );
    }

    // Assistant messages - full markdown rendering
    return (
        <div className="prose prose-sm max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom table styling
                    table: ({ node, ...props }) => (
                        <table className="min-w-full divide-y divide-slate-200 border border-slate-300 my-4" {...props} />
                    ),
                    thead: ({ node, ...props }) => (
                        <thead className="bg-slate-50" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-300" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="px-4 py-2 text-sm text-slate-900 border-b border-slate-200" {...props} />
                    ),
                    // Custom code block styling
                    code: ({ node, inline, ...props }: any) => {
                        if (inline) {
                            return (
                                <code className="px-1.5 py-0.5 bg-slate-100 text-blue-600 rounded text-xs font-mono" {...props} />
                            );
                        }
                        return (
                            <code className="block p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto" {...props} />
                        );
                    },
                    // Custom list styling
                    ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-1 my-2" {...props} />
                    ),
                    // Custom heading styling
                    h1: ({ node, ...props }) => (
                        <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                        <h2 className="text-lg font-bold text-slate-800 mt-3 mb-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                        <h3 className="text-base font-semibold text-slate-700 mt-2 mb-1" {...props} />
                    ),
                    // Custom blockquote styling
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-2 bg-blue-50 text-slate-700 italic" {...props} />
                    ),
                    // Custom link styling
                    a: ({ node, ...props }) => (
                        <a className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" {...props} />
                    ),
                    // Custom paragraph styling
                    p: ({ node, ...props }) => (
                        <p className="my-2 text-slate-700 leading-relaxed" {...props} />
                    ),
                    // Custom strong (bold) styling
                    strong: ({ node, ...props }) => (
                        <strong className="font-bold text-slate-900" {...props} />
                    ),
                    // Custom em (italic) styling
                    em: ({ node, ...props }) => (
                        <em className="italic text-slate-600" {...props} />
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
