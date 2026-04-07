import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const StreamingText = ({ text }) => {
    return (
        <div className="streaming-text">
            <MarkdownRenderer content={text} />
        </div>
    );
};

export default StreamingText;