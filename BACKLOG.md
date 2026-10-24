# Backlog OpenVibe

Ce qui est reporté. La spec en cours est `docs/superpowers/specs/2026-10-24-openvibe-habillage-et-flotte-design.md` (habillage Symvibe et flotte d'agents). Les références « vidéo » renvoient aux démos de Symvibe analysées le 2026-10-24.

## Fonctionnalités inspirées de Symvibe

### Widgets du canvas (remplacent les nœuds Note, Kanban et Git Watcher de la spec V1)

- **Kanban « Board »** : colonnes éditables avec compteur et menu, état vide, ajout de colonne ; fenêtre « Nouvelle carte » (titre, notes, échéance Aujourd'hui / Demain / Semaine prochaine ou date, priorité Aucune / Basse / Moyenne / Haute) ; cartes avec barre de priorité et puces ; glisser entre colonnes ; glisser une carte vers un terminal (spec V1 §6.9). Vidéo : node-kanban.
- **Calendrier** : grille mensuelle, aujourd'hui en orange, Nouveau / Aujourd'hui / navigation, fenêtre d'événement (date, journée entière, 6 couleurs, notes), glisser un événement d'un jour à l'autre. Vidéo : node-kanban.
- **Checklist d'objectifs** : état vide « Aucun objectif », « Ajouter un objectif ». Vidéo : node-kanban.
- **Post-it** : papier ligné ocre, coin corné, police manuscrite, panneau PAPIER (9 couleurs, ordre, dupliquer, supprimer) ; remplace le nœud Note. Vidéo : node-kanban.
- **Tuile web** : dessinée à la souris ; onglets, navigation, barre d'adresse ; lanceur « Ouvrir une page » avec détection des ports localhost actifs (:3000, :5173…) et accès rapide ; préréglages d'écran et de téléphone ; pas d'inspecteur par tuile sous WebView2. Vidéo : node-webtiles.
- **Icônes cloud** (spec V1 §7) : import des packs officiels AWS, Azure, GCP, recherche et insertion ; migration ultérieure pour les tables `icon_packs` et `icons`.

### Git

- **Fenêtre git** depuis la puce de branche : liste des changements avec cases, statut, +/−, annuler un fichier ; message de commit (avec génération par un agent) ; « Commit & Push N fichiers » avec états Lecture → Commit → Push → arbre propre ; historique (hash, auteur, date). Vidéo : node-git.
- Diff d'un fichier au clic (reprend le Git Watcher de la spec V1 §6.8).

### Studios (modales ouvertes depuis le rail droit)

- **Code** : arbre du dépôt, éditeur coloré (CodeMirror), Enregistrer, « Insérer » qui pose un nœud fichier sur le canvas. Vidéo : studio-code.
- **Markdown** : arbre `docs/`, vues Lecture / Source / Graphe de liens, « Ajouter au board », export PDF ; nœud avec « Ouvrir dans le studio ». Vidéo : studio-markdown.
- **Documents** : document rédigé par un agent CLI (modèle, effort Rapide / Équilibré / Approfondi, flux en direct, Stop), rendu « papier », export PDF. Vidéo : studio-documents.
- **Diagrammes** : l'agent dessine des éléments Excalidraw natifs (modèle, style Encre / Coloré, presets « Architecture », « Flux de données »…, prompt, formes de départ). Vidéo : studio-diagrams.

### Automatisation

- **Boucles** : consignes récurrentes (planning, agent devenu inactif, sortie contenant un texte), cibles, conditions d'arrêt (nombre, durée, objectif atteint par commande ou agent juge), arrière-plan, modèles (Point d'avancement, Relance, Sauvetage de build, Surveillance des tests, Commit régulier, Revue, Standup). Vidéo : node-loops.
- **Mémoire** : faits par dépôt ou globaux (Architecture, Structure, Commandes, Conventions, Pièges, Contexte), scan du dépôt par un agent jetable avec revue, éditeur, carte mémoire posée sur le board et poussée aux consoles reliées. Vidéo : node-memory.
- **Carte de mission** : arbre Orchestrateur → Équipe → consoles, filtres par état, recherche, inspecteur (aller à la console, pause, fermer, cadrer l'équipe). Vidéo : teams.
- **Presets d'équipes** : déployer une topologie complète (plusieurs groupes, orchestrateur, tuile web), ex. « Dev HQ ». Vidéo : voice.
- **Menu Outils** (mallette de la barre du haut) regroupant ces entrées.

### Comptes et quotas

- **Usage** : jauge de la session Claude, limites hebdomadaires, heure de réinitialisation dans la barre du haut, carte d'activité, statistiques. Vidéo : node-usage.
- **Tokens** : lecture des logs locaux de Claude et Codex, graphe sur 30 jours, détail par agent. Vidéo : node-usage.
- **Comptes** : profils Claude (CLAUDE_CONFIG_DIR par profil), « Utiliser », connexion dans un terminal, puce de compte dans l'en-tête des terminaux. Vidéo : node-accounts.

### Voix et directeur IA

- Maintenir Espace pour parler (reconnaissance locale, Whisper ou équivalent : WebView2 n'en fournit pas hors ligne), forme d'onde, « J'écoute » / « Je réfléchis ».
- Directeur IA : interprète la demande et agit sur le canvas (créer des groupes, relier un orchestrateur, déployer un preset, fermer avec confirmation), fil de discussion dépliable avec lignes « Plan ». Vidéo : voice.

### Interface

- Thème clair.
- Halo lumineux et impulsion animée sur les liaisons, poignées de sélection rondes (couche décorative ou patch d'Excalidraw).
- Replier un groupe sur son étiquette.
- Réglages complets (agent par défaut, seuil d'activité, raccourcis), réordonner les onglets par glisser (`reorder_workspaces`).
- Gemini CLI : états précis par ses hooks (BeforeAgent, AfterAgent, Notification).

## Points mineurs reportés du plan 2

- Un rattachement raté devrait revenir à l'écran sauvegardé (`restoreSession`) et retirer le nœud des sessions vivantes à `pty-exit` ; le recalage avant rattachement marque le terminal comme actif.
- Les échecs de sauvegarde différée sont des rejets non gérés (aucun toast).
- Le sauvegardeur périodique (10 s) peut écraser l'historique final d'un terminal avec un instantané plus ancien.
- Un `pty-exit` tardif d'un ancien processus peut marquer un terminal relancé comme terminé (ajouter le pid à l'événement).
- Un mutex de base empoisonné après une panique désactive la persistance pour la session.
- `tauri-plugin-log` (logs Rust dans un fichier).
- CSP de la webview à `null` : à corriger avant d'afficher du contenu externe (tuile web, studios).
- Noms de workspace en double autorisés.

## Constats du plan A (relecture finale)

- Les agents lancés depuis un OpenVibe démarré dans une session Claude Code héritent de son marqueur de session enfant (`CLAUDE_CODE_CHILD_SESSION`…) : Claude n'enregistre pas les conversations et « Reprendre » échoue. Retirer ces marqueurs de l'environnement des terminaux (la spec V1 dit que les terminaux héritent de l'environnement).
- `restoreSession` ne pose pas la garde `replaying` : une relance pendant la restauration d'un long écran peut envoyer au nouveau processus les réponses de xterm aux anciennes requêtes.
- `list_projects` teste l'existence des dossiers en tenant le verrou de la base (un lecteur réseau hors ligne bloquerait toutes les commandes).
- Restes de « Terminal introuvable » : copie d'un terminal dont la source n'est plus en mémoire ; copie pendant son adoption ; une image « ARRÊTÉ » avant le montage d'un nouveau terminal.
- La couleur de sélection passe par le filtre sombre (≈ `#ea6b40` au lieu de `#f4602e`).
- Les modes zen et lecture (Alt+Z, Alt+R) n'ont plus de bouton de sortie visible.
- Carte d'un projet introuvable : « Renommer » reste proposé ; la confirmation de suppression d'un workspace donne un nombre d'agents, pas leur liste ; le bouton Formes ne garde pas la dernière forme comme outil.
- Le sélecteur de projet rouvre le projet déjà actif, sans gestion d'erreur.
- « Nouvelle console » lance un Shell si on clique avant que la liste des agents soit chargée.
- Ouvrir le menu Stylo réécrit la couleur et l'épaisseur courantes partagées avec les formes.
- Les prénoms des terminaux fermés (encore en mémoire pour Ctrl+Z) ne sont réutilisés qu'au redémarrage.
- Sauvegarde automatique de la base (`openvibe.vN-backup.db`) avant chaque migration (à faire avec la migration du plan B).

## Constats du plan B1 (groupes, relecture finale)

- Après une action dans nos menus ou puces (Dégrouper, Fermer le groupe, Lancer 4…), les raccourcis d'Excalidraw (Ctrl+Z en tête) ne répondent qu'après un clic sur le canvas : Excalidraw n'écoute le clavier que dans son conteneur (`handleKeyboardGlobally` désactivé). Piste : rendre le focus au conteneur d'Excalidraw après nos actions (le mode global ferait agir Suppr tapé dans nos menus sur la sélection).
- Ctrl+D ou copier-coller d'un groupe entier garde son panthéon : deux groupes partagent alors les mêmes prénoms ; la première copie adoptée dans un cadre dupliqué prend un prénom hors groupe.
- Un agent ajouté hors de la vue (Ajouter un agent ou Dupliquer vers une nouvelle ligne ou colonne) ne s'affiche ni ne démarre avant qu'on fasse défiler jusqu'à lui (Excalidraw ne monte un nœud qu'une fois visible) : faire défiler la vue vers lui.
- Seul le nom natif sert de poignée : saisir l'étiquette par ses compteurs ou son vide lance une sélection au lasso.
- Les identifiants de cadres ne passent pas par `CSS.escape` dans les règles de transparence injectées.
- Les terminaux arrêtés avant la mise à jour de la netteté rejouent une fois leur ancien écran dans une grille plus étroite (cellule de base de 8 px arrondie, contre 7 px avec FitAddon) : affichage brouillé jusqu'à la relance.
- Entrée dans le champ nom de « Composer un groupe » ne lance pas le groupe.
- Aucune limite d'erreur React : une erreur de rendu efface toute l'interface jusqu'au rechargement.
- Développement : modifier `Canvas.tsx` pendant que l'application tourne fait remonter `LoadedCanvas` avec sa scène d'origine (Fast Refresh), qui est alors enregistrée par-dessus la scène courante (nœuds purgés) ; l'observateur de Vite manque parfois des modifications rapprochées (toucher le fichier).
