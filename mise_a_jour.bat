@echo off
:: Récupération de la date au format JJ/MM/AAAA
set current_date=%date%

echo --- Debut de l'automatisation Git ---

:: Etape 1 : Indexation des fichiers
git add .

:: Etape 2 : Commit avec la date du jour
git commit -m "mise a jour %current_date%"

:: Etape 3 : Envoi vers le dépôt distant
git push

echo --- Mise a jour terminee ! ---
pause