#!/usr/bin/env node

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('🚀 Workflow GitHub CLI pour les issues\n');

    try {
        // Vérifier si gh est installé
        execSync('gh --version', { stdio: 'ignore' });
    } catch (error) {
        console.error('❌ GitHub CLI (gh) n\'est pas installé.');
        console.log('📦 Installez-le depuis: https://cli.github.com/');
        console.log('   Ou via winget: winget install --id GitHub.cli');
        console.log('   Ou via scoop: scoop install gh');
        rl.close();
        process.exit(1);
    }

    // Vérifier si on est authentifié
    try {
        execSync('gh auth status', { stdio: 'ignore' });
    } catch (error) {
        console.log('🔐 Vous n\'êtes pas authentifié avec GitHub CLI.');
        console.log('   Exécutez: gh auth login');
        rl.close();
        process.exit(1);
    }

    // Lister les issues
    console.log('📋 Liste des issues ouvertes:');
    try {
        execSync('gh issue list --limit 10', { stdio: 'inherit' });
    } catch (error) {
        console.log('⚠️  Aucune issue ou erreur lors de la récupération.');
    }

    console.log('\n---\n');

    // Menu
    console.log('Que souhaitez-vous faire ?');
    console.log('1. Créer une nouvelle issue');
    console.log('2. Voir une issue spécifique');
    console.log('3. Créer une branche pour une issue');
    console.log('4. Fermer une issue');
    console.log('5. Quitter');

    const choice = await question('\nVotre choix (1-5): ');

    switch (choice.trim()) {
        case '1':
            console.log('\n📝 Création d\'une nouvelle issue...');
            execSync('gh issue create', { stdio: 'inherit' });
            break;
        case '2':
            const issueNumber = await question('Numéro de l\'issue: ');
            execSync(`gh issue view ${issueNumber}`, { stdio: 'inherit' });
            break;
        case '3':
            const branchIssue = await question('Numéro de l\'issue pour la branche: ');
            const branchName = await question(`Nom de la branche (ex: fix/issue-${branchIssue}): `);
            if (!branchName.trim()) {
                console.log('❌ Le nom de la branche est requis.');
                break;
            }
            console.log(`🌱 Création de la branche "${branchName}"...`);
            execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
            console.log(`✅ Branche créée. Pour pousser: git push -u origin ${branchName}`);
            break;
        case '4':
            const closeIssue = await question('Numéro de l\'issue à fermer: ');
            execSync(`gh issue close ${closeIssue}`, { stdio: 'inherit' });
            break;
        case '5':
            console.log('👋 Au revoir !');
            break;
        default:
            console.log('❌ Choix invalide.');
    }

    rl.close();
}

main().catch(error => {
    console.error('❌ Erreur:', error.message);
    rl.close();
    process.exit(1);
});
