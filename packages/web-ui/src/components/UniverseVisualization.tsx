import React, { useMemo, useState, useEffect } from 'react';
import { SectorDocument, Probe } from '@stellarburn/shared';

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
  const staticObjects = sector.staticObjects || [];
  const star = staticObjects.find(obj => obj.type === 'star');
  const planets = staticObjects.filter(obj => obj.type === 'planet');
  const stations = staticObjects.filter(obj => obj.type === 'station');

  if (!star) return null;

  const systemColor = useMemo(() => {
    if (star.name.includes('Red Dwarf')) return '#ff6b6b';
    if (star.name.includes('Solar')) return '#ffd93d';
    if (star.name.includes('Binary')) return '#74c0fc';
    if (star.name.includes('Gas Giant')) return '#ff8cc8';
    if (star.name.includes('Dense')) return '#51cf66';
    return '#ffffff';
  }, [star]);

  // Better star sizing based on new 3-tier system: 1, 9, 27 zones
  let starRadius;
  if (star.size === 1) starRadius = 0.02;      // Small star
  else if (star.size === 9) starRadius = 0.06; // Medium star
  else if (star.size === 27) starRadius = 0.12; // Large star
  else starRadius = Math.min(0.15, (star.size / 200)); // Fallback for any other sizes
  
  return (
    <>
      {/* Star at its actual coordinates */}
      <group position={[star.coordinates.x, star.coordinates.y, star.coordinates.z]}>
        <mesh>
          <sphereGeometry args={[starRadius, 16, 16]} />
          <meshBasicMaterial color={systemColor} />
        </mesh>
        {/* Glowing corona for better visibility */}
        <mesh>
          <sphereGeometry args={[starRadius * 1.2, 8, 8]} />
          <meshBasicMaterial color={systemColor} transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Planets at their actual coordinates */}
      {planets.map((planet) => {
        // Better planet sizing based on new 3-tier system: 1, 4, 9 zones
        let planetRadius;
        if (planet.size === 1) planetRadius = 0.01;      // Small planet
        else if (planet.size === 4) planetRadius = 0.02; // Medium planet
        else if (planet.size === 9) planetRadius = 0.03; // Large planet
        else planetRadius = Math.min(0.03, (planet.size / 300)); // Fallback

        const planetColor = React.useMemo(() => {
          // Vary planet colors slightly for visual interest
          const colors = ['#8d6e63', '#607d8b', '#795548', '#5d4037', '#424242'];
          return colors[Math.abs(planet.id.charCodeAt(planet.id.length - 1)) % colors.length];
        }, [planet.id]);

        return (
          <group key={planet.id} position={[planet.coordinates.x, planet.coordinates.y, planet.coordinates.z]}>
            <mesh>
              <sphereGeometry args={[planetRadius, 8, 8]} />
              <meshBasicMaterial color={planetColor} />
            </mesh>
          </group>
        );
      })}

      {/* Stations at their actual coordinates */}
      {stations.map((station) => (
        <group key={station.id} position={[station.coordinates.x, station.coordinates.y, station.coordinates.z]}>
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
      ))}
    </>
  );
}

function PlayerIndicator({ player }: { player: Player }) {
  return (
    <group position={[player.coordinates.x, player.coordinates.y, player.coordinates.z]}>
      {/* Player ship - scaled down to be proportional to new object sizes */}
      <mesh>
        <octahedronGeometry args={[0.015, 0]} />
        <meshBasicMaterial color="#ff1493" />
      </mesh>
      {/* Glowing outline */}
      <mesh>
        <octahedronGeometry args={[0.025, 0]} />
        <meshBasicMaterial color="#ff69b4" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ProbeIndicator({ probe }: { probe: Probe }) {
  return (
    <group position={[probe.coordinates.x, probe.coordinates.y, probe.coordinates.z]}>
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

function Players() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/universe/players');
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

function Probes() {
  const [probes, setProbes] = useState<Probe[]>([]);

  useEffect(() => {
    const fetchProbes = async () => {
      try {
        // Fetch all active probes from all players
        // Since we don't have a global probes endpoint, we'll need to create one
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
    const interval = setInterval(fetchProbes, 1000); // Update more frequently for moving probes

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {probes.map((probe) => (
        <ProbeIndicator key={probe.id} probe={probe} />
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

      {/* Probes - bright orange indicators */}
      <Probes />

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