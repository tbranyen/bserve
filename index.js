const { cpus } = require('os');
const { isMaster, fork } = require('cluster');
const { argv, env } = require('process');
const { promisify } = require('util');
const { join } = require('path');
const { stat, readFile } = require('fs');
const { transformAsync } = require('@babel/core');
const { default: generate } = require('@babel/generator');
const express = require('express');

const { stringify } = JSON;
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
    const { mtime } = await promisify(stat)(filename);

    // TODO Cache invalidation here will be hard, but this is a start.
    if (+req.headers['if-none-match'] === +mtime) {
      return res.status(304).end();
    }

    const timestamp = await promisify(readFile)(filename, { encoding: 'utf8' });
    const code = await promisify(readFile)(filename, { encoding: 'utf8' });
    const { ast, map } = await transformAsync(code, { filename, cwd, ast: true, sourceMaps: true });
    const source = generate(ast, { sourceFileName: req.path });
    const sourceMap = Buffer.from(stringify(map)).toString('base64');

    res.header('Cache-Control', 'no-cache');
    res.header('ETag', +mtime);
    res.header('X-Powered-By', 'bserve');
    res.type('application/javascript');
    res.end(`
      ${source.code}
      //# sourceMappingURL=data:application/json;charset=utf-8;base64,${sourceMap}
    `);
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
