import React, { useState, useEffect } from 'react';
import PlayerCenteredView from './components/PlayerCenteredView';

interface PlayerInfo {
  id: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  dockedAt?: string;
}

function PlayerView() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [viewing, setViewing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/universe/players/all');
        const playersData = await response.json();
        setPlayers(playersData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch players:', error);
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  if (viewing && selectedPlayerId) {
    return <PlayerCenteredView playerId={selectedPlayerId} />;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: '#0a0a0f',
      color: '#ffffff'
    }}>
      <h1 style={{ color: '#64ffda', marginBottom: '2rem' }}>StellarBurn Player View</h1>
      
      {loading ? (
        <div>Loading players...</div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>No players found</p>
          <p style={{ color: '#b0b0b0' }}>Create a player using the CLI first:</p>
          <code style={{ background: '#1a1a1f', padding: '0.5rem', borderRadius: '4px' }}>
            stellarburn create "YourName"
          </code>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#b0b0b0' }}>
              Select Player:
            </label>
            <select 
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#1a1a1f',
                color: '#ffffff',
                width: '300px'
              }}
            >
              <option value="">Choose a player...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.coordinates.x.toFixed(1)}, {player.coordinates.y.toFixed(1)}, {player.coordinates.z.toFixed(1)})
                  {player.dockedAt ? ' [DOCKED]' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setViewing(true)}
            disabled={!selectedPlayerId}
            style={{
              background: selectedPlayerId ? '#ff1493' : '#333',
              color: selectedPlayerId ? '#ffffff' : '#666',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
              fontWeight: '600'
            }}
          >
            Enter Player View
          </button>
        </>
      )}
    </div>
  );
}

export default PlayerView;