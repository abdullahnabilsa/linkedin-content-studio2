import React, { useState } from 'react';
import { useChat } from '@/hooks/useChat';

const MessageInput = () => {
    const [input, setInput] = useState('');
    const { sendMessage } = useChat();

    const handleSend = () => {
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="message-input">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... or / for shortcuts"
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
};

export default MessageInput;