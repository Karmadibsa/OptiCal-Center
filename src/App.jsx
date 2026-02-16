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
    // Determine environment base URL for fetching files (Vite / public)
    const basePath = import.meta.env.BASE_URL || '/';

    Promise.all([
      fetch(`${basePath}diet.csv`).then(res => res.text()),
      fetch(`${basePath}supplements.csv`).then(res => res.text())
    ]).then(([dietText, suppText]) => {
      const dietData = Papa.parse(dietText, { header: true, skipEmptyLines: true }).data;
      const suppData = Papa.parse(suppText, { header: true, skipEmptyLines: true }).data;

      // Merge both for backward compatibility with components expecting one list
      setData([...dietData, ...suppData]);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading CSV files", err);
      setLoading(false);
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
        <Route path="/smart-diet" element={<SmartDiet csvData={data} />} />
      </Routes>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        <p>Projet perso - Hébergé avec amour - Merci de ne pas casser le site (Toute réclamation sera ignorée ❤️)</p>
      </footer>
    </Router>
  );
};

export default App;
