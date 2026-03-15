"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// --- EZSCAN VISUALIZATION PORT ---
interface GraphVisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    language?: string;
    group?: string;
    changed?: boolean;
    affected?: boolean;
    gitStatus?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
    label?: string;
  }>;
}

function transformForVisualization(
  nodes: Array<{ id: string; name: string; type: string; language?: string; metadata?: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string; type: string; label?: string }>
): GraphVisualizationData {
  const typeColors: Record<string, string> = {
    file: '#4a90d9',
    function: '#50c878',
    class: '#f5a623',
    module: '#d0021b',
    database: '#1abc9c',
    service: '#ff6b6b',
  };

  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.type,
      language: n.language,
      group: typeColors[n.type] || '#999',
      changed: Boolean(n.metadata?.changed),
      affected: Boolean(n.metadata?.affected),
      gitStatus: typeof n.metadata?.gitStatus === 'string' ? n.metadata.gitStatus : undefined,
    })),
    links: edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      label: e.label,
    })),
  };
}

function generateVisualizationHTML(data: GraphVisualizationData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #050505; /* Adjusted for dark mode integration */
      color: #fff;
      overflow: hidden;
    }
    #graph { 
      width: 100vw; 
      height: 100vh; 
    }
    .node { cursor: pointer; }
    .node circle { stroke: #fff; stroke-width: 1.5px; }
    .node.changed path, .node.changed circle,
    .node.affected path, .node.affected circle {
      animation: pinBounce 1.5s infinite ease-in-out;
    }
    @keyframes pinBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .node.changed path {
      fill: #ffcc00;
      filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.8));
    }
    .node.affected path {
      fill: #ff4d4d;
      filter: drop-shadow(0 0 10px rgba(255, 77, 77, 0.8));
    }
    .node text { 
      font-size: 10px; 
      fill: #fff; 
      pointer-events: none;
    }
    .link { 
      stroke: #555; 
      stroke-opacity: 0.6;
      stroke-width: 1px;
    }
    .link.imports { stroke: #9013fe; }
    .link.calls { stroke: #f5a623; }
    .link.contains { stroke: #50c878; }
    .link.extends { stroke: #4a90d9; }
    .link.references { stroke: #7ed321; }
    .link.calls_api { stroke: #ff6b6b; }
    .link.serves_api { stroke: #ffd166; }
    .link.queries { stroke: #1abc9c; }
    .link.depends_on { stroke: #8e44ad; }
    #tooltip {
      position: absolute;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      pointer-events: none;
      display: none;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    #stats {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    #legend {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
    }
    .legend-item { display: flex; align-items: center; margin: 4px 0; }
    .legend-color { width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; }
    #controls {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
    }
    #filters {
      position: absolute;
      top: 10px;
      left: 180px;
      display: flex;
      gap: 8px;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px;
      border-radius: 6px;
      align-items: center;
    }
    #filters input, #filters select, #filters label {
      font-size: 12px;
      color: #fff;
    }
    #filters input, #filters select {
      background: #1f1f1f;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 6px 8px;
    }
    #inspector {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(45, 45, 45, 0.95);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 12px;
      border-radius: 8px;
      width: 280px;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    button {
      background: #3a3a3a;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover { background: #4a4a4a; }
  </style>
</head>
<body>
    <div id="loading" style="padding: 20px; color: #888;">Initialising Graph Visualization...</div>
    <svg id="graph"></svg>
    <div id="tooltip"></div>
    <div id="stats"></div>
    <div id="legend">
      <strong>Node Types</strong>
      <div class="legend-item"><span class="legend-color" style="background:#4a90d9"></span>File</div>
      <div class="legend-item"><span class="legend-color" style="background:#50c878"></span>Function</div>
      <div class="legend-item"><span class="legend-color" style="background:#f5a623"></span>Class</div>
      <div class="legend-item"><span class="legend-color" style="background:#d0021b"></span>Module</div>
      <div class="legend-item"><span class="legend-color" style="background:#1abc9c"></span>Database Entity</div>
      <div class="legend-item"><span class="legend-color" style="background:#ff6b6b"></span>API Endpoint</div>
      <div class="legend-item" style="margin-top: 8px;"><span class="legend-color" style="background:#ffcc00"></span>Modified (Direct)</div>
      <div class="legend-item"><span class="legend-color" style="background:#ff4d4d"></span>Affected Dependent</div>
    </div>
    <div id="filters">
      <input id="searchInput" type="text" placeholder="Search nodes" />
      <select id="typeFilter">
        <option value="all">All Types</option>
        <option value="file">Files</option>
        <option value="function">Functions</option>
        <option value="class">Classes</option>
        <option value="module">Modules</option>
        <option value="database">Databases</option>
        <option value="service">Services</option>
      </select>
      <label><input id="changedOnly" type="checkbox" /> Changed</label>
    </div>
    <div id="controls">
      <button id="zoomIn">Zoom In</button>
      <button id="zoomOut">Zoom Out</button>
      <button id="reset">Reset</button>
    </div>
    <div id="inspector"><strong>Selection</strong><br>Click a node to focus its direct relations.</div>
  
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
      (function() {
        // Raw nested data injected securely here
        const data = ${JSON.stringify(data)};
        const loading = document.getElementById('loading');
        const inspector = document.getElementById('inspector');
        const searchInput = document.getElementById('searchInput');
        const typeFilter = document.getElementById('typeFilter');
        const changedOnlyToggle = document.getElementById('changedOnly');
        let selectedNodeId = null;
        
        if (typeof d3 === 'undefined') {
          loading.innerHTML = '<div style="color: #ff4d4d">Error: D3.js failed to load. Please check your internet connection.</div>';
          return;
        }
  
        loading.style.display = 'none';
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const svg = d3.select('#graph')
          .attr('width', width)
          .attr('height', height);
        
        const g = svg.append('g');
        
        const zoom = d3.zoom()
          .scaleExtent([0.1, 8])
          .on('zoom', (event) => g.attr('transform', event.transform));
        
        svg.call(zoom);
        
        const simulation = d3.forceSimulation(data.nodes)
          .force('link', d3.forceLink(data.links).id(d => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(40));
        
        const link = g.append('g')
          .selectAll('line')
          .data(data.links)
          .enter()
          .append('line')
          .attr('class', d => 'link ' + d.type);
        
        const node = g.append('g')
          .selectAll('g')
          .data(data.nodes)
          .enter()
          .append('g')
          .attr('class', d => {
            if (d.changed) return 'node changed';
            if (d.affected) return 'node affected';
            return 'node';
          })
          .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
        
        // standard circle for unchanged
        node.filter(d => !d.changed && !d.affected).append('circle')
          .attr('r', d => d.type === 'file' ? 14 : 10)
          .attr('fill', d => d.group);

        // map pin for changed/affected
        const pin = node.filter(d => d.changed || d.affected).append('path')
          .attr('d', 'M0,0 C-12,-12 -18,-24 -18,-30 A18,18 0 1,1 18,-30 C18,-24 12,-12 0,0 Z')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5);
        
        // inner circle for the pin
        node.filter(d => d.changed || d.affected).append('circle')
          .attr('r', 6)
          .attr('cy', -30)
          .attr('fill', '#fff');
        
        node.append('text')
          .attr('dx', d => (d.changed || d.affected) ? 22 : 16)
          .attr('dy', d => (d.changed || d.affected) ? -26 : 4)
          .text(d => d.label)
          .style('text-shadow', '0 0 3px #000');
        
        node.on('mouseover', (event, d) => {
          const tooltip = document.getElementById('tooltip');
          tooltip.style.display = 'block';
          tooltip.style.left = event.pageX + 10 + 'px';
          tooltip.style.top = event.pageY + 10 + 'px';
          tooltip.innerHTML = '<strong>' + d.label + '</strong><br>' + 
            'Type: ' + d.type + '<br>' + 
            (d.language ? 'Language: ' + d.language + '<br>' : '') +
            (d.changed ? 'Change: ' + (d.gitStatus || 'changed') : 'Change: none');
        });
        
        node.on('mousemove', (event) => {
          const tooltip = document.getElementById('tooltip');
          tooltip.style.left = event.pageX + 10 + 'px';
          tooltip.style.top = event.pageY + 10 + 'px';
        });
        
        node.on('mouseout', () => {
          document.getElementById('tooltip').style.display = 'none';
        });

        node.on('click', (event, d) => {
          // Event stop logic
          event.stopPropagation();
          selectedNodeId = selectedNodeId === d.id ? null : d.id;
          if (selectedNodeId) {
            const connected = data.links.filter(l => l.source.id === d.id || l.target.id === d.id);
            inspector.innerHTML = '<strong>' + d.label + '</strong><br>' +
              'Type: ' + d.type + '<br>' +
              'Relations: ' + connected.length + '<br>' +
              (d.language ? 'Language: ' + d.language + '<br>' : '') +
              (d.changed ? 'Changed: ' + (d.gitStatus || 'yes') : 'Changed: no');
          } else {
            inspector.innerHTML = '<strong>Selection</strong><br>Click a node to focus its direct relations.';
          }
          applyFilters();
        });

        // Click on background
        svg.on('click', () => {
          selectedNodeId = null;
          inspector.innerHTML = '<strong>Selection</strong><br>Click a node to focus its direct relations.';
          applyFilters();
        });
        
        simulation.on('tick', () => {
          link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
          
          node.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
        });
        
        function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }
        
        function dragended(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }
        
        document.getElementById('zoomIn').addEventListener('click', () => {
          svg.transition().call(zoom.scaleBy, 1.5);
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
          svg.transition().call(zoom.scaleBy, 0.6);
        });
        
        document.getElementById('reset').addEventListener('click', () => {
          svg.transition().call(zoom.transform, d3.zoomIdentity);
        });

        searchInput.addEventListener('input', applyFilters);
        typeFilter.addEventListener('change', applyFilters);
        changedOnlyToggle.addEventListener('change', applyFilters);
        
        const changedCount = data.nodes.filter(n => n.changed).length;
  
        document.getElementById('stats').innerHTML = 
          '<strong>Graph Stats</strong><br>' +
          'Nodes: ' + data.nodes.length + '<br>' +
          'Edges: ' + data.links.length + '<br>' +
          'Changed: ' + changedCount;
          
        window.addEventListener('resize', () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          svg.attr('width', w).attr('height', h);
          simulation.force('center', d3.forceCenter(w / 2, h / 2)).alpha(0.3).restart();
        });

        function applyFilters() {
          const term = searchInput.value.trim().toLowerCase();
          const selectedType = typeFilter.value;
          const changedOnly = changedOnlyToggle.checked;
          const neighborIds = new Set();

          if (selectedNodeId) {
            neighborIds.add(selectedNodeId);
            for (const edge of data.links) {
              const sourceId = typeof edge.source === 'object' ? edge.source.id : edge.source;
              const targetId = typeof edge.target === 'object' ? edge.target.id : edge.target;
              if (sourceId === selectedNodeId) {
                neighborIds.add(targetId);
              }
              if (targetId === selectedNodeId) {
                neighborIds.add(sourceId);
              }
            }
          }

          const visibleNodeIds = new Set();
          node.style('opacity', d => {
            const matchesTerm = term.length === 0 || d.label.toLowerCase().includes(term) || d.id.toLowerCase().includes(term);
            const matchesType = selectedType === 'all' || d.type === selectedType;
            const matchesChanged = !changedOnly || d.changed;
            const matchesSelection = !selectedNodeId || neighborIds.has(d.id);
            const visible = matchesTerm && matchesType && matchesChanged && matchesSelection;
            if (visible) {
              visibleNodeIds.add(d.id);
            }
            return visible ? 1 : 0.08;
          });

          link.style('opacity', d => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const visible = visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
            return visible ? 0.7 : 0.04;
          });
        }

        applyFilters();
      })();
    </script>
  </body>
  </html>`;
}

// --- END EZSCAN VISUALIZATION PORT ---

export default function GraphPage() {
  const searchParams = useSearchParams();
  const repoIdParam = searchParams.get('repo_id') || '4af7ee8920aedb30c6a4f5aeed2623ea';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!repoIdParam) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/github/dependency-graph/${repoIdParam}?track_changes=true`);
        if (!res.ok) throw new Error('API Error: ' + res.status);

        const data = await res.json();
        const d3FormattedData = transformForVisualization(data.nodes || [], data.edges || []);
        
        const html = generateVisualizationHTML(d3FormattedData);
        setSrcDoc(html);
        
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [repoIdParam]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', position: 'relative' }}>
      {loading && <div style={{ color: '#888', position: 'absolute' }}>Loading Graph Data...</div>}
      {error && <div style={{ color: '#ff4444', position: 'absolute' }}>Error: {error}</div>}
      {srcDoc && !loading && !error && (
        <iframe 
          srcDoc={srcDoc} 
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Dependency Graph" 
        />
      )}
    </div>
  );
}
