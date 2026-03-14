"use client";

import React, { useEffect, useState, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

export default function GraphPage() {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoId, setRepoId] = useState('e6bf6e07ade1d86194d7c89b673773d5');

  const stylesheet: any = [
    {
      selector: 'node',
      style: {
        'width': (ele: any) => ele.data('type') === 'directory' ? 60 : 40,
        'height': (ele: any) => ele.data('type') === 'directory' ? 60 : 40,
        'shape': 'ellipse',
        'background-color': 'rgba(255, 255, 255, 0.05)',
        'border-width': 1,
        'border-color': (ele: any) => ele.data('type') === 'directory' ? '#00d4ff' : 'rgba(255, 255, 255, 0.2)',
        'label': 'data(label)',
        'color': '#ffffff',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-family': 'Inter, sans-serif',
        'transition-property': 'background-color, border-color, border-width',
        'transition-duration': '0.3s',
        'overlay-padding': '6px',
        'z-index': 10
      }
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': 'rgba(0, 212, 255, 0.1)',
        'border-color': '#00d4ff',
        'border-width': 2,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': 'rgba(255, 255, 255, 0.1)',
        'target-arrow-color': 'rgba(255, 255, 255, 0.1)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 0.8,
        'opacity': 0.6
      }
    }
  ];

  const fetchData = async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/github/graph/${repoId}`, {
        headers: { 'accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      console.log("Incoming Graph Data:", data);

      // Guard: check the response has the expected shape
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error(`Unexpected API response shape. Got: ${JSON.stringify(data).slice(0, 200)}`);
      }

      const cyNodes = (data.nodes as any[]).map((n) => ({
        data: { id: n.id, label: n.label, type: n.type },
        group: 'nodes'
      }));

      const cyEdges = ((data.edges ?? []) as any[])
        .filter((e) => e.source && e.target)
        .map((e, idx) => ({
          data: {
            id: `edge-${e.source}-${e.target}-${idx}`,
            source: e.source,
            target: e.target
          },
          group: 'edges'
        }));

      setElements([...cyNodes, ...cyEdges]);
      setLoading(false);
    } catch (e: any) {
      console.error("Failed to load graph data", e);
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const layout = {
    name: 'cose',
    // Spread nodes far apart
    idealEdgeLength: 160,
    // Start randomized so clusters form organically
    randomize: true,
    // High repulsion = nodes push away from each other, creating scatter
    nodeRepulsion: 800000,
    // Low gravity = clusters don't collapse to the center
    gravity: 10,
    // Enough spring force to keep connected nodes in same cluster
    edgeElasticity: 200,
    // General settings
    nodeOverlap: 40,
    fit: true,
    padding: 80,
    componentSpacing: 180,
    nestingFactor: 1.2,
    numIter: 1500,
    initialTemp: 400,
    coolingFactor: 0.97,
    minTemp: 1.0,
    refresh: 20,
    animate: true,
    animationDuration: 800,
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative', overflow: 'hidden' }}>
      {loading && (
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#00d4ff', fontSize: '12px', zIndex: 100, letterSpacing: '2px', fontWeight: 'bold'
        }}>
          INITIALIZING CYTOSCAPE ENGINE...
        </div>
      )}

      {error && (
        <div style={{ 
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 0, 0, 0.1)', color: '#ff4444', padding: '10px 20px', 
          borderRadius: '8px', zIndex: 100, border: '1px solid rgba(255, 0, 0, 0.2)', fontSize: '13px'
        }}>
          Engine Error: {error}
        </div>
      )}

      {/* Modern UI Overlay */}
      <div style={{ 
        position: 'absolute', top: '30px', left: '30px', zIndex: 50,
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)',
        padding: '20px 30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center' }}>
          <img src="/synapselogo.png" alt="SYNAPSE" style={{ height: '20px', marginRight: '8px', filter: 'invert(1) brightness(2)' }} />
          <span style={{ color: '#00d4ff' }}>GRAPH</span>
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Cytoscape Intelligence Engine
        </p>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={repoId}
            onChange={(e) => setRepoId(e.target.value)}
            placeholder="Enter Repo ID..."
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '10px 15px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none',
              width: '240px'
            }}
          />
          <button 
            onClick={fetchData}
            disabled={loading}
            style={{
              background: '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? '...' : 'SCAN'}
          </button>
        </div>

        <div style={{ marginTop: '20px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00d4ff' }} />
            DIRECTORY
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }} />
            FILE
          </div>
        </div>
      </div>

      <CytoscapeComponent 
        elements={elements} 
        style={{ width: '100%', height: '100%' }} 
        stylesheet={stylesheet}
        layout={layout}
        cy={(cy) => {
          cy.on('tap', 'node', (evt) => {
            console.log('Selected node:', evt.target.id());
          });
        }}
      />
    </div>
  );
}
