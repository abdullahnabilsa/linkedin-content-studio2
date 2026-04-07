import { useState } from 'react';

export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);

    return {
        favorites,
        // Implement favorite methods
    };
};