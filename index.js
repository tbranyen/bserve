const { argv, env } = require('process');
const { promisify } = require('util');
const { join } = require('path');
const { readFile } = require('fs');
const { transformAsync } = require('@babel/core');
const { default: generate } = require('@babel/generator');
const getPort = require('get-port');
const express = require('express');
const server = express();

const cwd = process.cwd();
const host = env.HOST || '127.0.0.1';
const port = Number(env.PORT || 8000);
const scriptFile = argv[2] || 'index.js';

server.get('*.js', async (req, res, next) => {
  const filename = join(cwd, req.path);
  const code = await promisify(readFile)(filename, { encoding: 'utf8' });
  const { ast } = await transformAsync(code, { filename, cwd, ast: true });

  res.type('application/javascript');
  res.end(generate(ast).code);
});

server.use(express.static(cwd));

server.get('/', (req, res, next) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <title>Serving: ${cwd}</title>
      </head>

      <body>
        <script type="module" src="${scriptFile}"></script>
      </body>
    </html>
  `);
});

getPort({ port }).then(port => {
  server.listen(port, host);
  console.log(`Listening at http://${host}:${port}`);
});
