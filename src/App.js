// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, arrayUnion, query, where, orderBy, limit } from 'firebase/firestore';

// Placer cette fonction en-dehors des composants, juste après les imports
const createMatchesForNextRound = async (round, gifs, roundConfig) => {
    try {
      // Trier les GIFs par score pour les appariements
      gifs.sort((a, b) => b.score - a.score);

      // Créer les matches
      const matchPromises = [];
      for (let i = 0; i < roundConfig.matches; i++) {
        if (i * 2 + 1 < gifs.length) {
          // Match normal avec 2 GIFs
          matchPromises.push(
            setDoc(doc(db, "matches", `${round}_${i + 1}`), {
              round: round,
              matchNumber: i + 1,
              gifs: [gifs[i * 2], gifs[i * 2 + 1]],
              votes: {},
              isBye: false,
              createdAt: new Date()
            })
          );
        } else if (i * 2 < gifs.length) {
          // Match "bye" pour le dernier GIF si nombre impair
          matchPromises.push(
            setDoc(doc(db, "matches", `${round}_${i + 1}`), {
              round: round,
              matchNumber: i + 1,
              gifs: [gifs[i * 2]],
              votes: {},
              isBye: true,
              createdAt: new Date()
            })
          );

          // Augmenter automatiquement le score du GIF qui passe
          matchPromises.push(
            updateDoc(doc(db, "gifs", gifs[i * 2].id.toString()), {
              score: gifs[i * 2].score + 3 // Score bonus pour passage automatique
            })
          );
        }
      }

      await Promise.all(matchPromises);
    } catch (error) {
      console.error(`Erreur lors de la création des matches pour le tour ${round}:`, error);
    }
  };

// Composant principal
function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Bracket de GIFs</h1>
        </header>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bracket/:round" element={<BracketRound />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}

// Page d'accueil avec sélection d'utilisateur
function HomePage() {
  const [selectedUser, setSelectedUser] = useState('');
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState({});

  // Mapping des noms d'utilisateurs avec leurs clés
const userMapping = {
    'user1': 'Mastiche',
    'user2': 'Robiche',
    'user3': 'Yoyo'
  };

  // Mapping inverse pour les vérifications
  const reverseUserMapping = {
    'Mastiche': 'user1',
    'Robiche': 'user2',
    'Yoyo': 'user3'
  };

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà un choix enregistré
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setSelectedUser(savedUser);
    }

    // Vérifier l'état actuel du tournoi
    const checkTournamentStatus = async () => {
        try {
          // Vérifier si un tournoi existe déjà
          const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
          console.log("Statut du tournoi:", tournamentDoc.exists() ? tournamentDoc.data() : "N'existe pas");

        if (tournamentDoc.exists()) {
          setCurrentRound(tournamentDoc.data().currentRound);

          // Vérifier le statut de chaque utilisateur
          const userStatuses = {};
          for (let i = 1; i <= 3; i++) {
            const userKey = `user${i}`;
            const userVotesRef = await getDoc(doc(db, "votes", userKey));

            userStatuses[userKey] = {
              hasVoted: false
            };

            if (userVotesRef.exists()) {
              const userData = userVotesRef.data();
              if (userData.rounds && userData.rounds[tournamentDoc.data().currentRound]) {
                userStatuses[userKey].hasVoted = true;
              }
            }
          }

          setUserStatus(userStatuses);
        } else {
          // Initialiser un nouveau tournoi
          await initializeTournament();
          setCurrentRound(1);
        }

        setLoading(false);
    } catch (error) {
        console.error("Erreur lors de la vérification du statut du tournoi:", error);
        setLoading(false);
      }
    };

    checkTournamentStatus();
  }, []);

  const initializeTournament = async () => {
    try {
      // Liste des 15 GIFs
      const initialGifs = [
        { id: 1, url: "/gifs/cat-1-mastiche.gif", title: "GIF 1 Mastiche" },
        { id: 2, url: "/gifs/cat-2-mastiche.gif", title: "GIF 2 Mastiche" },
        { id: 3, url: "/gifs/cat-3-mastiche.gif", title: "GIF 3 Mastiche" },
        { id: 4, url: "/gifs/cat-4-mastiche.gif", title: "GIF 4 Mastiche" },
        { id: 5, url: "/gifs/cat-5-mastiche.gif", title: "GIF 5 Mastiche" },
        { id: 6, url: "/gifs/cat-1-robiche.gif", title: "GIF 1 Robiche" },
        { id: 7, url: "/gifs/cat-2-robiche.gif", title: "GIF 2 Robiche" },
        { id: 8, url: "/gifs/cat-3-robiche.gif", title: "GIF 3 Robiche" },
        { id: 9, url: "/gifs/cat-4-robiche.gif", title: "GIF 4 Robiche" },
        { id: 10, url: "/gifs/cat-5-robiche.gif", title: "GIF 5 Robiche" },
        { id: 11, url: "/gifs/cat-1-yoyo.gif", title: "GIF 1 Yoyo" },
        { id: 12, url: "/gifs/cat-2-yoyo.gif", title: "GIF 2 Yoyo" },
        { id: 13, url: "/gifs/cat-3-yoyo.gif", title: "GIF 3 Yoyo" },
        { id: 14, url: "/gifs/cat-4-yoyo.gif", title: "GIF 4 Yoyo" },
        { id: 15, url: "/gifs/cat-5-yoyo.gif", title: "GIF 5 Yoyo" }
      ];

      // Créer une entrée pour chaque GIF dans Firestore
      for (const gif of initialGifs) {
        await setDoc(doc(db, "gifs", gif.id.toString()), {
          ...gif,
          score: 0,
          active: true
        });
      }

      // Créer le document de statut du tournoi
      await setDoc(doc(db, "tournament", "status"), {
        currentRound: 1,
        totalRounds: 4, // Avec 15 GIFs, nous aurons 4 rounds: initial, quarts, demis, finale
        startedAt: new Date(),
        roundsConfig: {
          1: { matches: 8, gifsPerMatch: 2, eliminationCount: 1 }, // Tour 1: 8 matches, éliminer 8 GIFs (reste 7)
          2: { matches: 3, gifsPerMatch: 2, eliminationCount: 3 }, // Tour 2: 3 matches, éliminer 3 GIFs (reste 4)
          3: { matches: 2, gifsPerMatch: 2, eliminationCount: 2 }, // Tour 3: 2 matches, éliminer 2 GIFs (reste 2)
          4: { matches: 1, gifsPerMatch: 2, eliminationCount: 1 }  // Finale: 1 match, déterminer le gagnant
        }
      });

      // Créer les matches du premier tour
      await createMatchesForRound(1, initialGifs);
    } catch (error) {
      console.error("Erreur lors de l'initialisation du tournoi:", error);
    }
  };

  const createMatchesForRound = async (round, gifs) => {
    try {
      // Récupérer la configuration du tour
      const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
      const roundConfig = tournamentDoc.data().roundsConfig[round];

      // Pour le premier tour, on mélange les GIFs
      let gifsToMatch = [...gifs];
      if (round === 1) {
        // Mélanger les GIFs
        for (let i = gifsToMatch.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [gifsToMatch[i], gifsToMatch[j]] = [gifsToMatch[j], gifsToMatch[i]];
        }
      } else {
        // Pour les tours suivants, on prend les GIFs actifs en fonction de leur score
        const gifsSnapshot = await getDocs(
          query(collection(db, "gifs"), where("active", "==", true), orderBy("score", "desc"))
        );
        gifsToMatch = [];
        gifsSnapshot.forEach(doc => {
          gifsToMatch.push(doc.data());
        });
      }

      // Créer les matches
      const matchPromises = [];
      for (let i = 0; i < roundConfig.matches; i++) {
        // Si le nombre de GIFs est impair, le dernier GIF passe automatiquement au tour suivant
        if (i === roundConfig.matches - 1 && gifsToMatch.length % 2 !== 0) {
          const byeGif = gifsToMatch[gifsToMatch.length - 1];
          matchPromises.push(
            setDoc(doc(db, "matches", `${round}_${i + 1}`), {
              round: round,
              matchNumber: i + 1,
              gifs: [byeGif],
              votes: {},
              isBye: true,
              createdAt: new Date()
            })
          );

          // Augmenter automatiquement le score du GIF qui passe
          matchPromises.push(
            updateDoc(doc(db, "gifs", byeGif.id.toString()), {
              score: byeGif.score + 3 // Score bonus pour passage automatique
            })
          );
        } else if (i * 2 + 1 < gifsToMatch.length) {
          // Match normal avec 2 GIFs
          matchPromises.push(
            setDoc(doc(db, "matches", `${round}_${i + 1}`), {
              round: round,
              matchNumber: i + 1,
              gifs: [gifsToMatch[i * 2], gifsToMatch[i * 2 + 1]],
              votes: {},
              isBye: false,
              createdAt: new Date()
            })
          );
        }
      }

      await Promise.all(matchPromises);
    } catch (error) {
      console.error(`Erreur lors de la création des matches pour le tour ${round}:`, error);
    }
  };

  const handleUserSelect = (displayName) => {
    const userKey = reverseUserMapping[displayName];
    localStorage.setItem('currentUser', userKey);
    setSelectedUser(userKey);

    console.log(`Utilisateur sélectionné: ${displayName} (clé: ${userKey})`);
  };

  if (loading) {
    return <div className="loading">Chargement du tournoi...</div>;
  }

  return (
    <div className="home-container">
      <h2>Bienvenue au Bracket de GIFs</h2>

      {currentRound && (
        <div className="tournament-status">
          <h3>Statut du tournoi</h3>
          <p>Tour actuel: {currentRound}</p>

          <div className="user-status">
            <p>Mastiche: {userStatus.user1?.hasVoted ? "A voté" : "N'a pas encore voté"}</p>
            <p>Robiche: {userStatus.user2?.hasVoted ? "A voté" : "N'a pas encore voté"}</p>
            <p>Yoyo: {userStatus.user3?.hasVoted ? "A voté" : "N'a pas encore voté"}</p>
          </div>
        </div>
      )}

      <div className="user-selection">
        <h3>Sélectionnez votre utilisateur:</h3>
<div className="user-buttons">
  <button
    className={selectedUser === 'user1' ? 'selected' : ''}
    onClick={() => handleUserSelect('Mastiche')}
  >
    Mastiche
  </button>
  <button
    className={selectedUser === 'user2' ? 'selected' : ''}
    onClick={() => handleUserSelect('Robiche')}
  >
    Robiche
  </button>
  <button
    className={selectedUser === 'user3' ? 'selected' : ''}
    onClick={() => handleUserSelect('Yoyo')}
  >
    Yoyo
  </button>
</div>

        {selectedUser && currentRound && (
          <div className="start-button">
            {userStatus[selectedUser]?.hasVoted ? (
              <p>Vous avez déjà voté pour ce tour!</p>
            ) : (
              <Link to={`/bracket/${currentRound}`}>
                <button>Voter pour le tour {currentRound}</button>
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="admin-section">
        <Link to="/results">
          <button>Voir les Résultats et Classement</button>
        </Link>
      </div>
    </div>
  );
}

// Composant pour un tour de bracket
function BracketRound() {
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votingComplete, setVotingComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [roundInfo, setRoundInfo] = useState(null);
  const [votes, setVotes] = useState({});

  // Récupérer le numéro du tour depuis l'URL
  const roundNumber = parseInt(window.location.pathname.split('/').pop());

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      // Rediriger vers la page d'accueil si aucun utilisateur n'est sélectionné
      window.location.href = '/';
      return;
    }

    setCurrentUser(user);

    // Vérifier si l'utilisateur a déjà voté pour ce tour
    const checkUserVotes = async () => {
      try {
        const userVotesRef = doc(db, "votes", user);
        const userVotesDoc = await getDoc(userVotesRef);

        if (userVotesDoc.exists() && userVotesDoc.data().rounds && userVotesDoc.data().rounds[roundNumber]) {
          // L'utilisateur a déjà voté pour ce tour
          setVotingComplete(true);
          setLoading(false);
          return;
        }

        // Récupérer les informations du tournoi
        const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
        if (tournamentDoc.exists()) {
          setRoundInfo(tournamentDoc.data().roundsConfig[roundNumber]);
        }

        // Récupérer les matches du tour actuel
        const matchesSnapshot = await getDocs(
          query(collection(db, "matches"), where("round", "==", roundNumber))
        );

        const matchesData = [];
        matchesSnapshot.forEach(doc => {
          matchesData.push({ id: doc.id, ...doc.data() });
        });

        // Trier les matches par numéro
        matchesData.sort((a, b) => a.matchNumber - b.matchNumber);

        setMatches(matchesData);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des matches:", error);
        setLoading(false);
      }
    };

    checkUserVotes();
  }, [roundNumber]);

  const handleVote = async (matchId, gifId) => {
    try {
      // Mettre à jour l'état local des votes
      const updatedVotes = { ...votes };
      updatedVotes[matchId] = gifId;
      setVotes(updatedVotes);

      // Passer au match suivant
      if (currentMatchIndex < matches.length - 1) {
        setCurrentMatchIndex(currentMatchIndex + 1);
      } else {
        // Tous les votes sont terminés, les enregistrer dans Firestore
        setLoading(true);

        // 1. Mettre à jour les votes de l'utilisateur
        const userVotesRef = doc(db, "votes", currentUser);
        const userVotesDoc = await getDoc(userVotesRef);

        if (userVotesDoc.exists()) {
          await updateDoc(userVotesRef, {
            [`rounds.${roundNumber}`]: updatedVotes,
            lastVoteAt: new Date()
          });
        } else {
          await setDoc(userVotesRef, {
            [`rounds.${roundNumber}`]: updatedVotes,
            lastVoteAt: new Date()
          });
        }

        // 2. Mettre à jour les votes pour chaque match
        for (const [matchId, votedGifId] of Object.entries(updatedVotes)) {
          const matchRef = doc(db, "matches", matchId);
          await updateDoc(matchRef, {
            [`votes.${currentUser}`]: votedGifId
          });
        }

        // 3. Vérifier si tous les utilisateurs ont voté pour ce tour
        const allUsersVoted = await checkAllUsersVoted();

        if (allUsersVoted) {
          // Si tous ont voté, calculer les résultats et préparer le tour suivant
          await processRoundResults();
        }

        setVotingComplete(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du vote:", error);
      setLoading(false);
    }
  };

  const checkAllUsersVoted = async () => {
    try {
      const users = ['user1', 'user2', 'user3'];
      for (const user of users) {
        const userVotesRef = doc(db, "votes", user);
        const userVotesDoc = await getDoc(userVotesRef);

        if (!userVotesDoc.exists() || !userVotesDoc.data().rounds || !userVotesDoc.data().rounds[roundNumber]) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Erreur lors de la vérification des votes des utilisateurs:", error);
      return false;
    }
  };



  const processRoundResults = async () => {
    try {
      // 1. Récupérer tous les matches du tour actuel
      const matchesSnapshot = await getDocs(
        query(collection(db, "matches"), where("round", "==", roundNumber))
      );

      // 2. Calculer les résultats pour chaque match
      const matchResults = [];
      matchesSnapshot.forEach(doc => {
        const match = doc.data();

        if (match.isBye) {
          // Si c'est un "bye", le GIF passe automatiquement
          matchResults.push({
            match: match,
            winner: match.gifs[0],
            loser: null
          });
          return;
        }

        // Compter les votes pour chaque GIF dans ce match
        const voteCount = { [match.gifs[0].id]: 0, [match.gifs[1].id]: 0 };

        Object.values(match.votes || {}).forEach(gifId => {
          voteCount[gifId]++;
        });

        // Déterminer le gagnant et le perdant
        const winner = voteCount[match.gifs[0].id] >= voteCount[match.gifs[1].id] ? match.gifs[0] : match.gifs[1];
        const loser = voteCount[match.gifs[0].id] >= voteCount[match.gifs[1].id] ? match.gifs[1] : match.gifs[0];

        matchResults.push({
          match: match,
          winner: winner,
          loser: loser,
          winnerVotes: voteCount[winner.id],
          loserVotes: voteCount[loser.id]
        });
      });

      // 3. Mettre à jour les scores des GIFs
      for (const result of matchResults) {
        if (result.winner) {
          await updateDoc(doc(db, "gifs", result.winner.id.toString()), {
            score: result.winner.score + (result.winnerVotes || 3)
          });
        }

        if (result.loser) {
          await updateDoc(doc(db, "gifs", result.loser.id.toString()), {
            score: result.loser.score + (result.loserVotes || 0)
          });
        }
      }

      // 4. Déterminer quels GIFs sont éliminés
      const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
      const roundConfig = tournamentDoc.data().roundsConfig[roundNumber];
      const eliminationCount = roundConfig.eliminationCount;

      // Trier les GIFs perdants par nombre de votes (les moins votés seront éliminés)
      const losers = matchResults
        .filter(result => result.loser)
        .sort((a, b) => (a.loserVotes || 0) - (b.loserVotes || 0));

      // Éliminer les GIFs avec le moins de votes
      for (let i = 0; i < Math.min(eliminationCount, losers.length); i++) {
        await updateDoc(doc(db, "gifs", losers[i].loser.id.toString()), {
          active: false,
          eliminatedInRound: roundNumber
        });
      }

      // 5. Vérifier s'il faut passer au tour suivant
      const nextRound = roundNumber + 1;
      if (nextRound <= tournamentDoc.data().totalRounds) {
        // Préparer le tour suivant

        // Récupérer les GIFs encore actifs
        const activeGifsSnapshot = await getDocs(
          query(collection(db, "gifs"), where("active", "==", true))
        );

        const activeGifs = [];
        activeGifsSnapshot.forEach(doc => {
          activeGifs.push(doc.data());
        });

        // Créer les matches pour le tour suivant
        const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
        const roundConfig = tournamentDoc.data().roundsConfig[nextRound];
        await createMatchesForNextRound(nextRound, activeGifs, roundConfig);

        // Mettre à jour le tour actuel
        await updateDoc(doc(db, "tournament", "status"), {
          currentRound: nextRound,
          lastUpdateAt: new Date()
        });
      } else {
        // Le tournoi est terminé
        await updateDoc(doc(db, "tournament", "status"), {
          completed: true,
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error("Erreur lors du traitement des résultats du tour:", error);
    }
  };

  // Si l'utilisateur a terminé de voter
  if (votingComplete) {
    return (
      <div className="voting-complete">
        <h2>Merci pour votre vote !</h2>
        <p>Votre participation au tour {roundNumber} a été enregistrée.</p>

        <div className="next-actions">
          <Link to="/results">
            <button>Voir les résultats</button>
          </Link>
          <Link to="/">
            <button>Retour à l'accueil</button>
          </Link>
        </div>
      </div>
    );
  }

  // Si chargement
  if (loading) {
    return <div className="loading">Chargement des matches...</div>;
  }

  // Si l'utilisateur a déjà voté ou s'il n'y a pas de matches
  if (matches.length === 0) {
    return (
      <div className="no-matches">
        <h2>Aucun match disponible pour ce tour</h2>
        <Link to="/">
          <button>Retour à l'accueil</button>
        </Link>
      </div>
    );
  }

  const currentMatch = matches[currentMatchIndex];

  // Si c'est un match "bye" (un seul GIF), passer automatiquement
  if (currentMatch.isBye) {
    // Voter automatiquement pour le seul GIF disponible
    handleVote(currentMatch.id, currentMatch.gifs[0].id);
    return <div className="loading">Passage automatique...</div>;
  }

  return (
    <div className="bracket-container">
      <h2>Tour {roundNumber} - Match {currentMatchIndex + 1} / {matches.length}</h2>
      <div className="match">
        <div className="gif-container">
          <h3>{currentMatch.gifs[0].title}</h3>
          <img
            src={currentMatch.gifs[0].url}
            alt={currentMatch.gifs[0].title}
            onClick={() => handleVote(currentMatch.id, currentMatch.gifs[0].id)}
          />
          <button onClick={() => handleVote(currentMatch.id, currentMatch.gifs[0].id)}>
            Voter pour ce GIF
          </button>
        </div>

        <div className="vs">VS</div>

        <div className="gif-container">
          <h3>{currentMatch.gifs[1].title}</h3>
          <img
            src={currentMatch.gifs[1].url}
            alt={currentMatch.gifs[1].title}
            onClick={() => handleVote(currentMatch.id, currentMatch.gifs[1].id)}
          />
          <button onClick={() => handleVote(currentMatch.id, currentMatch.gifs[1].id)}>
            Voter pour ce GIF
          </button>
        </div>
      </div>

      <div className="progress">
        {matches.map((_, index) => (
          <div
            key={index}
            className={`progress-dot ${index === currentMatchIndex ? 'current' : ''} ${index < currentMatchIndex ? 'completed' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

// Page de résultats
function Results() {
  const [gifs, setGifs] = useState([]);
  const [tournamentStatus, setTournamentStatus] = useState(null);
  const [currentRoundMatches, setCurrentRoundMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('ranking'); // 'ranking' ou 'bracket'

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Récupérer le statut du tournoi
        const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
        if (tournamentDoc.exists()) {
          setTournamentStatus(tournamentDoc.data());
        }

        // Récupérer tous les GIFs
        const gifsSnapshot = await getDocs(collection(db, "gifs"));
        const gifsData = [];
        gifsSnapshot.forEach(doc => {
          gifsData.push(doc.data());
        });

        // Trier les GIFs par score
        gifsData.sort((a, b) => b.score - a.score);
        setGifs(gifsData);

        // Récupérer les matches du tour actuel
        if (tournamentDoc.exists()) {
            const currentRound = tournamentDoc.data().currentRound;
            // Vérifier que currentRound n'est pas undefined avant d'utiliser where()
            if (currentRound) {
              const matchesSnapshot = await getDocs(
                query(collection(db, "matches"), where("round", "==", currentRound))
              );

              const matchesData = [];
              matchesSnapshot.forEach(doc => {
                matchesData.push({ id: doc.id, ...doc.data() });
              });

              // Trier les matches par numéro
              matchesData.sort((a, b) => a.matchNumber - b.matchNumber);
              setCurrentRoundMatches(matchesData);
            }
          }

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des résultats:", error);
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const advanceToNextRound = async () => {
    try {
      setLoading(true);
      await processRoundResults();

      // Rafraîchir la page
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors du passage au tour suivant:", error);
      setLoading(false);
    }
  };

  const processRoundResults = async () => {
    try {
      const currentRound = tournamentStatus.currentRound;

      // 1. Récupérer tous les matches du tour actuel
      const matchesSnapshot = await getDocs(
        query(collection(db, "matches"), where("round", "==", currentRound))
      );

      // 2. Calculer les résultats pour chaque match
      const matchResults = [];
      matchesSnapshot.forEach(doc => {
        const match = doc.data();

        if (match.isBye) {
          // Si c'est un "bye", le GIF passe automatiquement
          matchResults.push({
            match: match,
            winner: match.gifs[0],
            loser: null
          });
          return;
        }

        // Compter les votes pour chaque GIF dans ce match
        const voteCount = { [match.gifs[0].id]: 0, [match.gifs[1].id]: 0 };

        Object.values(match.votes || {}).forEach(gifId => {
          voteCount[gifId]++;
        });

        // Déterminer le gagnant et le perdant
        const winner = voteCount[match.gifs[0].id] >= voteCount[match.gifs[1].id] ? match.gifs[0] : match.gifs[1];
        const loser = voteCount[match.gifs[0].id] >= voteCount[match.gifs[1].id] ? match.gifs[1] : match.gifs[0];

        matchResults.push({
          match: match,
          winner: winner,
          loser: loser,
          winnerVotes: voteCount[winner.id],
          loserVotes: voteCount[loser.id]
        });
      });

      // 3. Mettre à jour les scores des GIFs
      for (const result of matchResults) {
        if (result.winner) {
          await updateDoc(doc(db, "gifs", result.winner.id.toString()), {
            score: result.winner.score + (result.winnerVotes || 3)
          });
        }

        if (result.loser) {
          await updateDoc(doc(db, "gifs", result.loser.id.toString()), {
            score: result.loser.score + (result.loserVotes || 0)
          });
        }
      }

      // 4. Déterminer quels GIFs sont éliminés
      const roundConfig = tournamentStatus.roundsConfig[currentRound];
      const eliminationCount = roundConfig.eliminationCount;

      // Trier les GIFs perdants par nombre de votes (les moins votés seront éliminés)
      const losers = matchResults
        .filter(result => result.loser)
        .sort((a, b) => (a.loserVotes || 0) - (b.loserVotes || 0));

      // Éliminer les GIFs avec le moins de votes
      for (let i = 0; i < Math.min(eliminationCount, losers.length); i++) {
        await updateDoc(doc(db, "gifs", losers[i].loser.id.toString()), {
          active: false,
          eliminatedInRound: currentRound
        });
      }

      // 5. Vérifier s'il faut passer au tour suivant
      const nextRound = currentRound + 1;
      if (nextRound <= tournamentStatus.totalRounds) {
        // Préparer le tour suivant

        // Récupérer les GIFs encore actifs
        const activeGifsSnapshot = await getDocs(
          query(collection(db, "gifs"), where("active", "==", true))
        );

        const activeGifs = [];
        activeGifsSnapshot.forEach(doc => {
          activeGifs.push(doc.data());
        });

        // Créer les matches pour le tour suivant
        const tournamentDoc = await getDoc(doc(db, "tournament", "status"));
        const roundConfig = tournamentDoc.data().roundsConfig[nextRound];
        await createMatchesForNextRound(nextRound, activeGifs, roundConfig);

        // Mettre à jour le tour actuel
        await updateDoc(doc(db, "tournament", "status"), {
          currentRound: nextRound,
          lastUpdateAt: new Date()
        });
      } else {
        // Le tournoi est terminé
        await updateDoc(doc(db, "tournament", "status"), {
          completed: true,
          completedAt: new Date()
        });
      }
    } catch (error) {
      console.error("Erreur lors du traitement des résultats du tour:", error);
    }
  };

  const resetTournament = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser le tournoi ? Tous les votes et les scores seront perdus.")) {
      try {
        setLoading(true);

        // Supprimer toutes les données de la collection "matches"
        const matchesSnapshot = await getDocs(collection(db, "matches"));
        const deleteMatchPromises = [];
        matchesSnapshot.forEach(doc => {
          deleteMatchPromises.push(setDoc(doc.ref, {}));
        });

        // Réinitialiser les votes des utilisateurs
        const usersSnapshot = await getDocs(collection(db, "votes"));
        const resetUserPromises = [];
        usersSnapshot.forEach(doc => {
          resetUserPromises.push(setDoc(doc.ref, {}));
        });

        // Réinitialiser le document de statut du tournoi
        await setDoc(doc(db, "tournament", "status"), {});

        // Supprimer les entrées locales
        localStorage.removeItem("currentUser");
        for (let i = 1; i <= 3; i++) {
          localStorage.removeItem(`hasvoted_user${i}`);
        }

        await Promise.all([...deleteMatchPromises, ...resetUserPromises]);

        // Rediriger vers la page d'accueil
        window.location.href = '/';
      } catch (error) {
        console.error("Erreur lors de la réinitialisation du tournoi:", error);
        setLoading(false);
      }
    }
  };

  // Si chargement
  if (loading) {
    return <div className="loading">Chargement des résultats...</div>;
  }

  // Vérifier si tous les utilisateurs ont voté pour le tour actuel
  const allUsersVoted = currentRoundMatches.every(match => {
    const votes = match.votes || {};
    return Object.keys(votes).length === 3; // 3 utilisateurs
  });

  return (
    <div className="results-container">
      <h2>Résultats & Classement</h2>

      {tournamentStatus && (
        <div className="tournament-info">
          <div className="status-bar">
            <p>Tour actuel: {tournamentStatus.currentRound} / {tournamentStatus.totalRounds}</p>
            {tournamentStatus.completed ? (
              <div className="tournament-completed">
                <h3>Tournoi terminé !</h3>
                <p>Le GIF gagnant est :</p>
                <div className="winner-gif">
                  {gifs.length > 0 && (
                    <>
                      <h2>{gifs[0].title}</h2>
                      <img src={gifs[0].url} alt={gifs[0].title} />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="view-toggle">
                  <button
                    className={view === 'ranking' ? 'active' : ''}
                    onClick={() => setView('ranking')}
                  >
                    Classement
                  </button>
                  <button
                    className={view === 'bracket' ? 'active' : ''}
                    onClick={() => setView('bracket')}
                  >
                    Matches actuels
                  </button>
                </div>
              </>
            )}
          </div>

          {!tournamentStatus.completed && allUsersVoted && (
            <div className="admin-controls">
              <button onClick={advanceToNextRound} className="next-round-button">
                Passer au tour suivant
              </button>
            </div>
          )}

          {view === 'ranking' ? (
            <div className="ranking">
              <h3>Classement des GIFs</h3>
              <div className="gifs-list">
                {gifs.map((gif, index) => (
                  <div key={gif.id} className={`gif-item ${index === 0 && tournamentStatus.completed ? 'winner' : ''}`}>
                    <div className="gif-rank">{index + 1}</div>
                    <div className="gif-image">
                      <img src={gif.url} alt={gif.title} />
                    </div>
                    <div className="gif-info">
                      <h4>{gif.title}</h4>
                      <p>Score: {gif.score}</p>
                      {!gif.active && (
                        <p className="eliminated">Éliminé au tour {gif.eliminatedInRound}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="current-matches">
              <h3>Matches du tour {tournamentStatus.currentRound}</h3>
              <div className="matches-list">
                {currentRoundMatches.map(match => (
                  <div key={match.id} className="match-item">
                    <h4>Match {match.matchNumber}</h4>
                    {match.isBye ? (
                      <div className="bye-match">
                        <div className="gif-preview">
                          <img src={match.gifs[0].url} alt={match.gifs[0].title} />
                          <p>{match.gifs[0].title}</p>
                        </div>
                        <p>Passage automatique (bye)</p>
                      </div>
                    ) : (
                      <div className="vs-match">
                        <div className="gif-preview">
                          <img src={match.gifs[0].url} alt={match.gifs[0].title} />
                          <p>{match.gifs[0].title}</p>
                          <p className="vote-count">
                            {Object.values(match.votes || {}).filter(id => id === match.gifs[0].id).length} votes
                          </p>
                        </div>

                        <div className="vs-indicator">VS</div>

                        <div className="gif-preview">
                          <img src={match.gifs[1].url} alt={match.gifs[1].title} />
                          <p>{match.gifs[1].title}</p>
                          <p className="vote-count">
                            {Object.values(match.votes || {}).filter(id => id === match.gifs[1].id).length} votes
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="voters">
                      <p>
                        A voté: {Object.keys(match.votes || {}).map(user => user.replace('user', 'Utilisateur ')).join(', ') || 'Personne'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="action-buttons">
        <button className="reset-button" onClick={resetTournament}>
          Réinitialiser le tournoi
        </button>
        <Link to="/">
          <button>Retour à l'accueil</button>
        </Link>
      </div>
    </div>
  );
}

export default App;
