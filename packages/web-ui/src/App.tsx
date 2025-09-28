import React, { useState } from 'react';
import UniverseView from './UniverseView';
import PlayerView from './PlayerView';

type ViewType = 'universe' | 'player';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('universe');

  const renderView = () => {
    switch (currentView) {
      case 'universe':
        return <UniverseView />;
      case 'player':
        return <PlayerView />;
      default:
        return <UniverseView />;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Navigation Bar */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        background: 'rgba(15, 15, 25, 0.9)',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <button
          onClick={() => setCurrentView('universe')}
          style={{
            background: currentView === 'universe' ? '#64ffda' : 'transparent',
            color: currentView === 'universe' ? '#0a0a0f' : '#ffffff',
            border: '1px solid #64ffda',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Universe View
        </button>
        
        <button
          onClick={() => setCurrentView('player')}
          style={{
            background: currentView === 'player' ? '#ff1493' : 'transparent',
            color: currentView === 'player' ? '#ffffff' : '#ffffff',
            border: '1px solid #ff1493',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Player View
        </button>
      </div>

      {/* Current View */}
      {renderView()}
    </div>
  );
}

export default App;