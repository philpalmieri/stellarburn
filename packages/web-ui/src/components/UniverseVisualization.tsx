import React, { useMemo, useState, useEffect } from 'react';
import { SectorDocument } from '@stellarburn/shared';

interface UniverseBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

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
  sectors: SectorDocument[];
  bounds: UniverseBounds | null;
}

function StarSystem({ sector }: { sector: SectorDocument }) {
  const star = sector.staticObjects.find(obj => obj.type === 'star');
  const planets = sector.staticObjects.filter(obj => obj.type === 'planet');
  const stations = sector.staticObjects.filter(obj => obj.type === 'station');

  if (!star) return null;

  const systemColor = useMemo(() => {
    if (star.name.includes('Red Dwarf')) return '#ff6b6b';
    if (star.name.includes('Solar')) return '#ffd93d';
    if (star.name.includes('Binary')) return '#74c0fc';
    if (star.name.includes('Gas Giant')) return '#ff8cc8';
    if (star.name.includes('Dense')) return '#51cf66';
    return '#ffffff';
  }, [star]);

  // Much smaller scaling - stars should stay within their sector
  // Max star radius should be about 0.4 (so they don't overlap with adjacent sectors)
  const starRadius = Math.min(0.4, (star.size / 1000) * 2); // Scale 0-350 zones to 0-0.7 radius max
  
  return (
    <group position={[sector.coord.x, sector.coord.y, sector.coord.z]}>
      {/* Star - much smaller */}
      <mesh>
        <sphereGeometry args={[starRadius, 16, 16]} />
        <meshBasicMaterial color={systemColor} />
      </mesh>
      
      {/* Planets - tiny compared to stars */}
      {planets.slice(0, 4).map((planet, index) => {
        const planetRadius = Math.min(0.05, (planet.size / 100) * 0.1); // Much smaller planets
        const angle = (index / planets.length) * Math.PI * 2;
        const distance = starRadius + 0.1 + index * 0.08;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        return (
          <mesh key={planet.id} position={[x, 0, z]}>
            <sphereGeometry args={[planetRadius, 8, 8]} />
            <meshBasicMaterial color="#a0a0a0" />
          </mesh>
        );
      })}
      
      {/* Stations - tiny cubes */}
      {stations.map((station) => (
        <mesh key={station.id} position={[0, starRadius + 0.1, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.02]} />
          <meshBasicMaterial color="#64ffda" />
        </mesh>
      ))}
    </group>
  );
}

function PlayerIndicator({ player }: { player: Player }) {
  return (
    <group position={[player.coordinates.x, player.coordinates.y, player.coordinates.z]}>
      {/* Tiny player ship */}
      <mesh>
        <octahedronGeometry args={[0.05, 0]} />
        <meshBasicMaterial color="#ff1493" />
      </mesh>
      
    </group>
  );
}

function Players() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players');
        const playersData = await response.json();
        setPlayers(playersData);
      } catch (error) {
        console.error('Failed to fetch players:', error);
      }
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {players.map((player) => (
        <PlayerIndicator key={player.id} player={player} />
      ))}
    </>
  );
}

export default function UniverseVisualization({ sectors, bounds }: Props) {
  if (!bounds) return null;

  return (
    <>      
      {/* Star systems with proper scaling */}
      {sectors.map((sector) => (
        <StarSystem key={sector._id} sector={sector} />
      ))}
      
      {/* Players - tiny ships */}
      <Players />
      
      {/* Coordinate axis indicator */}
      <group position={[bounds.minX - 2, bounds.minY - 2, bounds.minZ - 2]}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 3, 0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff0000" />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 3, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff00" />
        </line>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 0, 3])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#0000ff" />
        </line>
      </group>
    </>
  );
}