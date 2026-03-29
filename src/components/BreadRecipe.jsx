import React from 'react';
import { Utensils, Clock, AlertCircle } from 'lucide-react';

const Section = ({ title, children }) => (
    <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#0ea5e9', fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', marginBottom: '1rem', textTransform: 'uppercase' }}>
            {title}
        </h3>
        {children}
    </div>
);

const Ingredient = ({ label, amount, note }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{label}</span>
        <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{amount}</span>
            {note && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{note}</div>}
        </div>
    </div>
);

const Step = ({ num, title, desc }) => (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{
            flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(14,165,233,0.2)', border: '1px solid #0ea5e9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem'
        }}>
            {num}
        </div>
        <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.3rem' }}>{title}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</div>
        </div>
    </div>
);

const BreadRecipe = () => {
    return (
        <div className="animate-fade-in section-container">
            <h2><Utensils className="icon-mr" /> Pain de Campagne Rustique (V2)</h2>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                {[
                    { label: '1,5 kg', color: '#10b981' },
                    { label: 'Pain Complet', color: '#0ea5e9' },
                    { label: 'Mie élastique', color: '#8b5cf6' },
                    { label: 'Croûte typée', color: '#f59e0b' },
                ].map(b => (
                    <span key={b.label} style={{
                        padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem',
                        fontWeight: 700, border: `1px solid ${b.color}`,
                        color: b.color, background: `${b.color}20`
                    }}>{b.label}</span>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* INGRÉDIENTS */}
                <div className="card">
                    <Section title="Phase Liquide (en premier)">
                        <Ingredient label="Eau tiède" amount="650 ml" note="Favorise l'hydratation des fibres" />
                        <Ingredient label="Jus de citron (ou vinaigre)" amount="1 c. à soupe" note="Renforce le réseau de gluten" />
                        <Ingredient label="Huile végétale" amount="1 c. à soupe" note="Souplesse et conservation" />
                        <Ingredient label="Miel" amount="1 c. à café rase" note="Activateur de fermentation" />
                    </Section>

                    <Section title="Phase Sèche">
                        <Ingredient label="Farine T65 (blanche)" amount="500 g" />
                        <Ingredient label="Farine T110 ou T150 (complète)" amount="500 g" />
                        <Ingredient label="Sel fin" amount="3 c. à café" note="Dans un coin de la cuve, loin de la levure" />
                        <Ingredient label="Mélange de graines" amount="À convenance" />
                    </Section>

                    <Section title="Agent Levant">
                        <Ingredient label="Levure déshydratée" amount="2 sachets" note="Dans un puits au centre, sans contact avec les liquides" />
                    </Section>
                </div>

                {/* PROTOCOLE */}
                <div className="card">
                    <Section title="Protocole de fabrication">
                        <Step
                            num={1}
                            title="Préparation de la cuve"
                            desc="Versez l'ensemble des liquides en premier. Le citron est crucial : il abaisse le pH et rend la mie moins friable, proche d'un pain au levain."
                        />
                        <Step
                            num={2}
                            title="Mise en place des solides"
                            desc="Recouvrez les liquides avec les deux farines. Ajoutez le sel dans un coin et les graines par-dessus."
                        />
                        <Step
                            num={3}
                            title="Ensemencement de la levure"
                            desc="Creusez un léger puits dans la farine pour y déposer la levure. Elle doit rester au sec jusqu'au démarrage du cycle."
                        />
                        <Step
                            num={4}
                            title="Réglages machine"
                            desc='Sélectionnez "Pain Complet" (programme 3 ou 4). Poids : 1,5 kg. Dorure : Moyenne ou Foncée pour un aspect rustique.'
                        />
                    </Section>

                    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                        <AlertCircle size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '0.85rem', color: '#fcd34d', lineHeight: 1.6 }}>
                            <strong>Astuce :</strong> Le jus de citron remplace avantageusement un levain maison — il améliore la texture sans complexifier le protocole. Résultat optimal avec un ratio 50/50 T65/T110.
                        </div>
                    </div>
                </div>
            </div>

            {/* Macros estimées */}
            <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ color: '#10b981', marginBottom: '1rem', fontSize: '1rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Valeurs Nutritionnelles Estimées (pour 100g)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                    {[
                        { label: 'Calories', value: '~240 kcal' },
                        { label: 'Glucides', value: '~45g' },
                        { label: 'Protéines', value: '~9g' },
                        { label: 'Lipides', value: '~2g' },
                        { label: 'Fibres', value: '~5g' },
                    ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{m.label}</div>
                            <div style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .bread-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default BreadRecipe;
