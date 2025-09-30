import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import UniverseVisualization from './components/UniverseVisualization';
import { SystemDocument } from '@stellarburn/shared';

interface UniverseStats {
  totalSystems: number;
  totalPlayers: number;
  message: string;
}

interface UniverseBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

function UniverseView() {
  const [systems, setSystems] = useState<SystemDocument[]>([]);
  const [stats, setStats] = useState<UniverseStats | null>(null);
  const [bounds, setBounds] = useState<UniverseBounds | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUniverseData = useCallback(async () => {
    try {
      const statsResponse = await fetch('/api/universe/');
      const statsData = await statsResponse.json();
      setStats(statsData);

      const systemsResponse = await fetch('/api/universe/systems');
      const systemsData = await systemsResponse.json();
      setSystems(systemsData);

      if (systemsData.length > 0) {
        const bounds = systemsData.reduce((acc: UniverseBounds, system: SystemDocument) => {
          return {
            minX: Math.min(acc.minX, system.coord.x),
            maxX: Math.max(acc.maxX, system.coord.x),
            minY: Math.min(acc.minY, system.coord.y),
            maxY: Math.max(acc.maxY, system.coord.y),
            minZ: Math.min(acc.minZ, system.coord.z),
            maxZ: Math.max(acc.maxZ, system.coord.z),
          };
        }, {
          minX: Infinity, maxX: -Infinity,
          minY: Infinity, maxY: -Infinity,
          minZ: Infinity, maxZ: -Infinity,
        });
        
        setBounds(bounds);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching universe data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniverseData();
  }, [fetchUniverseData]);

  if (loading) {
    return <div className="loading">Loading StellarBurn Universe...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        camera={{ position: [50, 50, 50], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={300} depth={50} count={5000} factor={4} fade speed={1} />
        
        <UniverseVisualization systems={systems} bounds={bounds} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          minDistance={0.5}
          maxDistance={200}
        />
      </Canvas>

      <div className="ui-overlay">
        <div className="control-panel" style={{ top: '80px' }}>
          <h3>3D Universe Controls</h3>
          
          <div className="control-group">
            <button 
              onClick={fetchUniverseData}
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
              Refresh Data
            </button>
          </div>
        </div>

        <div className="stats-panel" style={{ top: '80px' }}>
          <h3>Universe Stats</h3>
          <div className="stat-row">
            <span className="stat-label">Total Systems:</span>
            <span className="stat-value">{stats?.totalSystems || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Total Players:</span>
            <span className="stat-value">{stats?.totalPlayers || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Visible Systems:</span>
            <span className="stat-value">{systems.length}</span>
          </div>
          {bounds && (
            <>
              <div className="stat-row">
                <span className="stat-label">X Range:</span>
                <span className="stat-value">{bounds.minX} to {bounds.maxX}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Y Range:</span>
                <span className="stat-value">{bounds.minY} to {bounds.maxY}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Z Range:</span>
                <span className="stat-value">{bounds.minZ} to {bounds.maxZ}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UniverseView;
