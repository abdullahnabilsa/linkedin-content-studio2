import React from 'react';

const MessageLimitAlert = ({ currentCount, maxCount }) => {
    return (
        <div className="message-limit-alert">
            You have reached your message limit: {currentCount} / {maxCount}
        </div>
    );
};

export default MessageLimitAlert;