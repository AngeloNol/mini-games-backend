const rooms = {};

const words = [
  "javascript", "hangman", "multiplayer", "socket", "programming", "challenge"
];

// Helper: generate room id
function generateRoomId() {
  return Math.random().toString(36).substr(2, 6);
}

function hangman(io, socket) {
  socket.on('hangman-create-room', () => {
    const roomId = generateRoomId();
    const word = words[Math.floor(Math.random() * words.length)];
    rooms[roomId] = {
      word,
      guessedLetters: [],
      incorrectLetters: [],
      players: [],
      currentPlayerIndex: 0,
    };
    socket.join(roomId);
    rooms[roomId].players.push(socket.id);
    socket.emit('hangman-room-created', { roomId });
  });

  socket.on('hangman-join-room', ({ roomId }) => {
    if (!rooms[roomId]) {
      socket.emit('hangman-error', 'Room does not exist');
      return;
    }
    const room = rooms[roomId];
    if (room.players.length >= 2) {
      socket.emit('hangman-error', 'Room full');
      return;
    }
    socket.join(roomId);
    room.players.push(socket.id);
    io.to(roomId).emit('hangman-room-joined', { roomId });
    io.to(roomId).emit('hangman-update', {
      word: room.word,
      guessedLetters: room.guessedLetters,
      incorrectLetters: room.incorrectLetters,
      currentPlayer: room.players[room.currentPlayerIndex]
    });
  });

  socket.on('hangman-guess', ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('hangman-error', 'Room does not exist');
      return;
    }
    if (socket.id !== room.players[room.currentPlayerIndex]) {
      socket.emit('hangman-error', 'Not your turn');
      return;
    }
    if (room.guessedLetters.includes(guess) || room.incorrectLetters.includes(guess)) {
      socket.emit('hangman-error', 'Letter already guessed');
      return;
    }
    if (room.word.includes(guess)) {
      room.guessedLetters.push(guess);
    } else {
      room.incorrectLetters.push(guess);
    }

    // Check win condition: all letters guessed
    const allLettersGuessed = room.word.split('').every(letter => room.guessedLetters.includes(letter));

    // Check lose condition: max incorrect guesses reached
    if (room.incorrectLetters.length >= 6) {
      io.to(roomId).emit('hangman-game-over', { message: `Game over! The word was "${room.word.toUpperCase()}"` });
      delete rooms[roomId];
      return;
    }

    if (allLettersGuessed) {
      io.to(roomId).emit('hangman-game-over', { message: `Congratulations! You guessed the word: "${room.word.toUpperCase()}"` });
      delete rooms[roomId];
      return;
    }

    // Switch turn
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

    io.to(roomId).emit('hangman-update', {
      word: room.word,
      guessedLetters: room.guessedLetters,
      incorrectLetters: room.incorrectLetters,
      currentPlayer: room.players[room.currentPlayerIndex]
    });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        const room = rooms[roomId];
        const idx = room.players.indexOf(socket.id);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          io.to(roomId).emit('hangman-game-over', { message: 'Player disconnected. Game ended.' });
          delete rooms[roomId];
        }
      }
    }
  });
}

module.exports = hangman;
