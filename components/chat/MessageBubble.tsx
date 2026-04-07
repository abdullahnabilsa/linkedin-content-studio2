import React from 'react';
import { AIMessage } from '@/lib/ai-providers/types';
import MarkdownRenderer from './MarkdownRenderer';

const MessageBubble = ({ message, isStreaming, isLastMessage }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
            {isUser ? (
                <div className="user-message">{message.content}</div>
            ) : (
                <div className="ai-message">
                    <MarkdownRenderer content={message.content} />
                </div>
            )}
        </div>
    );
};

export default MessageBubble;