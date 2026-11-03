import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Game } from './pages/Game';
import { Home } from './pages/Home';
import { Result } from './pages/Result';
import { Ready } from './pages/Ready';
export function App() {
    const [page, setPage] = useState('home');
    const [trail, setTrail] = useState([]);
    function handleStart() {
        setTrail([]);
        setPage('game');
    }
    function handleFinish(t) {
        setTrail(t);
        setPage('result');
    }
    if (page === 'home')
        return _jsx(Home, { onStart: () => setPage('ready') });
    if (page === 'ready')
        return _jsx(Ready, { onCancel: () => setPage('home'), onStart: handleStart });
    if (page === 'game')
        return _jsx(Game, { onFinish: handleFinish });
    return _jsx(Result, { trail: trail, onRetry: () => setPage('ready') });
}
