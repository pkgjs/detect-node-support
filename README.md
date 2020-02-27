# detect-node-support

List the Node.js versions supported by the package/repository

## Usage (command line)

```
$ npx detect-node-support [path]
```

Prints the supported Node.js versions for the package at the specified path. When the path is not a git repository - tries to read the git repository from `package.json` and tries to detect the versions listed in the repository as well.

When `path` is omitted, tries to detect the versions for `cwd`. 

```
$ npx detect-node-support [package name]
```

Prints supported Node.js versions for the package from the registry.

```
$ npx detect-node-support [repository git URL]
```

Prints supported Node.js versions for the package at the git URL.

## Usage (library)

```
const result = await require('detect-node-support').detect({ path });
```

`path` should be a folder in the local file system. When the path is not a git repository - tries to read the git repository from `package.json` and tries to detect the versions listed in the repository as well. 

```
const result = await require('detect-node-support').detect({ packageName });
```

`packageName` is a string name for the package in the registry. 

```
const result = await require('detect-node-support').detect({ repository });
```

`repository` is a URL for a git repository.

### Result

- Throws if the `path` / `repository` does not have a `package.json`
- Throws if `packageName` does not exist in the registry
- Throws when unable to detect a git repository for the package

Otherwise returns an object with:

```javascript
const result = {

    // the `name` field of the `package.json`
    "name": "package-name",    
    
    // the `version` field of the `package.json` when used with `path` / `repository`,
    // the `latest` dist-tag version when used with `package`
    "version": "0.0.0",

    // the current time when the result is returned
    "timestamp": 1577115956099,

    // git commit hash of the repository HEAD at the time of scanning
    "commit": "2de28c8c4ab8ac998d403509123736929131908c",

    // will be left out when not present in the `package.json`
    // a copy of the `engines.node` field from the `package.json` if present
    "engines": ">=x.y.z", 

    // will be left out when `.travis.yml` file is not present
    "travis": {
        // the list of versions as detected by inspecting `node_js` / `matrix` configuration
        // will be an empty array when no versions are detected or the project is not a Node.js project
        // will contain "latest" when `language: node_js` specified, but no explicit versions detected
        "raw": ["8", "10", "lts/*", "invalid-specifier"],

        // raw version specifiers and keywords (as keys) resolved to exact Node.js versions (as values)
        // the value will be `false` when the specifier/keyword is unrecognized
        // will be an empty object when the `raw` array is empty
        "resolved": {
            "8": "8.17.0", 
            "10": "10.18.0", 
            "lts/*": "12.14.0",
            "invalid-specifier": false
        }       
    }
}
```
