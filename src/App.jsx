import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Papa from 'papaparse';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import SmartDiet from './components/SmartDiet';
import BreadRecipe from './components/BreadRecipe';
import { DEFAULT_PROFILES, DEFAULT_ACTIVITIES } from './utils/dietAlgo';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('smart_diet_profiles_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration : garantit que prot_ratio existe même pour les anciens localStorage (avec goal)
      const axelRatio   = parsed.axel?.prot_ratio   ?? (parsed.axel?.goal === 'sante' ? 1.2 : 1.8);
      const priscaRatio = parsed.prisca?.prot_ratio ?? (parsed.prisca?.goal === 'sante' ? 1.2 : 1.8);
      return {
        axel:   { ...DEFAULT_PROFILES.axel,   ...parsed.axel,   prot_ratio: axelRatio },
        prisca: { ...DEFAULT_PROFILES.prisca, ...parsed.prisca, prot_ratio: priscaRatio },
      };
    }
    return DEFAULT_PROFILES;
  });

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || '/';

    Promise.all([
      fetch(`${basePath}diet.csv`).then(res => res.text()),
      fetch(`${basePath}supplements.csv`).then(res => res.text())
    ]).then(([dietText, suppText]) => {
      const dietData = Papa.parse(dietText, { header: true, skipEmptyLines: true }).data;
      const suppData = Papa.parse(suppText, { header: true, skipEmptyLines: true }).data;
      setData([...dietData, ...suppData]);
      setLoading(false);
    }).catch(err => {
      console.error("Error loading CSV files", err);
      setLoading(false);
    });
  }, []);

  // Charge la config depuis le CSV (source de vérité)
  useEffect(() => {
    if (data.length === 0) return;
    const configRows = data.filter(row => row.Type === 'Config');
    if (configRows.length === 0) return;

    setProfiles(prev => {
      const next = {
        axel: { ...prev.axel, activities: { ...DEFAULT_ACTIVITIES, ...(prev.axel.activities || {}) } },
        prisca: { ...prev.prisca, activities: { ...DEFAULT_ACTIVITIES, ...(prev.prisca.activities || {}) } }
      };

      configRows.forEach(row => {
        if (row.Section === 'Sport') {
          // Nouvelles lignes d'activité avec MET précis
          const actId = row.Item;
          if (actId in DEFAULT_ACTIVITIES) {
            next.axel.activities[actId] = parseFloat(row.Axel) || 0;
            next.prisca.activities[actId] = parseFloat(row.Prisca) || 0;
          }
        } else {
          // Lignes de profil standard
          const param = row.Item;
          if (param === 'Weight') {
            next.axel.weight = parseFloat(row.Axel);
            next.prisca.weight = parseFloat(row.Prisca);
          } else if (param === 'Height') {
            next.axel.height = parseFloat(row.Axel);
            next.prisca.height = parseFloat(row.Prisca);
          } else if (param === 'Age') {
            next.axel.age = parseFloat(row.Axel);
            next.prisca.age = parseFloat(row.Prisca);
          } else if (param === 'Deficit') {
            next.axel.deficit = parseFloat(row.Axel);
            next.prisca.deficit = parseFloat(row.Prisca);
          } else if (param === 'Opt_Galettes') {
            next.axel.opt_galettes = row.Axel === 'true';
            next.prisca.opt_galettes = row.Prisca === 'true';
          } else if (param === 'Opt_Fromage') {
            next.axel.opt_fromage = parseFloat(row.Axel);
            next.prisca.opt_fromage = parseFloat(row.Prisca);
          } else if (param === 'Opt_Fb_Soir') {
            next.axel.opt_fb_soir = row.Axel === 'true';
            next.prisca.opt_fb_soir = row.Prisca === 'true';
          } else if (param === 'Prot_Ratio') {
            next.axel.prot_ratio   = parseFloat(row.Axel)   || 1.8;
            next.prisca.prot_ratio = parseFloat(row.Prisca) || 1.2;
          } else if (param === 'SportMin') {
            // Migration ancien format : assigner toutes les minutes à muscu_pdc
            next.axel.activities.muscu_pdc = parseFloat(row.Axel) || 0;
            next.prisca.activities.muscu_pdc = parseFloat(row.Prisca) || 0;
          }
        }
      });

      return next;
    });
  }, [data]);

  // Sync localStorage
  useEffect(() => {
    localStorage.setItem('smart_diet_profiles_v2', JSON.stringify(profiles));
  }, [profiles]);

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
        <Route path="/calculator" element={<Calculator profiles={profiles} />} />
        <Route path="/smart-diet" element={<SmartDiet profiles={profiles} setProfiles={setProfiles} />} />
        <Route path="/recette" element={<BreadRecipe />} />
      </Routes>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        <p>Projet perso - Hébergé avec amour - Merci de ne pas casser le site (Toute réclamation sera ignorée ❤️)</p>
      </footer>
    </Router>
  );
};

export default App;
