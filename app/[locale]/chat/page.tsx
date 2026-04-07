import React from 'react';
import { RouteGuard } from '@/middleware/RouteGuard';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import ChatArea from '@/components/chat/ChatArea';
import MessageInput from '@/components/chat/MessageInput';

const ChatPage = () => {
    return (
        <RouteGuard>
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-col flex-grow">
                    <Header />
                    <ChatArea />
                    <MessageInput />
                </div>
            </div>
        </RouteGuard>
    );
};

export default ChatPage;