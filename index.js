const { cpus } = require('os');
const { isMaster, fork } = require('cluster');
const { argv, env } = require('process');
const { promisify } = require('util');
const { join } = require('path');
const { readFile } = require('fs');
const { transformAsync } = require('@babel/core');
const { default: generate } = require('@babel/generator');
const express = require('express');

const cwd = process.cwd();
const scriptFile = argv[2] || 'index.js';
const host = env.HOST || '127.0.0.1';
const port = Number(env.PORT || 8000);

if (isMaster) {
  cpus().forEach(() => fork());
  console.log(`Listening at http://${host}:${port}`);
}
else {
  const server = express();

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

  server.listen(port, host);
}
