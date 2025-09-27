import React, { useMemo } from 'react';
import { SectorDocument } from '@stellarburn/shared';
import * as THREE from 'three';

interface UniverseBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  minW: number;
  maxW: number;
}

interface Props {
  sectors: SectorDocument[];
  bounds: UniverseBounds | null;
}

function StarSystem({ sector }: { sector: SectorDocument }) {
  const systemColor = useMemo(() => {
    // Color based on system type - we'll look at the first static object (star)
    const star = sector.staticObjects.find(obj => obj.type === 'star');
    if (!star) return '#ffffff';
    
    // Different colors for different system types
    if (star.name.includes('Red Dwarf')) return '#ff6b6b';
    if (star.name.includes('Solar')) return '#ffd93d';
    if (star.name.includes('Binary')) return '#74c0fc';
    if (star.name.includes('Gas Giant')) return '#ff8cc8';
    if (star.name.includes('Dense')) return '#51cf66';
    return '#ffffff';
  }, [sector]);

  const systemSize = useMemo(() => {
    // Size based on number of objects in system
    const objectCount = sector.staticObjects.length;
    return Math.max(0.2, Math.min(1.0, objectCount * 0.1));
  }, [sector]);

  const hasStation = sector.staticObjects.some(obj => obj.type === 'station');
  const hasAsteroids = sector.staticObjects.some(obj => obj.type === 'asteroid');

  return (
    <group position={[sector.coord.x, sector.coord.y, sector.coord.z]}>
      {/* Main star */}
      <mesh>
        <sphereGeometry args={[systemSize, 8, 8]} />
        <meshBasicMaterial color={systemColor} />
      </mesh>
      
      {/* Station indicator */}
      {hasStation && (
        <mesh position={[0, systemSize + 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#64ffda" />
        </mesh>
      )}
      
      {/* Asteroid belt indicator */}
      {hasAsteroids && (
        <mesh>
          <ringGeometry args={[systemSize + 0.5, systemSize + 0.8, 16]} />
          <meshBasicMaterial color="#8c7853" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Planets as smaller spheres */}
      {sector.staticObjects
        .filter(obj => obj.type === 'planet')
        .slice(0, 4) // Only show first 4 planets to avoid clutter
        .map((planet, index) => {
          const angle = (index / 4) * Math.PI * 2;
          const distance = systemSize + 1 + index * 0.5;
          const x = Math.cos(angle) * distance;
          const z = Math.sin(angle) * distance;
          
          return (
            <mesh key={planet.id} position={[x, 0, z]}>
              <sphereGeometry args={[0.1, 6, 6]} />
              <meshBasicMaterial color="#a0a0a0" />
            </mesh>
          );
        })}
    </group>
  );
}

function GridLines({ bounds }: { bounds: UniverseBounds }) {
  const gridLines = useMemo(() => {
    const lines = [];
    const step = 5;
    
    // X-Y grid lines
    for (let x = Math.floor(bounds.minX / step) * step; x <= bounds.maxX; x += step) {
      lines.push(
        <line key={`x-${x}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                x, bounds.minY, 0,
                x, bounds.maxY, 0
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#333333" transparent opacity={0.3} />
        </line>
      );
    }
    
    for (let y = Math.floor(bounds.minY / step) * step; y <= bounds.maxY; y += step) {
      lines.push(
        <line key={`y-${y}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                bounds.minX, y, 0,
                bounds.maxX, y, 0
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#333333" transparent opacity={0.3} />
        </line>
      );
    }
    
    return lines;
  }, [bounds]);

  return <>{gridLines}</>;
}

export default function UniverseVisualization({ sectors, bounds }: Props) {
  if (!bounds) return null;

  return (
    <>
      <GridLines bounds={bounds} />
      
      {sectors.map((sector) => (
        <StarSystem key={sector._id} sector={sector} />
      ))}
      
      {/* Coordinate system indicator */}
      <group position={[bounds.minX - 2, bounds.minY - 2, bounds.minZ - 2]}>
        {/* X axis - Red */}
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
        
        {/* Y axis - Green */}
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
        
        {/* Z axis - Blue */}
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