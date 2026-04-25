import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Papa from 'papaparse';

import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Calculator from './components/Calculator';
import SmartDiet from './components/SmartDiet';
import DietSummary from './components/DietSummary';
import ExternalMeal from './components/ExternalMeal';
import RecipeIdeas from './components/RecipeIdeas';
import BatchCooking from './components/BatchCooking';
import { DEFAULT_PROFILES } from './utils/dietAlgo';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem('smart_diet_profiles_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration : garantit que prot_ratio existe même pour les anciens localStorage (avec goal)
      const axelRatio   = parsed.axel?.prot_ratio   ?? (parsed.axel?.goal === 'sante' ? 1.2 : 1.6);
      const priscaRatio = parsed.prisca?.prot_ratio ?? (parsed.prisca?.goal === 'sante' ? 1.2 : 1.6);
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
        axel:   { ...prev.axel },
        prisca: { ...prev.prisca },
      };

      configRows.forEach(row => {
        const param = row.Item;
        if (row.Section === 'Sport') {
          // PAL (Physical Activity Level) — remplace l'ancien système MET
          if (param === 'PAL') {
            const validPAL = [1.2, 1.375, 1.55, 1.725];
            const palA = parseFloat(row.Axel);
            const palP = parseFloat(row.Prisca);
            next.axel.pal   = validPAL.includes(palA) ? palA : 1.375;
            next.prisca.pal = validPAL.includes(palP) ? palP : 1.375;
          }
        } else {
          // Lignes de profil standard
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
          } else if (param === 'Opt_Fromage') {
            next.axel.opt_fromage = parseFloat(row.Axel);
            next.prisca.opt_fromage = parseFloat(row.Prisca);
          } else if (param === 'Opt_Fb_Soir') {
            next.axel.opt_fb_soir = row.Axel === 'true';
            next.prisca.opt_fb_soir = row.Prisca === 'true';
          } else if (param === 'Prot_Ratio') {
            next.axel.prot_ratio   = parseFloat(row.Axel)   || 1.6;
            next.prisca.prot_ratio = parseFloat(row.Prisca) || 1.6;
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
        <Route path="/diet-summary" element={<DietSummary profiles={profiles} data={data} />} />
        <Route path="/external-meal" element={<ExternalMeal profiles={profiles} />} />
        <Route path="/recipes" element={<RecipeIdeas profiles={profiles} />} />
        <Route path="/batch-cooking" element={<BatchCooking profiles={profiles} />} />
      </Routes>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        <p>Projet perso - Hébergé avec amour - Merci de ne pas casser le site (Toute réclamation sera ignorée ❤️)</p>
      </footer>
    </Router>
  );
};

export default App;
