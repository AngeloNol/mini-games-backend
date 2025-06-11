// Example Tic Tac Toe logic with win/draw detection and emitting updates

const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],  // rows
  [0,3,6],[1,4,7],[2,5,8],  // cols
  [0,4,8],[2,4,6]           // diagonals
];

function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a,b,c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];  // 'X' or 'O'
    }
  }
  return null;
}

module.exports = function setupTicTacToe(io, socket) {
  let roomId = null;
  let board = Array(9).fill('');
  let currentPlayer = 'X';

  socket.on('tictactoe-join', ({ roomId: r }) => {
    roomId = r;
    socket.join(roomId);
    // reset board on join
    board = Array(9).fill('');
    currentPlayer = 'X';

    io.to(roomId).emit('tictactoe-update', { board, currentPlayer, winner: null });
  });

  socket.on('tictactoe-move', ({ roomId: r, index }) => {
    if (r !== roomId) return;

    if (!board[index] && !checkWinner(board)) {
      board[index] = currentPlayer;
      const winner = checkWinner(board);
      const isDraw = board.every(cell => cell !== '') && !winner;

      if (winner) {
        io.to(roomId).emit('tictactoe-update', { board, currentPlayer, winner });
      } else if (isDraw) {
        io.to(roomId).emit('tictactoe-update', { board, currentPlayer: null, winner: null });
      } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        io.to(roomId).emit('tictactoe-update', { board, currentPlayer, winner: null });
      }
    }
  });

  socket.on('disconnect', () => {
    if(roomId) socket.leave(roomId);
  });
};
