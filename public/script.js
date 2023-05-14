const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const input = document.querySelector('#input input');
const button = document.querySelector('#input button');
const messages = document.querySelector('#messages');

let partnerId = null;
let localStream;
let peerConnection;

// Get local video stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  })
  .catch(error => {
    console.error('Error accessing media devices.', error);
  });

// Create a new RTCPeerConnection
function createPeerConnection() {
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  };

  peerConnection = new RTCPeerConnection(configuration);

  // Add local stream to the peer connection
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Listen for remote stream and set it as the source for the remote video element
  peerConnection.addEventListener('track', event => {
    remoteVideo.srcObject = event.streams[0];
  });

  // Listen for ICE candidates and send them to the partner
  peerConnection.addEventListener('icecandidate', event => {
    if (event.candidate) {
      socket.emit('iceCandidate', { to: partnerId, candidate: event.candidate });
    }
  });
}

socket.on('paired', (id) => {
  partnerId = id;
  createPeerConnection();

  // Create an offer and set it as the local description
  peerConnection.createOffer()
    .then(offer => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      socket.emit('offer', { to: partnerId, offer: peerConnection.localDescription });
    })
    .catch(error => {
      console.error('Error creating offer:', error);
    });

  const messageElement = document.createElement('div');
  messageElement.textContent = 'Connected to a stranger!';
  messages.appendChild(messageElement);
});

socket.on('offer', (data) => {
  peerConnection.setRemoteDescription(data.offer)
    .then(() => {
      return peerConnection.createAnswer();
    })
    .then(answer => {
      return peerConnection.setLocalDescription(answer);
    })
    .then(() => {
      socket.emit('answer', { to: data.from, answer: peerConnection.localDescription });
    })
    .catch(error => {
      console.error('Error handling offer:', error);
    });
});

socket.on('answer', (data) => {
  peerConnection.setRemoteDescription(data.answer)
    .catch(error => {
      console.error('Error handling answer:', error);
    });
});

socket.on('iceCandidate', (data) => {
  peerConnection.addIceCandidate(data.candidate)
    .catch(error => {
      console.error('Error handling ICE candidate:', error);
    });
});

button.addEventListener('click', () => {
  const message = input.value.trim();
  if (message && partnerId) {
    socket.emit('message', { to: partnerId, message: message });
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messages.appendChild(messageElement);
    input.value = '';
  }
});

socket.on('message', (message) => {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messages.appendChild(messageElement);
});

