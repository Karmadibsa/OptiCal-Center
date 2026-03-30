# Scripts GitHub CLI

## Commandes rapides (vous êtes déjà authentifié)

```bash
# Lister les issues (20 dernières)
npm run issues:list

# Créer une nouvelle issue
npm run issues:create

# Voir une issue spécifique
npm run issues:view -- 123

# Fermer une issue
npm run issues:close -- 123

# Workflow interactif
npm run issues:workflow

# Créer une branche (manuellement)
git checkout -b nom-branche
```

## Commandes directes `gh`

```bash
# Lister les issues
gh issue list

# Créer une issue (interactif)
gh issue create

# Voir une issue
gh issue view <numéro>

# Fermer une issue
gh issue close <numéro>

# Lister les branches
git branch -a

# Créer et pousser une branche
git checkout -b feature/xyz
git push -u origin feature/xyz
```

## Workflow recommandé

1. **Voir les issues existantes**
   ```bash
   npm run issues:list
   ```

2. **Travailler sur une issue**
   ```bash
   # Créer une branche
   git checkout -b fix/issue-<numéro>
   
   # Faire vos modifications
   git add .
   git commit -m "fix: résoudre l'issue #<numéro>"
   
   # Pousser
   git push -u origin fix/issue-<numéro>
   ```

3. **Créer une Pull Request**
   ```bash
   gh pr create --fill
   ```

4. **Fermer l'issue après merge**
   ```bash
   gh issue close <numéro>
   ```

## Notes

- Vous êtes déjà connecté avec `gh auth login`
- Les anciens scripts API (`fetch-issues.js`, etc.) sont conservés mais non nécessaires
- Utilisez `gh` pour une intégration GitHub optimale
