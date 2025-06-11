// Connect 4 server-side logic with room creation and multi-player support

const rooms = {};

const ROWS = 6;
const COLS = 7;

function createEmptyBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

function checkWinner(board, playerColor) {
  // Horizontal check
  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<=COLS-4; c++) {
      if (board[r][c] === playerColor &&
          board[r][c+1] === playerColor &&
          board[r][c+2] === playerColor &&
          board[r][c+3] === playerColor) {
        return true;
      }
    }
  }

  // Vertical check
  for(let c=0; c<COLS; c++) {
    for(let r=0; r<=ROWS-4; r++) {
      if (board[r][c] === playerColor &&
          board[r+1][c] === playerColor &&
          board[r+2][c] === playerColor &&
          board[r+3][c] === playerColor) {
        return true;
      }
    }
  }

  // Diagonal checks
  for(let r=0; r<=ROWS-4; r++) {
    for(let c=0; c<=COLS-4; c++) {
      if (board[r][c] === playerColor &&
          board[r+1][c+1] === playerColor &&
          board[r+2][c+2] === playerColor &&
          board[r+3][c+3] === playerColor) {
        return true;
      }
    }
  }

  for(let r=3; r<ROWS; r++) {
    for(let c=0; c<=COLS-4; c++) {
      if (board[r][c] === playerColor &&
          board[r-1][c+1] === playerColor &&
          board[r-2][c+2] === playerColor &&
          board[r-3][c+3] === playerColor) {
        return true;
      }
    }
  }

  return false;
}

function connect4(io, socket) {
  // Helper: generate room id
  function generateRoomId() {
    return Math.random().toString(36).substr(2, 6);
  }

  socket.on('connect4-create-room', ({ playerCount }) => {
    if (![2,3,4].includes(playerCount)) {
      socket.emit('connect4-error', 'Player count must be 2, 3, or 4');
      return;
    }

    const roomId = generateRoomId();

    rooms[roomId] = {
      board: createEmptyBoard(),
      players: [],
      currentPlayerIndex: 0,
      playerCount,
      colors: ['red', 'yellow', 'green', 'purple']
    };

    socket.join(roomId);
    rooms[roomId].players.push(socket.id);

    socket.emit('connect4-room-created', { roomId });
  });

  socket.on('connect4-join-room', ({ roomId }) => {
    if (!rooms[roomId]) {
      socket.emit('connect4-error', 'Room does not exist');
      return;
    }
    const room = rooms[roomId];

    if (room.players.length >= room.playerCount) {
      socket.emit('connect4-error', 'Room is full');
      return;
    }

    socket.join(roomId);
    room.players.push(socket.id);

    io.to(roomId).emit('connect4-room-joined', { roomId });

    // Send current board and state to all players
    io.to(roomId).emit('connect4-update', {
      board: room.board,
      players: room.players,
      currentPlayerIndex: room.currentPlayerIndex
    });
  });

  socket.on('connect4-move', ({ roomId, col }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('connect4-error', 'Room does not exist');
      return;
    }

    const currentPlayerId = room.players[room.currentPlayerIndex];
    if (socket.id !== currentPlayerId) {
      socket.emit('connect4-error', 'Not your turn');
      return;
    }

    // Find lowest empty row in this column
    let rowToPlace = -1;
    for(let r=ROWS-1; r>=0; r--) {
      if (room.board[r][col] === null) {
        rowToPlace = r;
        break;
      }
    }

    if(rowToPlace === -1) {
      socket.emit('connect4-error', 'Column full');
      return;
    }

    // Place player's color disc
    const color = room.colors[room.currentPlayerIndex];
    room.board[rowToPlace][col] = color;

    // Check winner
    if (checkWinner(room.board, color)) {
      io.to(roomId).emit('connect4-update', {
        board: room.board,
        players: room.players,
        currentPlayerIndex: room.currentPlayerIndex
      });
      io.to(roomId).emit('connect4-game-over', { message: `Player ${color} wins!` });
      delete rooms[roomId]; // optional: destroy room on win
      return;
    }

    // Check draw (board full)
    const isDraw = room.board.every(row => row.every(cell => cell !== null));
    if (isDraw) {
      io.to(roomId).emit('connect4-update', {
        board: room.board,
        players: room.players,
        currentPlayerIndex: room.currentPlayerIndex
      });
      io.to(roomId).emit('connect4-game-over', { message: 'Game is a draw!' });
      delete rooms[roomId];
      return;
    }

    // Next player's turn
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.playerCount;

    io.to(roomId).emit('connect4-update', {
      board: room.board,
      players: room.players,
      currentPlayerIndex: room.currentPlayerIndex
    });
  });

  socket.on('disconnecting', () => {
    // Remove player from rooms if needed
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        const room = rooms[roomId];
        const idx = room.players.indexOf(socket.id);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          io.to(roomId).emit('connect4-game-over', { message: 'Player disconnected. Game ended.' });
          delete rooms[roomId];
        }
      }
    }
  });
}

module.exports = connect4;
