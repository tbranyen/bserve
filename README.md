# bserve

A static HTTP server that transpiles JavaScript automatically using Babel.

install from npm:

```
npm install bserve @babel/core --save
```

configure your package.json:

```
{
  "scripts": {
    "start": "bserve"
  }
}
```

start the server:

```
npm start
```

**CLI args**

`scriptFile` - Defaults to `index.js`, determines the file to automatically
inject if you don't have an `index.html` file.

License: MIT
