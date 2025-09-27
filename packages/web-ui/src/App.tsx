import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import UniverseVisualization from './components/UniverseVisualization';
import { SectorDocument } from '@stellarburn/shared';

interface UniverseStats {
  totalSectors: number;
  message: string;
}

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

function App() {
  const [sectors, setSectors] = useState<SectorDocument[]>([]);
  const [stats, setStats] = useState<UniverseStats | null>(null);
  const [bounds, setBounds] = useState<UniverseBounds | null>(null);
  const [loading, setLoading] = useState(true);
  const [wSlice, setWSlice] = useState(0);
  const [wRange, setWRange] = useState(1);

  // Fetch universe data
  const fetchUniverseData = useCallback(async () => {
    try {
      // Get basic stats
      const statsResponse = await fetch('/api/universe');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Get all sectors (for now - we'll optimize this later)
      const sectorsResponse = await fetch('/api/sectors');
      const sectorsData = await sectorsResponse.json();
      setSectors(sectorsData);

      // Calculate bounds
      if (sectorsData.length > 0) {
        const bounds = sectorsData.reduce((acc: UniverseBounds, sector: SectorDocument) => {
          return {
            minX: Math.min(acc.minX, sector.coord.x),
            maxX: Math.max(acc.maxX, sector.coord.x),
            minY: Math.min(acc.minY, sector.coord.y),
            maxY: Math.max(acc.maxY, sector.coord.y),
            minZ: Math.min(acc.minZ, sector.coord.z),
            maxZ: Math.max(acc.maxZ, sector.coord.z),
            minW: Math.min(acc.minW, sector.coord.w),
            maxW: Math.max(acc.maxW, sector.coord.w),
          };
        }, {
          minX: Infinity, maxX: -Infinity,
          minY: Infinity, maxY: -Infinity,
          minZ: Infinity, maxZ: -Infinity,
          minW: Infinity, maxW: -Infinity,
        });
        
        setBounds(bounds);
        setWSlice(Math.floor((bounds.minW + bounds.maxW) / 2));
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

  // Filter sectors by W dimension slice
  const visibleSectors = sectors.filter(sector => 
    sector.coord.w >= wSlice - wRange && 
    sector.coord.w <= wSlice + wRange
  );

  if (loading) {
    return <div className="loading">Loading StellarBurn Universe...</div>;
  }

  return (
    <>
      <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={300} depth={50} count={5000} factor={4} fade speed={1} />
        
        <UniverseVisualization sectors={visibleSectors} bounds={bounds} />
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={200}
        />
      </Canvas>

      <div className="ui-overlay">
        <div className="control-panel">
          <h3>4D Universe Controls</h3>
          
          <div className="control-group">
            <label>W Dimension Slice: {wSlice}</label>
            <input 
              type="range" 
              min={bounds?.minW || 0} 
              max={bounds?.maxW || 10} 
              step={1}
              value={wSlice} 
              onChange={(e) => setWSlice(Number(e.target.value))}
            />
          </div>
          
          <div className="control-group">
            <label>W Range: ±{wRange}</label>
            <input 
              type="range" 
              min={0} 
              max={5} 
              step={0.5}
              value={wRange} 
              onChange={(e) => setWRange(Number(e.target.value))}
            />
          </div>

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

        <div className="stats-panel">
          <h3>Universe Stats</h3>
          <div className="stat-row">
            <span className="stat-label">Total Sectors:</span>
            <span className="stat-value">{stats?.totalSectors || 0}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Visible Sectors:</span>
            <span className="stat-value">{visibleSectors.length}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">W Slice:</span>
            <span className="stat-value">{wSlice} (±{wRange})</span>
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
              <div className="stat-row">
                <span className="stat-label">W Range:</span>
                <span className="stat-value">{bounds.minW} to {bounds.maxW}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;