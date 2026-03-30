#!/usr/bin/env node

import simpleGit from 'simple-git';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'votre-username';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'votre-repo';

if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN non défini. Créez un fichier .env avec GITHUB_TOKEN=votre_token');
    process.exit(1);
}

const git = simpleGit();

async function createBranch() {
    try {
        // Vérifier si on est dans un dépôt git
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            console.error('❌ Ce répertoire n\'est pas un dépôt Git.');
            process.exit(1);
        }

        // Demander le nom de la branche
        const readline = (await import('readline')).createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query) => new Promise((resolve) => readline.question(query, resolve));

        const branchName = await question('🌿 Nom de la nouvelle branche (ex: fix/issue-123): ');
        
        if (!branchName.trim()) {
            console.error('❌ Le nom de la branche ne peut pas être vide.');
            readline.close();
            process.exit(1);
        }

        // Créer la branche localement
        console.log(`🌱 Création de la branche "${branchName}"...`);
        await git.checkoutLocalBranch(branchName);
        
        // Pousser la branche sur GitHub
        console.log(`🚀 Poussage de la branche sur GitHub...`);
        await git.push('origin', branchName);
        
        console.log(`✅ Branche "${branchName}" créée et poussée avec succès !`);
        
        // Optionnel : créer une issue associée
        const createIssue = await question('📝 Créer une issue associée ? (o/N): ');
        
        if (createIssue.toLowerCase() === 'o' || createIssue.toLowerCase() === 'oui') {
            const issueTitle = await question('   Titre de l\'issue: ');
            const issueBody = await question('   Description de l\'issue: ');
            
            await createGitHubIssue(issueTitle, issueBody, branchName);
        }
        
        readline.close();
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la branche:');
        console.error(error.message);
        process.exit(1);
    }
}

async function createGitHubIssue(title, body, branchName) {
    try {
        const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`;
        
        const response = await axios.post(API_URL, {
            title,
            body: `${body}\n\n**Branche associée:** ${branchName}`,
            labels: ['enhancement']
        }, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        console.log(`✅ Issue #${response.data.number} créée: ${response.data.html_url}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'issue:');
        console.error(error.response?.data?.message || error.message);
    }
}

createBranch();
