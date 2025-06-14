// backend/hangman.js

const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

// Simple in-memory store for rooms and game states
const hangmanRooms = {}; // Structure: { roomId: { word, correctLetters, incorrectLetters, players: [], currentTurnIndex } }

function initHangman(io) {
  io.of("/hangman").on("connection", (socket) => {
    console.log("Hangman client connected", socket.id);

    // Create Room
    socket.on("createRoom", () => {
      const roomId = uuidv4().slice(0, 6); // short unique ID
      hangmanRooms[roomId] = {
        word: pickRandomWord(),
        correctLetters: [],
        incorrectLetters: [],
        players: [socket.id],
        currentTurnIndex: 0
      };
      socket.join(roomId);
      socket.emit("roomCreated", roomId);
      console.log(`Room ${roomId} created with ${socket.id}`);
    });

    // Join Room
    socket.on("joinRoom", (roomId) => {
      const room = hangmanRooms[roomId];
      if (room && room.players.length < 2) {
        room.players.push(socket.id);
        socket.join(roomId);

        // Notify players
        io.of("/hangman").to(roomId).emit("roomJoined", {
          roomId,
          wordDisplay: getWordDisplay(room.word, room.correctLetters),
          incorrectLetters: room.incorrectLetters,
          currentPlayer: room.players[room.currentTurnIndex],
        });
        console.log(`${socket.id} joined room ${roomId}`);
      } else {
        socket.emit("error", "Room full or does not exist");
      }
    });

    // Handle guess
    socket.on("guessLetter", ({ roomId, letter }) => {
      const room = hangmanRooms[roomId];
      if (!room || !room.players.includes(socket.id)) return;

      const isCorrect = room.word.includes(letter);

      if (isCorrect && !room.correctLetters.includes(letter)) {
        room.correctLetters.push(letter);
      } else if (!isCorrect && !room.incorrectLetters.includes(letter)) {
        room.incorrectLetters.push(letter);
      }

      // Check if word is guessed
      const wordGuessed = room.word.split("").every(l => room.correctLetters.includes(l));

      // Swap turn
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

      io.of("/hangman").to(roomId).emit("gameState", {
        wordDisplay: getWordDisplay(room.word, room.correctLetters),
        incorrectLetters: room.incorrectLetters,
        currentPlayer: room.players[room.currentTurnIndex],
        isCorrect,
        gameOver: wordGuessed || room.incorrectLetters.length >= 6,
        winner: wordGuessed ? socket.id : null,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Hangman client disconnected", socket.id);
      for (const [roomId, room] of Object.entries(hangmanRooms)) {
        if (room.players.includes(socket.id)) {
          delete hangmanRooms[roomId];
          io.of("/hangman").to(roomId).emit("error", "Opponent disconnected");
          break;
        }
      }
    });
  });
}

// Helper functions
function pickRandomWord() {
  const words = ["apple", "banana", "cherry", "dragon", "elephant"];
  return words[Math.floor(Math.random() * words.length)];
}

function getWordDisplay(word, correctLetters) {
  return word
    .split("")
    .map((letter) => (correctLetters.includes(letter) ? letter : "_"))
    .join(" ");
}

module.exports = initHangman;
