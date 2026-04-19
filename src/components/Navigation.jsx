import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calculator, Salad, ClipboardList, UtensilsCrossed, BookMarked, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
    { to: '/',              label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/calculator',   label: 'Calculateur',  icon: Calculator },
    { to: '/smart-diet',   label: 'Macro Plan',   icon: Salad },
    { to: '/diet-summary', label: 'Récap Diéto',  icon: ClipboardList },
    { to: '/external-meal',label: 'Repas Ext.',   icon: UtensilsCrossed },
    { to: '/recipes',      label: 'Idées Recettes', icon: BookMarked },
];

const Navigation = () => {
    const [open, setOpen] = useState(false);

    return (
        <nav className="nav-bar">
            {/* Desktop : affichage horizontal normal */}
            <div className="nav-desktop">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={15} style={{ flexShrink: 0 }} />
                        {label}
                    </NavLink>
                ))}
            </div>

            {/* Mobile : hamburger + menu déroulant */}
            <div className="nav-mobile">
                <button
                    className="nav-hamburger"
                    onClick={() => setOpen(o => !o)}
                    aria-label="Menu"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                    <span>Menu</span>
                </button>

                {open && (
                    <div className="nav-dropdown">
                        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === '/'}
                                className={({ isActive }) => `nav-dropdown-link ${isActive ? 'active' : ''}`}
                                onClick={() => setOpen(false)}
                            >
                                <Icon size={18} />
                                {label}
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navigation;
