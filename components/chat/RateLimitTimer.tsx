import React from 'react';
import { useRateLimit } from '@/hooks/useRateLimit';

const RateLimitTimer = () => {
    const { remainingSeconds } = useRateLimit();

    return (
        <div className="rate-limit-timer">
            {remainingSeconds > 0 ? `âڈ³ Wait ${remainingSeconds} for next message` : null}
        </div>
    );
};

export default RateLimitTimer;