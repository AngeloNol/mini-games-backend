const WORDS = {
  movies: ['inception', 'matrix', 'avatar'],
  animals: ['elephant', 'giraffe', 'dolphin'],
};

module.exports = function setupHangman(io, socket) {
  let roomId = null;
  let word = '';
  let displayWord = '';
  let guessesLeft = 6;
  let guessedLetters = [];
  let status = 'playing'; // playing, win, lose

  socket.on('hangman-join', ({ roomId: r, category, customWord }) => {
    roomId = r;
    socket.join(roomId);

    if (customWord) {
      word = customWord.toLowerCase();
    } else if (WORDS[category]) {
      word = WORDS[category][Math.floor(Math.random() * WORDS[category].length)];
    } else {
      word = WORDS.movies[0];
    }

    displayWord = word.replace(/[^ ]/g, '_');
    guessesLeft = 6;
    guessedLetters = [];
    status = 'playing';

    io.to(roomId).emit('hangman-update', {
      wordDisplay: displayWord,
      guessesLeft,
      incorrectGuesses: [],
      status
    });
  });

  socket.on('hangman-guess', ({ roomId: r, letter }) => {
    if (r !== roomId || status !== 'playing') return;

    letter = letter.toLowerCase();
    if (guessedLetters.includes(letter)) return;

    guessedLetters.push(letter);

    if (!word.includes(letter)) {
      guessesLeft--;
    }

    // Update display word
    displayWord = word.split('').map(ch => {
      if (ch === ' ') return ' ';
      return guessedLetters.includes(ch) ? ch : '_';
    }).join('');

    // Check win or lose
    if (!displayWord.includes('_')) {
      status = 'win';
    } else if (guessesLeft <= 0) {
      status = 'lose';
    }

    io.to(roomId).emit('hangman-update', {
      wordDisplay: displayWord,
      guessesLeft,
      incorrectGuesses: guessedLetters.filter(l => !word.includes(l)),
      status
    });
  });

  socket.on('disconnect', () => {
    if(roomId) socket.leave(roomId);
  });
};
