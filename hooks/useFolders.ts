import { useState } from 'react';

export const useFolders = () => {
    const [folders, setFolders] = useState([]);

    return {
        folders,
        // Implement folder methods
    };
};