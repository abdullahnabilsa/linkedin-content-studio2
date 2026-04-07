import React from 'react';
import ConversationList from './ConversationList';
import FavoritesList from './FavoritesList';
import QuickSettings from './QuickSettings';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <ConversationList />
            <FavoritesList />
            <QuickSettings />
        </div>
    );
};

export default Sidebar;