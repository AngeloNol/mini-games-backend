// backend/games/connect4.js

const rooms = {};

function createEmptyBoard() {
  const ROWS = 6;
  const COLS = 7;
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = null;
    }
  }
  return board;
}

function checkWin(board, color) {
  const ROWS = board.length;
  const COLS = board[0].length;

  // Check horizontal, vertical, diagonal 4-in-a-row
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== color) continue;

      // Horizontal
      if (c + 3 < COLS &&
          board[r][c + 1] === color &&
          board[r][c + 2] === color &&
          board[r][c + 3] === color) return true;

      // Vertical
      if (r + 3 < ROWS &&
          board[r + 1][c] === color &&
          board[r + 2][c] === color &&
          board[r + 3][c] === color) return true;

      // Diagonal down-right
      if (r + 3 < ROWS && c + 3 < COLS &&
          board[r + 1][c + 1] === color &&
          board[r + 2][c + 2] === color &&
          board[r + 3][c + 3] === color) return true;

      // Diagonal down-left
      if (r + 3 < ROWS && c - 3 >= 0 &&
          board[r + 1][c - 1] === color &&
          board[r + 2][c - 2] === color &&
          board[r + 3][c - 3] === color) return true;
    }
  }
  return false;
}

function isBoardFull(board) {
  return board.every(row => row.every(cell => cell !== null));
}

const COLORS = ['red', 'yellow', 'green', 'blue'];

module.exports = function setupConnect4(io, socket) {

  socket.on('joinRoom', ({ roomId, game, playerCount }) => {
    if (game !== 'connect4') return;

    if (!roomId) {
      socket.emit('error', 'Room ID required');
      return;
    }

    // Create room if doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        board: createEmptyBoard(),
        currentPlayerIndex: 0,
        maxPlayers: Math.min(Math.max(parseInt(playerCount) || 2, 2), 4), // clamp 2-4
        colorsAssigned: {},
        gameOver: false,
      };
    }

    const room = rooms[roomId];

    if (room.gameOver) {
      socket.emit('error', 'Game is over, start a new room');
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', `Room full. Max players: ${room.maxPlayers}`);
      return;
    }

    socket.join(roomId);

    // Assign a unique color to player
    const assignedColors = Object.values(room.colorsAssigned);
    let playerColor = COLORS.find(c => !assignedColors.includes(c));
    if (!playerColor) playerColor = 'black'; // fallback

    room.players.push(socket.id);
    room.colorsAssigned[socket.id] = playerColor;

    // Notify all players about current state
    io.to(roomId).emit('connect4-update', {
      board: room.board,
      currentPlayerIndex: room.currentPlayerIndex,
      players: room.players,
      colors: room.colorsAssigned,
      maxPlayers: room.maxPlayers,
    });
  });

  socket.on('connect4-move', ({ roomId, col }) => {
    const room = rooms[roomId];
    if (!room || room.gameOver) {
      socket.emit('error', 'Invalid room or game over');
      return;
    }

    if (room.players[room.currentPlayerIndex] !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }

    // Place disc in the lowest available row in the selected column
    for (let r = room.board.length - 1; r >= 0; r--) {
      if (room.board[r][col] === null) {
        room.board[r][col] = room.colorsAssigned[socket.id];
        break;
      }
      if (r === 0) {
        socket.emit('error', 'Column is full');
        return;
      }
    }

    // Check for win
    if (checkWin(room.board, room.colorsAssigned[socket.id])) {
      room.gameOver = true;
      io.to(roomId).emit('connect4-game-over', { winner: socket.id });
      return;
    }

    // Check for draw
    if (isBoardFull(room.board)) {
      room.gameOver = true;
      io.to(roomId).emit('connect4-game-over', { winner: null });
      return;
    }

    // Next player's turn
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

    io.to(roomId).emit('connect4-update', {
      board: room.board,
      currentPlayerIndex: room.currentPlayerIndex,
      players: room.players,
      colors: room.colorsAssigned,
      maxPlayers: room.maxPlayers,
    });
  });

  socket.on('disconnect', () => {
    // Remove player from any rooms they were in
    for (const [roomId, room] of Object.entries(rooms)) {
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        delete room.colorsAssigned[socket.id];
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          if (room.currentPlayerIndex >= room.players.length) {
            room.currentPlayerIndex = 0;
          }
          io.to(roomId).emit('connect4-update', {
            board: room.board,
            currentPlayerIndex: room.currentPlayerIndex,
            players: room.players,
            colors: room.colorsAssigned,
            maxPlayers: room.maxPlayers,
          });
        }
      }
    }
  });

};
