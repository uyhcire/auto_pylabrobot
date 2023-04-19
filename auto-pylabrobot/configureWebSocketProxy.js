const WebSocket = require('ws');

function configureWebSocketProxy(app, proxyRoute) {
  app.get(proxyRoute, (req, res) => {
    const wss = new WebSocket.Server({ noServer: true });

    wss.handleUpgrade(req, res.socket, Buffer.alloc(0), (client) => {
      const target = new WebSocket(
        `ws://localhost:${req.cookies.serverInternalSimulatorWebsocketPort}`
      );

      const clientMessageBuffer = []; // Buffer to store client messages

      // Forward messages from the client to the target server
      client.on('message', (message) => {
        if (target.readyState === WebSocket.OPEN) {
          target.send(message);
        } else {
          clientMessageBuffer.push(message);
        }
      });

      target.on('open', () => {
        // Send buffered messages from the client to the target server
        while (clientMessageBuffer.length > 0) {
          const message = clientMessageBuffer.shift();
          target.send(message);
        }

        // Forward messages from the target server to the client
        target.on('message', (message) => {
          // Send the message as a text frame so that the client code can parse it properly
          client.send(message, { binary: false });
        });
      });

      // Handle WebSocket disconnection
      client.on('close', () => {
        target.close();
      });

      target.on('close', () => {
        client.close();
      });

      target.on('error', (error) => {});
    });
  });
}

module.exports = configureWebSocketProxy;
