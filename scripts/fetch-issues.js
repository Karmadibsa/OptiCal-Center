#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'votre-username';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'votre-repo';

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN non défini. Créez un fichier .env avec GITHUB_TOKEN=votre_token');
    console.log('💡 Vous pouvez créer un token sur https://github.com/settings/tokens (scope "repo")');
    process.exit(1);
}

const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;

async function fetchIssues() {
    try {
        console.log(`📡 Récupération des issues depuis ${REPO_OWNER}/${REPO_NAME}...`);
        
        const response = await axios.get(API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            params: {
                state: 'open',
                per_page: 50,
                sort: 'created',
                direction: 'desc'
            }
        });

        const issues = response.data;
        
        console.log(`✅ ${issues.length} issue(s) ouverte(s) trouvée(s):\n`);
        
        issues.forEach((issue, index) => {
            console.log(`🔸 #${issue.number}: ${issue.title}`);
            console.log(`   📌 État: ${issue.state} | 👤 ${issue.user?.login || 'Inconnu'}`);
            console.log(`   🏷️  Labels: ${issue.labels.map(l => l.name).join(', ') || 'Aucun'}`);
            console.log(`   🔗 URL: ${issue.html_url}`);
            console.log(`   📅 Créé: ${new Date(issue.created_at).toLocaleDateString('fr-FR')}`);
            console.log('');
        });

        // Sauvegarder dans un fichier JSON pour référence
        const outputPath = path.join(__dirname, '..', 'github-issues.json');
        fs.writeFileSync(outputPath, JSON.stringify(issues, null, 2));
        console.log(`💾 Issues sauvegardées dans ${outputPath}`);

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des issues:');
        if (error.response) {
            console.error(`   Code: ${error.response.status}`);
            console.error(`   Message: ${error.response.data?.message || 'Inconnu'}`);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

fetchIssues();
