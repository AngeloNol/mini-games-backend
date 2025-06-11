const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function checkWinner(board) {
  // Check horizontal, vertical, diagonal lines for 4 in a row
  const directions = [
    [0,1], [1,0], [1,1], [1,-1]
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c]) continue;

      for (const [dr, dc] of directions) {
        let count = 0;
        let rr = r;
        let cc = c;

        while (
          rr >= 0 && rr < ROWS &&
          cc >= 0 && cc < COLS &&
          board[rr][cc] === board[r][c]
        ) {
          count++;
          if (count === 4) return board[r][c];
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return null;
}

module.exports = function setupConnect4(io, socket) {
  let roomId = null;
  let board = createBoard();
  let players = [];
  let currentPlayerIndex = 0;
  let gameOver = false;

  socket.on('connect4-join', ({ roomId: r }) => {
    roomId = r;
    socket.join(roomId);

    if (!players.includes(socket.id)) {
      players.push(socket.id);
    }

    board = createBoard();
    currentPlayerIndex = 0;
    gameOver = false;

    io.to(roomId).emit('connect4-update', {
      board,
      currentPlayer: players[currentPlayerIndex],
      winner: null
    });
  });

  socket.on('connect4-move', ({ roomId: r, column }) => {
    if (r !== roomId || gameOver) return;
    if (socket.id !== players[currentPlayerIndex]) return; // only current player can move

    // Find lowest empty row in column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][column]) {
        row = r;
        break;
      }
    }
    if (row === -1) return; // column full

    board[row][column] = socket.id;

    const winner = checkWinner(board);
    const isDraw = board.every(row => row.every(cell => cell !== null));

    if (winner) {
      gameOver = true;
      io.to(roomId).emit('connect4-update', { board, currentPlayer: null, winner });
    } else if (isDraw) {
      gameOver = true;
      io.to(roomId).emit('connect4-update', { board, currentPlayer: null, winner: null });
    } else {
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      io.to(roomId).emit('connect4-update', { board, currentPlayer: players[currentPlayerIndex], winner: null });
    }
  });

  socket.on('disconnect', () => {
    if(roomId) socket.leave(roomId);
    players = players.filter(id => id !== socket.id);
  });
};
