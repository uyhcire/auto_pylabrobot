const express = require('express');
const cookieParser = require('cookie-parser');
const next = require('next');
const configureWebSocketProxy = require('./configureWebSocketProxy');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = express();
    server.use(cookieParser());

    configureWebSocketProxy(server, '/websocketProxy');

    // Handle all other routes with Next.js
    server.get('*', (req, res) => {
      return handle(req, res);
    });
    server.post('*', (req, res) => {
      return handle(req, res);
    });
    server.put('*', (req, res) => {
      return handle(req, res);
    });
    server.patch('*', (req, res) => {
      return handle(req, res);
    });
    server.delete('*', (req, res) => {
      return handle(req, res);
    });

    // Use process.env.PORT for the port, with a fallback to 3000
    const port = process.env.PORT || 3000;

    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
  });
