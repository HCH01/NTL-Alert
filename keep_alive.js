// keep_alive.js
import http from 'http';

const server = http.createServer((req, res) => {
  res.write('SMT Team is the best ');
  res.end();
});

// Use the PORT environment variable provided by Render, 
// or default to 3000 for local testing.
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Keep-Alive server listening on port ${port}`);
});

export default server;