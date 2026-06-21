import React from 'react';

const DiversionPlan = ({ plan }) => {
  if (!plan) {
    return (
      <div className="glass-panel diversion-container">
        <h2 style={{ color: 'var(--text-secondary)' }}>Traffic Diversion Plan</h2>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
          No active plan
        </div>
      </div>
    );
  }

  const sectionHeaders = [
    /(?:\*\*|)\s*1\.\s*Incident\s+Summary\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*2\.\s*(?:Recommended\s+)?Diversion\s+Strategy\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*3\.\s*Barricade\s*[\/\s]*Blockage\s+Points\s*(?:\s*\([^)]*\))?\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*4\.\s*Diversion\s+Points\s*(?:\s*\([^)]*\))?\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*5\.\s*Police\s+Deployment\s+(?:Plan)?\s*(?:\s*\([^)]*\))?\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*6\.\s*(?:Step-by-Step\s+)?Diversion\s+Instructions\s*(?:\s*\([^)]*\))?\s*(?:\*\*|)/i,
    /(?:\*\*|)\s*7\.\s*Important\s+Notes\s*(?:for\s+Bangalore)?\s*(?:\*\*|)/i
  ];

  const getSectionText = (sectionIndex) => {
    try {
      const currentRegex = sectionHeaders[sectionIndex];
      const match = plan.match(currentRegex);
      if (!match) return '';
      
      const startIndex = match.index + match[0].length;
      let endIndex = plan.length;
      
      // Find the next section that actually exists in the plan
      for (let j = sectionIndex + 1; j < sectionHeaders.length; j++) {
        const nextMatch = plan.match(sectionHeaders[j]);
        if (nextMatch && nextMatch.index > match.index) {
          endIndex = nextMatch.index;
          break;
        }
      }
      
      return plan.substring(startIndex, endIndex).trim();
    } catch (e) {
      // ignore
    }
    return '';
  };

  const parseTable = (text) => {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Find the first line containing a pipe
    const headerIndex = lines.findIndex(l => l.includes('|'));
    if (headerIndex === -1) {
      // No table found, just render lines as text
      return <div>{lines.map((l, i) => <p key={i}>{l}</p>)}</div>;
    }

    const preTableLines = lines.slice(0, headerIndex);
    const headerLine = lines[headerIndex];
    const tableLines = lines.slice(headerIndex + 1).filter(l => l.includes('|'));

    const headers = headerLine.split('|').map(s => s.trim().replace(/^([-*+]+|\d+[\.)])\s*/, '').replace(/-/g, ''));
    const rows = tableLines.map(l => l.split('|').map(s => s.trim().replace(/^([-*+]+|\d+[\.)])\s*/, '')));

    return (
      <div>
        {preTableLines.map((l, i) => (
          <p key={i} style={{ marginBottom: 8, color: 'var(--text-secondary)' }}>
            {l.replace(/^([-*+]+|\d+[\.)])\s*/, '')}
          </p>
        ))}
        <div className="plan-table-container">
          <table className="plan-table">
            <thead>
              <tr>
                {headers.map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const parseList = (text) => {
    if (!text) return null;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const isBulletLine = (line) => /^[-*+\d.]/.test(line);
    
    const preList = [];
    const listItems = [];
    
    lines.forEach(l => {
      if (listItems.length === 0 && !isBulletLine(l)) {
        preList.push(l);
      } else {
        listItems.push(l);
      }
    });

    return (
      <div>
        {preList.map((l, i) => (
          <p key={i} style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {l}
          </p>
        ))}
        {listItems.length > 0 && (
          <ul>
            {listItems.map((l, i) => (
              <li key={i}>{l.replace(/^([-*+]+|\d+[\.)])\s*/, '')}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const summary = getSectionText(0);
  const strategy = getSectionText(1);
  const barricades = getSectionText(2);
  const diversionPts = getSectionText(3);
  const deployment = getSectionText(4);
  const instructions = getSectionText(5);
  const notes = getSectionText(6);

  return (
    <div className="glass-panel diversion-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2>Traffic Diversion Plan</h2>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {summary && (
          <div className="plan-section section-summary">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--danger)'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Incident Summary
            </h3>
            {parseList(summary)}
          </div>
        )}

        {strategy && (
          <div className="plan-section section-strategy">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent)'}}><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              Diversion Strategy
            </h3>
            {parseList(strategy)}
          </div>
        )}

        {(barricades || diversionPts) && (
          <div className="plan-section section-points">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--warning)'}}><rect x="2" y="6" width="20" height="8" rx="1"></rect><path d="M17 14v4M7 14v4M12 6V3M6 6h12"></path></svg>
              Blockage & Diversion Points
            </h3>
            {barricades && <div><strong style={{ color: 'var(--text-primary)' }}>Barricades:</strong> {parseList(barricades)}</div>}
            {diversionPts && <div style={{marginTop: 12}}><strong style={{ color: 'var(--text-primary)' }}>Diversions:</strong> {parseList(diversionPts)}</div>}
          </div>
        )}

        {deployment && (
          <div className="plan-section section-deployment">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#0088ff'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Police Deployment
            </h3>
            {parseTable(deployment)}
          </div>
        )}

        {instructions && (
          <div className="plan-section section-instructions">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--success)'}}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Public Instructions
            </h3>
            <ol style={{ paddingLeft: 20 }}>
              {instructions.split('\n').map(l => l.trim()).filter(l => l.length > 0).map((l, i) => (
                <li key={i} style={{marginBottom: 8}}>{l.replace(/^([-*+]+|\d+[\.)])\s*/, '')}</li>
              ))}
            </ol>
          </div>
        )}

        {notes && (
          <div className="plan-section section-notes">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: '#f97316'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              Important Notes
            </h3>
            {parseList(notes)}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiversionPlan;
