import React from 'react';
import { useRouter } from 'next/router';
import { RouteGuard } from '@/middleware/RouteGuard';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import ChatArea from '@/components/chat/ChatArea';
import MessageInput from '@/components/chat/MessageInput';

const ExistingChatPage = () => {
    const router = useRouter();
    const { id } = router.query;

    return (
        <RouteGuard>
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-col flex-grow">
                    <Header />
                    <ChatArea conversationId={id} />
                    <MessageInput />
                </div>
            </div>
        </RouteGuard>
    );
};

export default ExistingChatPage;