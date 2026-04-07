import { useState } from 'react';

export const useChat = () => {
    const [messages, setMessages] = useState([]);

    const sendMessage = (content) => {
        // Implement send message logic
    };

    return {
        messages,
        sendMessage,
    };
};