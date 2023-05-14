const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const socket = io('https://yourdomain.com');


const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const users = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send the number of connected users to the new user
  socket.emit('userCount', Object.keys(users).length + 1);

  // Find a random user to pair with
  const userIds = Object.keys(users);
  const randomUser = userIds[Math.floor(Math.random() * userIds.length)];

  if (randomUser) {
    // Pair the users and remove the random user from the waiting list
    socket.emit('paired', randomUser);
    socket.to(randomUser).emit('paired', socket.id);
    delete users[randomUser];
  } else {
    // Add the user to the waiting list
    users[socket.id] = true;
  }

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete users[socket.id];
  });

  socket.on('message', (data) => {
    console.log('Message received:', data);
    socket.to(data.to).emit('message', data.message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


