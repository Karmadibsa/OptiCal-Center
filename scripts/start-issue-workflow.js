#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Démarrage du workflow de gestion des issues GitHub...\n');

try {
    // 1. Récupérer les issues
    console.log('📡 Étape 1: Récupération des issues ouvertes...');
    execSync('npm run issues:fetch', { stdio: 'inherit' });
    
    console.log('\n---\n');
    
    // 2. Demander si on veut créer une branche
    const readline = (await import('readline')).createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const question = (query) => new Promise((resolve) => readline.question(query, resolve));
    
    const createBranch = await question('🌿 Voulez-vous créer une nouvelle branche pour travailler sur une issue ? (o/N): ');
    
    if (createBranch.toLowerCase() === 'o' || createBranch.toLowerCase() === 'oui') {
        console.log('\n🌱 Lancement de la création de branche...');
        execSync('npm run issues:create-branch', { stdio: 'inherit' });
    } else {
        console.log('\nℹ️  Vous pouvez créer une branche plus tard avec: npm run issues:create-branch');
    }
    
    // 3. Afficher les commandes utiles
    console.log('\n📋 Commandes disponibles:');
    console.log('   npm run issues:fetch      - Récupérer les issues GitHub');
    console.log('   npm run issues:create-branch - Créer une nouvelle branche');
    console.log('   git status                - Voir l\'état du dépôt');
    console.log('   git branch                - Lister les branches');
    
    readline.close();
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}
