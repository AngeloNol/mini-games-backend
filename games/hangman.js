module.exports = function initializeHangman(io) {
  const rooms = new Map(); // roomId => { word, maskedWord, guesses, setter, guesser }

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ game, roomId }) => {
      if (game !== "hangman") return;

      const roomData = rooms.get(roomId);

      if (!roomData) {
        rooms.set(roomId, {
          setter: socket.id,
          guesses: [],
        });
        socket.join(roomId);
        socket.emit("roomJoined", { game, roomId });
        socket.emit("waitingForWord");
      } else if (!roomData.guesser) {
        roomData.guesser = socket.id;
        socket.join(roomId);
        socket.emit("roomJoined", { game, roomId });

        // If word is already set, start the game for guesser
        if (roomData.word) {
          socket.to(roomId).emit("startGame", {
            maskedWord: roomData.maskedWord,
          });
        }
      } else {
        socket.emit("errorMsg", { message: "Room full." });
      }
    });

    socket.on("setWord", ({ roomId, word }) => {
      const room = rooms.get(roomId);
      if (!room || room.setter !== socket.id) return;

      const cleanWord = word.toLowerCase();
      room.word = cleanWord;
      room.maskedWord = maskWord(cleanWord, []);
      room.guesses = [];

      io.to(roomId).emit("startGame", {
        maskedWord: room.maskedWord,
      });
    });

    socket.on("guessLetter", ({ roomId, letter }) => {
      const room = rooms.get(roomId);
      if (!room || !room.word || room.guesser !== socket.id) return;

      if (room.guesses.includes(letter)) return;
      room.guesses.push(letter);

      const wasCorrect = room.word.includes(letter);
      const masked = maskWord(room.word, room.guesses);

      room.maskedWord = masked;

      io.to(roomId).emit("updateMaskedWord", {
        maskedWord: masked,
        correct: wasCorrect,
      });

      if (!masked.includes("_")) {
        io.to(roomId).emit("gameOver", { win: true, word: room.word });
        rooms.delete(roomId);
      }

      if (!wasCorrect && countWrongGuesses(room.word, room.guesses) >= 6) {
        io.to(roomId).emit("gameOver", { win: false, word: room.word });
        rooms.delete(roomId);
      }
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.setter === socket.id || room.guesser === socket.id) {
          io.to(roomId).emit("errorMsg", { message: "Other player disconnected." });
          rooms.delete(roomId);
        }
      }
    });
  });

  function maskWord(word, guesses) {
    return word
      .split("")
      .map((ch) =>
        ch === " " ? " " : guesses.includes(ch.toLowerCase()) ? ch : "_"
      )
      .join("");
  }

  function countWrongGuesses(word, guesses) {
    return guesses.filter((l) => !word.includes(l)).length;
  }
};
