# 🐱 Cat Bracket - Tournoi de GIFs de Chats

![Cat GIF](https://media.giphy.com/media/BzyTuYCmvSORqs1ABM/giphy.gif)

## À propos du projet

**Cat Bracket** est une application web interactive permettant d'organiser un tournoi à élimination directe pour déterminer le meilleur GIF de chat ! Ce projet utilise React pour le frontend et Firebase pour la persistance des données, permettant à plusieurs utilisateurs de voter et de suivre les résultats en temps réel.

## ✨ Fonctionnalités

- **Système de bracket complet** : Organise automatiquement les GIFs en matchs à élimination directe
- **Multi-utilisateurs** : Permet à 3 utilisateurs (Mastiche, Robiche et Yoyo) de voter indépendamment
- **Progression par tour** : Les GIFs gagnants avancent automatiquement au tour suivant
- **Suivi des scores** : Système de points pour évaluer la popularité de chaque GIF
- **Visualisation des résultats** : Affichage du classement et des matchs en cours
- **Interface intuitive** : Simple à utiliser, même pour les non-initiés

## 🔧 Technologies utilisées

- **React** : Pour l'interface utilisateur interactive
- **Firebase Firestore** : Pour stocker les données du tournoi et les votes
- **React Router** : Pour la navigation entre les différentes vues
- **Vercel** : Pour le déploiement et l'hébergement

## 🚀 Démarrage rapide

### Pour les utilisateurs
1. Accédez à l'application déployée sur [cat-bracket.vercel.app](https://cat-bracket.vercel.app)
2. Sélectionnez votre nom d'utilisateur (Mastiche, Robiche ou Yoyo)
3. Votez pour vos GIFs préférés dans chaque match
4. Consultez les résultats et suivez la progression du tournoi !

### Pour les développeurs
1. Clonez ce dépôt
   ```bash
   git clone https://github.com/pageyohan/cat-bracket.git
   cd cat-bracket
   ```

2. Installez les dépendances
   ```bash
   npm install
   ```

3. Configurez Firebase
   - Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
   - Créez un fichier `src/firebase.js` avec votre configuration

4. Lancez l'application en mode développement
   ```bash
   npm start
   ```

## 🏆 Comment fonctionne le tournoi

1. **Tour initial** : Les 15 GIFs sont répartis aléatoirement en matchs
2. **Votes** : Chaque utilisateur vote pour son GIF préféré dans chaque match
3. **Élimination** : Les GIFs perdants sont éliminés selon les votes reçus
4. **Progression** : Les tours se succèdent jusqu'à ce qu'il ne reste qu'un seul GIF champion !

## 👥 Contributeurs

- [Yohan Page](https://github.com/pageyohan) - Développeur principal
- Mastiche - Fournisseur officiel de GIFs de chats
- Robiche - Testeur en chef et amateur de GIFs félins
- Yoyo - Expert en sélection de contenu félin

---

*Fait avec ❤️ et beaucoup de GIFs de chats*
