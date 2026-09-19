# Drapeaux du monde

Quiz de révision : drapeau → pays, pays → capitale, capitale → pays, et anciens drapeaux.
Application 100 % statique (HTML, CSS, JS), sans build ni dépendance.

## Héberger gratuitement sur GitHub Pages

1. Crée un dépôt GitHub (ex. `drapeaux`) et envoie-y ces fichiers **à la racine** :
   `index.html`, `style.css`, `data.js`, `logic.js`, `app.js`.
2. Dépôt → **Settings** → **Pages**.
3. *Source* : **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis **Save**.
4. Au bout d'une minute, le site est en ligne sur `https://TON-PSEUDO.github.io/drapeaux/`.

Tu peux aussi double-cliquer sur `index.html` pour l'utiliser en local.

## Modifier le contenu

- Pays, capitales, alias acceptés et anciens drapeaux : `data.js`.
- Règles de tolérance (accents, tirets, fautes de frappe) : `logic.js`.
- Couleurs et typographie : variables en haut de `style.css`.

## Sources des images

- Drapeaux actuels : flagcdn.com.
- Anciens drapeaux : Wikimedia Commons (nom de fichier dans `data.js`, champ `files`).
  Si un fichier est introuvable, la question est sautée automatiquement.
