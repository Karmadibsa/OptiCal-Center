import React from 'react';
import {
    Utensils,
    Dumbbell,
    Clock,
    AlertCircle,
    Download,
    Droplets
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = ({ csvData }) => {

    const organizeData = (type) => {
        if (!csvData.length) return {};
        return csvData
            .filter(item => item.Type === type)
            .reduce((acc, item) => {
                if (!acc[item.Section]) acc[item.Section] = [];
                acc[item.Section].push(item);
                return acc;
            }, {});
    };

    const dietData = organizeData('Diet');
    const supplementData = organizeData('Supplement');
    const infoData = organizeData('Info');

    const exportPDF = () => {
        try {
            // Portrait mode requested
            const doc = new jsPDF('p', 'mm', 'a4');

            // Helper to convert Raw to Cooked for PDF
            const convertToCooked = (valStr, item) => {
                if (!valStr || !item) return valStr;

                // Detect item type for specific ratios
                let ratio = 3; // Default (Riz standard)
                if (/Pâtes|PST/i.test(item)) ratio = 2.5;
                if (/Riz/i.test(item)) ratio = 3;

                // Only convert if marked as 'cru'
                const needsConversion = /Riz|Pâtes|PST/i.test(item) && /cru/i.test(item);
                if (!needsConversion) return valStr;

                // Try to parse numbers and ranges (e.g. 92-100)
                return valStr.replace(/(\d+)/g, (match) => {
                    return Math.round(parseFloat(match) * ratio);
                });
            };

            const formatItemName = (item) => {
                return item.replace(/\(cru\)/i, '(cuit)');
            };

            // Helper for Grouped Body
            const generateGroupedBody = (dataSource, isDiet) => {
                const body = [];
                Object.entries(dataSource).forEach(([section, items]) => {
                    body.push([{
                        content: section.toUpperCase(),
                        colSpan: 3,
                        styles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'center' }
                    }]);

                    items.forEach(item => {
                        let userValAxel = item.Axel;
                        let userValPrisca = item.Prisca;
                        let itemName = item.Item;

                        // Apply conversions only for Diet
                        if (isDiet) {
                            userValAxel = convertToCooked(item.Axel, item.Item);
                            userValPrisca = convertToCooked(item.Prisca, item.Item);
                            itemName = formatItemName(item.Item);
                        }

                        body.push([
                            itemName,
                            { content: userValAxel, styles: { fontStyle: 'bold', textColor: [56, 189, 248] } },
                            { content: userValPrisca, styles: { fontStyle: 'bold', textColor: [129, 140, 248] } }
                        ]);
                    });
                });
                return body;
            };

            // -- 1. ALIMENTATION (POIDS CUIT) --
            // No main header

            autoTable(doc, {
                startY: 15, // High start
                head: [['ALIMENT', 'AXEL', 'PRISCA']],
                body: generateGroupedBody(dietData, true),
                theme: 'striped', // Alternating colors
                styles: {
                    fontSize: 12, // Bumped to 12
                    cellPadding: 4,
                    textColor: [30, 41, 59],
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: 255,
                    halign: 'center',
                    fontStyle: 'bold',
                    fontSize: 13
                },
                alternateRowStyles: {
                    fillColor: [225, 225, 225] // Darker gray for meaningful contrast
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' }, // Aliments Left
                    1: { halign: 'center', textColor: [56, 189, 248] }, // Axel Center
                    2: { halign: 'center', textColor: [129, 140, 248] }  // Prisca Center
                },
                margin: { left: 14, right: 14 },
                tableWidth: 'auto' // Fill page width
            });

            // -- FORCE NEW PAGE FOR SUPPLEMENTS --
            doc.addPage('a4', 'p');

            // -- PAGE 2: SUPPLEMENTS --
            // No header

            autoTable(doc, {
                startY: 15,
                head: [['PRODUIT', 'AXEL', 'PRISCA']],
                body: generateGroupedBody(supplementData, false),
                theme: 'striped',
                styles: {
                    fontSize: 12, // Bumped to 12
                    cellPadding: 4,
                    textColor: [30, 41, 59],
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: 255,
                    halign: 'center',
                    fontStyle: 'bold',
                    fontSize: 13
                },
                alternateRowStyles: {
                    fillColor: [225, 225, 225]
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold' },
                    1: { halign: 'center', textColor: [56, 189, 248] },
                    2: { halign: 'center', textColor: [129, 140, 248] }
                },
                margin: { left: 14, right: 14 },
                tableWidth: 'auto'
            });

            doc.save('Roadmap_Frigo_Compact.pdf');
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Erreur export PDF");
        }
    };

    return (
        <div className="animate-fade-in">

            <div className="action-bar">
                <button onClick={exportPDF} className="btn">
                    <Download size={18} />
                    Télécharger PDF (Clean)
                </button>
            </div>

            {/* DIET */}
            <section className="section-container">
                <h2><Utensils className="icon-mr" /> Alimentation</h2>
                <div className="card-grid">
                    {Object.entries(dietData).map(([time, items]) => (
                        <div key={time} className="card">
                            <div className="time-badge"><Clock size={12} style={{ marginRight: 5 }} /> {time}</div>

                            {items.map((item, idx) => (
                                <div key={idx} className="item-block">
                                    <div className="item-name">{item.Item}</div>
                                    <div className="item-values">
                                        <div className="val-row">
                                            <span className="label-axel">AXEL</span>
                                            <span className="val-text">{item.Axel}</span>
                                        </div>
                                        {item.Prisca && (
                                            <div className="val-row">
                                                <span className="label-prisca">PRISCA</span>
                                                <span className="val-text">{item.Prisca}</span>
                                            </div>
                                        )}
                                    </div>
                                    {item.Note && <div className="note"><AlertCircle size={14} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} />{item.Note}</div>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            {/* SUPPLEMENTS */}
            <section className="section-container" style={{ marginTop: '3rem' }}>
                <h2><Dumbbell className="icon-mr" /> Compléments & Timing</h2>
                <div className="card-grid">
                    {Object.entries(supplementData).map(([time, items]) => (
                        <div key={time} className="card">
                            <div className="time-badge"><Clock size={12} style={{ marginRight: 5 }} /> {time}</div>
                            {items.map((item, idx) => (
                                <div key={idx} className="item-block">
                                    <div className="item-name">{item.Item}</div>
                                    <div className="item-values">
                                        <div className="val-row">
                                            <span className="label-axel">AXEL</span>
                                            <span className="val-text">{item.Axel}</span>
                                        </div>
                                        <div className="val-row">
                                            <span className="label-prisca">PRISCA</span>
                                            <span className="val-text">{item.Prisca}</span>
                                        </div>
                                    </div>
                                    {item.Note && <div className="note" style={{ background: 'rgba(255,255,255,0.05)', color: '#ccc', borderLeft: '3px solid #ccc' }}>{item.Note}</div>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            {/* INFO */}
            <section className="section-container" style={{ marginTop: '3rem' }}>
                <h2><AlertCircle className="icon-mr" /> Rappels</h2>
                <div className="card-grid">
                    {infoData['Rappel'] && infoData['Rappel'].map((item, idx) => (
                        <div key={idx} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div>{item.Item === 'Eau' ? <Droplets size={32} color="#38bdf8" /> : <AlertCircle size={32} color="#fbbf24" />}</div>
                            <div>
                                <div className="item-name">{item.Item}</div>
                                <div style={{ color: '#94a3b8' }}>{item.Axel}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
