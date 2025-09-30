import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SectorDocument, Probe } from '@stellarburn/shared';

interface Player {
  id: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
}

interface Props {
  playerId: string;
}

function StarSystem({ sector, playerCoords }: { sector: SectorDocument; playerCoords: any }) {
  const staticObjects = sector.staticObjects || [];

  return (
    <>
      {staticObjects.map((obj) => {
        // Use actual object coordinates, not system coordinates
        const relativeX = obj.coordinates.x - playerCoords.x;
        const relativeY = obj.coordinates.y - playerCoords.y;
        const relativeZ = obj.coordinates.z - playerCoords.z;

        if (obj.type === 'star') {
          // Better star sizing based on our new 3-tier system: 1, 9, 27 zones
          let starRadius;
          if (obj.size === 1) starRadius = 0.02;      // Small star
          else if (obj.size === 9) starRadius = 0.06; // Medium star
          else if (obj.size === 27) starRadius = 0.12; // Large star
          else starRadius = Math.min(0.15, (obj.size / 200)); // Fallback for any other sizes

          const starColor = React.useMemo(() => {
            if (obj.name.includes('Red') || obj.name.includes('Dwarf')) return '#ff6b6b';
            if (obj.name.includes('Solar')) return '#ffd93d';
            if (obj.name.includes('Binary')) return '#74c0fc';
            if (obj.name.includes('Gas')) return '#ff8cc8';
            if (obj.name.includes('Dense')) return '#51cf66';
            return '#ffffff';
          }, [obj.name]);

          return (
            <group key={obj.id} position={[relativeX, relativeY, relativeZ]}>
              <mesh>
                <sphereGeometry args={[starRadius, 16, 16]} />
                <meshBasicMaterial color={starColor} />
              </mesh>
              {/* Glowing corona for better visibility */}
              <mesh>
                <sphereGeometry args={[starRadius * 1.2, 8, 8]} />
                <meshBasicMaterial color={starColor} transparent opacity={0.3} />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'planet') {
          // Better planet sizing based on our new 3-tier system: 1, 4, 9 zones
          let planetRadius;
          if (obj.size === 1) planetRadius = 0.01;      // Small planet
          else if (obj.size === 4) planetRadius = 0.02; // Medium planet
          else if (obj.size === 9) planetRadius = 0.03; // Large planet
          else planetRadius = Math.min(0.03, (obj.size / 300)); // Fallback

          const planetColor = React.useMemo(() => {
            // Vary planet colors slightly for visual interest
            const colors = ['#8d6e63', '#607d8b', '#795548', '#5d4037', '#424242'];
            return colors[Math.abs(obj.id.charCodeAt(obj.id.length - 1)) % colors.length];
          }, [obj.id]);

          return (
            <group key={obj.id} position={[relativeX, relativeY, relativeZ]}>
              <mesh>
                <sphereGeometry args={[planetRadius, 8, 8]} />
                <meshBasicMaterial color={planetColor} />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'station') {
          return (
            <group key={obj.id} position={[relativeX, relativeY, relativeZ]}>
              {/* Station structure */}
              <mesh>
                <boxGeometry args={[0.015, 0.015, 0.015]} />
                <meshBasicMaterial color="#64ffda" />
              </mesh>
              {/* Glowing indicator for better visibility */}
              <mesh>
                <sphereGeometry args={[0.025, 6, 6]} />
                <meshBasicMaterial color="#00e5ff" transparent opacity={0.4} />
              </mesh>
              {/* Blinking beacon effect */}
              <mesh>
                <sphereGeometry args={[0.01, 4, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          );
        }

        if (obj.type === 'asteroid') {
          return (
            <group key={obj.id} position={[relativeX, relativeY, relativeZ]}>
              <mesh>
                <dodecahedronGeometry args={[0.005, 0]} />
                <meshBasicMaterial color="#666666" />
              </mesh>
            </group>
          );
        }

        return null;
      })}
    </>
  );
}

function PlayerShip() {
  return (
    <group position={[0, 0, 0]}>
      {/* Player always at center (0,0,0) - scaled down to be proportional to new object sizes */}
      <mesh>
        <octahedronGeometry args={[0.015, 0]} />
        <meshBasicMaterial color="#ff1493" />
      </mesh>

      {/* Glowing outline to make it obvious */}
      <mesh>
        <octahedronGeometry args={[0.025, 0]} />
        <meshBasicMaterial color="#ff69b4" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ProbeIndicator({ probe, playerCoords }: { probe: Probe; playerCoords: any }) {
  // Position relative to player
  const relativeX = probe.coordinates.x - playerCoords.x;
  const relativeY = probe.coordinates.y - playerCoords.y;
  const relativeZ = probe.coordinates.z - playerCoords.z;

  return (
    <group position={[relativeX, relativeY, relativeZ]}>
      {/* Bright orange probe - diamond shape */}
      <mesh>
        <octahedronGeometry args={[0.03, 0]} />
        <meshBasicMaterial color="#ff4500" />
      </mesh>

      {/* Glowing effect */}
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ff8c00" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function Probes({ playerCoords }: { playerCoords: any }) {
  const [probes, setProbes] = useState<Probe[]>([]);

  useEffect(() => {
    const fetchProbes = async () => {
      try {
        const response = await fetch('/api/probes/active');
        if (response.ok) {
          const probesData = await response.json();
          setProbes(probesData);
        }
      } catch (error) {
        console.error('Failed to fetch probes:', error);
      }
    };

    fetchProbes();
    const interval = setInterval(fetchProbes, 1000); // Update every second for moving probes

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {probes.map((probe) => (
        <ProbeIndicator key={probe.id} probe={probe} playerCoords={playerCoords} />
      ))}
    </>
  );
}

function ExplorationGrid({ playerCoords }: { playerCoords: any }) {
  const gridLines = React.useMemo(() => {
    const lines = [];
    const range = 5; // Show grid 5 systems in each direction
    
    // Grid lines relative to player position
    for (let x = -range; x <= range; x++) {
      for (let z = -range; z <= range; z++) {
        // X-direction lines
        lines.push(
          <line key={`grid-x-${x}-${z}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  x, -range, z,
                  x, range, z
                ])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#333333" transparent opacity={0.2} />
          </line>
        );
        
        // Z-direction lines
        lines.push(
          <line key={`grid-z-${x}-${z}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  -range, x, z,
                  range, x, z
                ])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#333333" transparent opacity={0.2} />
          </line>
        );
      }
    }
    
    return lines;
  }, [playerCoords]);

  return <>{gridLines}</>;
}

export default function PlayerCenteredView({ playerId }: Props) {
  const [knownSystems, setKnownSystems] = useState<SectorDocument[]>([]);
  const [playerCoords, setPlayerCoords] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayerData = useCallback(async () => {
    try {
      const response = await fetch(`/api/player/${playerId}/known-systems`);
      const data = await response.json();
      
      setKnownSystems(data.knownSystems);
      setPlayerCoords(data.playerCoordinates);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchPlayerData();
    const interval = setInterval(fetchPlayerData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [fetchPlayerData]);

  if (loading || !playerCoords) {
    return <div className="loading">Loading Player View...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        camera={{ position: [10, 10, 10], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <Stars radius={100} depth={20} count={2000} factor={2} fade speed={1} />
        
        {/* Exploration grid */}
        <ExplorationGrid playerCoords={playerCoords} />
        
        {/* Player ship at center */}
        <PlayerShip />
        
        {/* Known star systems positioned relative to player */}
        {knownSystems.map((sector) => (
          <StarSystem key={sector._id} sector={sector} playerCoords={playerCoords} />
        ))}

        {/* Probes positioned relative to player */}
        <Probes playerCoords={playerCoords} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          minDistance={0.5}
          maxDistance={50}
          target={[0, 0, 0]} // Always orbit around the player
        />
      </Canvas>

      <div className="ui-overlay">
        <div className="control-panel">
          <h3>Player-Centered View</h3>
          
          <div className="control-group">
            <label>Player Location:</label>
            <span style={{ color: '#64ffda' }}>
              {playerCoords.x.toFixed(1)}, {playerCoords.y.toFixed(1)}, {playerCoords.z.toFixed(1)}
            </span>
          </div>
          
          <div className="control-group">
            <label>Known Systems:</label>
            <span style={{ color: '#ff69b4' }}>{knownSystems.length}</span>
          </div>
          
          <div className="control-group">
            <button 
              onClick={fetchPlayerData}
              style={{
                background: '#64ffda',
                color: '#0a0a0f',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Update View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}