import { useEffect } from 'react';

type ShortcutCallback = () => void;

export const useKeyboardShortcut = (key: string, callback: ShortcutCallback) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Evitamos que teclas como F2 o F4 ejecuten las funciones por defecto del navegador
            if (event.key === key) {
                event.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [key, callback]);
};