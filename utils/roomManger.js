// Simple in-memory room manager to track rooms and players
const rooms = {};

/**
 * Creates a new room or returns existing room if exists.
 * @param {string} roomId - Unique room identifier
 * @returns {object} room object
 */
function createRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      players: [],
      gameState: {}
    };
  }
  return rooms[roomId];
}

/**
 * Adds a player to a room.
 * @param {string} roomId 
 * @param {string} playerId 
 */
function addPlayer(roomId, playerId) {
  const room = createRoom(roomId);
  if (!room.players.includes(playerId)) {
    room.players.push(playerId);
  }
}

/**
 * Removes a player from a room.
 * @param {string} roomId 
 * @param {string} playerId 
 */
function removePlayer(roomId, playerId) {
  const room = rooms[roomId];
  if (room) {
    room.players = room.players.filter(p => p !== playerId);
    if (room.players.length === 0) {
      delete rooms[roomId]; // Delete empty room
    }
  }
}

/**
 * Get players in a room
 * @param {string} roomId 
 * @returns {string[]} array of player IDs
 */
function getPlayers(roomId) {
  const room = rooms[roomId];
  return room ? room.players : [];
}

module.exports = {
  createRoom,
  addPlayer,
  removePlayer,
  getPlayers,
  rooms
};
