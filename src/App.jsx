import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Papa from 'papaparse';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import SmartDiet from './components/SmartDiet';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/roadmap.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setLoading(false);
          }
        });
      });
  }, []);

  if (loading) return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#38bdf8'
    }}>
      Chargement...
    </div>
  );

  return (
    <Router>
      <header className="app-header">
        <h1 className="brand-title">
          <span className="brand-opti">Opti</span>
          <span className="brand-cal">Cal</span>
          <span className="brand-center">Center</span>
        </h1>
        <p className="brand-subtitle">Optimisation • Calories • Performance</p>
      </header>

      <Navigation />

      <Routes>
        <Route path="/" element={<Dashboard csvData={data} />} />
        <Route path="/calculator" element={<Calculator csvData={data} />} />
        <Route path="/smart-diet" element={<SmartDiet />} />
      </Routes>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        <p>Projet perso - Hébergé avec amour - Merci de ne pas casser le site (Toute réclamation sera ignorée ❤️)</p>
      </footer>
    </Router>
  );
};

export default App;
