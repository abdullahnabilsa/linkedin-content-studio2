import React from 'react';

const MessageInfo = ({ personaName, modelName, tokenCount, responseTime }) => {
    return (
        <div className="message-info">
            {personaName} | {modelName} | {tokenCount} tokens | {responseTime} ms
        </div>
    );
};

export default MessageInfo;