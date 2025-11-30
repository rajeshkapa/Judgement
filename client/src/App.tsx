import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { Chat } from './components/Chat';

const GameContainer: React.FC = () => {
    const { gameState, isConnected } = useGame();

    if (!isConnected) {
        return <div className="h-screen flex items-center justify-center bg-green-900 text-white">Connecting to server...</div>;
    }

    if (!gameState) {
        return <Lobby />;
    }

    return (
        <>
            <GameBoard />
            <Chat />
        </>
    );
};

function App() {
    return (
        <GameProvider>
            <GameContainer />
        </GameProvider>
    );
}

export default App;
