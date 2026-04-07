import React from 'react';

const FolderItem = ({ folder }) => {
    return (
        <div className="folder-item">
            {folder.name}
        </div>
    );
};

export default FolderItem;