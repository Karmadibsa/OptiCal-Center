# Scripts GitHub

## Utilisation avec GitHub CLI (Recommandé)

1. Installez GitHub CLI: https://cli.github.com/
2. Authentifiez-vous: `gh auth login`
3. Utilisez les commandes npm:

```bash
# Lister les issues
npm run issues:list

# Créer une issue
npm run issues:create

# Voir une issue spécifique
npm run issues:view -- <numéro>

# Fermer une issue
npm run issues:close -- <numéro>

# Workflow interactif
npm run issues:workflow
```

## Commandes directes avec gh

```bash
# Lister les issues
gh issue list

# Créer une issue
gh issue create

# Voir une issue
gh issue view <numéro>

# Créer une branche pour une issue
git checkout -b fix/issue-<numéro>

# Pousser la branche
git push -u origin fix/issue-<numéro>
```

## Anciens scripts (API manuelle)

Les scripts `fetch-issues.js`, `create-branch.js`, et `start-issue-workflow.js` utilisent l'API GitHub directement.
Ils nécessitent un token dans un fichier `.env`.

Pour les utiliser:
1. Créez un token sur https://github.com/settings/tokens (scope "repo")
2. Copiez `.env.example` en `.env` et remplissez les variables
3. Exécutez `npm run issues:fetch` (ancienne commande)

## Recommandation

Utilisez GitHub CLI (`gh`) pour une expérience plus simple et intégrée.
