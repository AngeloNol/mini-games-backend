# 🎮 Multiplayer Mini-Games Backend

This is the backend server for the Multiplayer Mini-Games platform, built using **Node.js**, **Express**, and **Socket.IO**. It supports real-time multiplayer gameplay for:

- ✅ Tic Tac Toe
- ✅ Hangman (with custom or category-based words)
- ✅ Connect 4 (supports 2 to 4 players with animated falling discs)

The frontend is hosted separately on GitHub Pages and communicates with this backend via WebSockets.

---

## 🚀 Features

- Real-time multiplayer using **Socket.IO**
- Dynamic room generation and invite-link based game joining
- Game state management on the server for each game
- Support for custom user input in Hangman and animated gameplay in Connect 4

---

## 📁 Project Structure

```plaintext

├── backend/                        # Render deployment
│   ├── server.js                   # Express + Socket.IO server
│   ├── games/
│   │   ├── tictactoe.js            # Server-side game logic
│   │   ├── hangman.js              # Server-side game logic
│   │   └── connect4.js             # Server-side game logic
│   ├── utils/
│   │   └── roomManager.js          # Shared room handling
