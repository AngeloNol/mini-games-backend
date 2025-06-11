module.exports = function setupHangman(io, socket) {
  // Store rooms data: { roomId: { word, guessedLetters, attemptsLeft, players } }
  const rooms = setupHangman.rooms || {};
  setupHangman.rooms = rooms;

  socket.on('joinRoom', ({ roomId, game }) => {
    if (game !== 'hangman') return;
    socket.join(roomId);

    if (!rooms[roomId]) {
      // Initialize room with random word or custom word (you can extend this)
      rooms[roomId] = {
        word: 'animals',   // For demo, you can randomize or pass custom words from client
        guessedLetters: [],
        attemptsLeft: 6,
        players: [],
      };
    }

    const room = rooms[roomId];
    if (!room.players.includes(socket.id)) {
      room.players.push(socket.id);
    }

    io.to(roomId).emit('gameState', getGameState(room));
  });

  socket.on('gameMove', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.attemptsLeft <= 0) return;

    const letter = move.toLowerCase();
    if (room.guessedLetters.includes(letter)) return; // already guessed

    room.guessedLetters.push(letter);

    if (!room.word.includes(letter)) {
      room.attemptsLeft--;
    }

    // Check win or lose
    const isWon = room.word.split('').every(ch => ch === ' ' || room.guessedLetters.includes(ch));
    const isLost = room.attemptsLeft <= 0;

    io.to(roomId).emit('gameState', getGameState(room));

    if (isWon) {
      io.to(roomId).emit('gameEnd', { message: 'You won!' });
    } else if (isLost) {
      io.to(roomId).emit('gameEnd', { message: 'You lost! The word was ' + room.word });
    }
  });

  socket.on('disconnect', () => {
    // Remove player from rooms on disconnect
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          delete rooms[roomId]; // clean up empty rooms
        }
      }
    }
  });

  function getGameState(room) {
    // Show guessed letters or underscores, keeping spaces visible
    const display = room.word.split('').map(ch => {
      return (ch === ' ' || room.guessedLetters.includes(ch)) ? ch : '_';
    }).join(' ');

    return {
      display,
      guessedLetters: room.guessedLetters,
      attemptsLeft: room.attemptsLeft,
    };
  }
};
