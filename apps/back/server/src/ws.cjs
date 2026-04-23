'use strict';

// WebSocket broadcaster + init.
// Adapted from Olympus (simplified: no drone telemetry, generic channels).
//
// Paxio channels:
//   registry  — agent-registered, agent-updated, claim-made
//   payment   — invoice-created, invoice-paid, payment-failed
//   fap       — route-selected, protocol-switch
//   guard     — classification-result, threat-detected
//   heartbeat — ping/pong

const websocket = require('@fastify/websocket');

const createBroadcaster = () => {
  const clients = new Set();
  const lastMessages = new Map();

  return {
    addClient(socket) {
      clients.add(socket);
      // Replay cached last messages per channel so new client gets current state
      for (const msg of lastMessages.values()) {
        if (socket.readyState === 1) socket.send(msg);
      }
      socket.on('close', () => clients.delete(socket));
    },

    removeClient(socket) {
      clients.delete(socket);
    },

    broadcast(channel, data) {
      const msg = JSON.stringify({ channel, data, ts: Date.now() });
      lastMessages.set(channel, msg);
      for (const client of clients) {
        if (client.readyState === 1) client.send(msg);
      }
    },

    get clientCount() {
      return clients.size;
    },
  };
};

const initWs = (server, broadcaster) => {
  server.register(websocket);

  server.register(async (instance) => {
    instance.get('/ws', { websocket: true }, (socket) => {
      server.log.info('WebSocket client connected');
      broadcaster.addClient(socket);

      socket.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          if (msg.type === 'subscribe') {
            socket.send(
              JSON.stringify({
                type: 'subscribed',
                channel: msg.channel,
              }),
            );
          } else if (msg.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
          }
        } catch (err) {
          server.log.error(err, 'WebSocket message parse error');
          socket.send(JSON.stringify({ error: 'Invalid message' }));
        }
      });

      socket.on('close', () => {
        server.log.info('WebSocket client disconnected');
      });
    });
  });
};

module.exports = { initWs, createBroadcaster };
