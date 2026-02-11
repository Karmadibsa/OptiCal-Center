import React from 'react';
import { NavLink } from 'react-router-dom';

const Navigation = () => {
    return (
        <nav className="nav-bar">
            <NavLink
                to="/"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
                Dashboard
            </NavLink>
            <NavLink
                to="/calculator"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
                Calculateur
            </NavLink>
            <NavLink
                to="/smart-diet"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
                Macro Plan
            </NavLink>
        </nav>
    );
};

export default Navigation;
