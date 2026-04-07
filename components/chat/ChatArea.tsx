import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { useChat } from '@/hooks/useChat';

const ChatArea = () => {
    const { messages } = useChat();
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-grow overflow-y-auto">
            {messages.map((msg, index) => (
                <MessageBubble key={index} message={msg} />
            ))}
            <div ref={chatEndRef} />
        </div>
    );
};

export default ChatArea;