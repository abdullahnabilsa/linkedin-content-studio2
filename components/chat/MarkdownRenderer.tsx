import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

const MarkdownRenderer = ({ content }) => {
    return (
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownRenderer;