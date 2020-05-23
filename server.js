const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);

var players = {};

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});

io.on('connection', function (socket) {
    console.log('a user connected');

    players[socket.id] = {
      x: 0,
      y: 0,
      playerId: socket.id,
      // team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
      team: 'red',
      name: socket.id
    };

    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // when a player moves, update the player data
    socket.on('playerMovement', function (movementData) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      // emit a message to all players about the player that moved
      socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    // when a player moves, update the player data
    socket.on('beginRaceCountDown', function (data) {
      var totalCountDown = 6;

      var deleteRaceTimer = function() {
        clearInterval(raceTimer);
      };

      var raceTimer = setInterval(function() {
        totalCountDown = totalCountDown - 1;

        if (totalCountDown == -1) {
          deleteRaceTimer();
        } else {
          io.emit('raceStartCountDown', totalCountDown);
        }
      }, 1000);
    });

    socket.on('disconnect', function () {
      console.log('user disconnected');
      // remove this player from our players object
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnect', socket.id);
    });
});

// server.listen(3000, function () {
//     console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
// });

// app.use('/', express.static(__dirname + "/frontend"));

// function setupAuthoritativePhaser() {
//     JSDOM.fromFile(path.join(__dirname, 'authoritative_server/index.html'), {
//         // To run the scripts in the html file
//         runScripts: "dangerously",
//         // Also load supported external resources
//         resources: "usable",
//         // So requestAnimatinFrame events fire
//         pretendToBeVisual: true
//     }).then((dom) => {
//         dom.window.URL.createObjectURL = (blob) => {
//             if (blob) {
//                 return datauri.format(blob.type, blob[Object.getOwnPropertySymbols(blob)[0]]._buffer).content;
//             }
//         };
//         dom.window.URL.revokeObjectURL = (objectURL) => { };
//         dom.window.gameLoaded = () => {
//             server.listen(8081, function () {
//                 console.log(`Listening on ${server.address().port}`);
//             });
//         };
//         dom.window.io = io;
//     }).catch((error) => {
//         console.log(error.message);
//     });
// }

// setupAuthoritativePhaser();

app.use(express.static(__dirname + '/frontend'));

// app.get('/', function (req, res) {
//     res.sendFile(__dirname + '/index.html');
// });
