# detect-node-support

List the Node.js versions supported by the package/repository

This repository is managed by the [Package Maintenance Working Group](https://github.com/nodejs/package-maintenance), see [Governance](https://github.com/nodejs/package-maintenance/blob/master/Governance.md).

## Setup

No setup is required, however if you do not have a `GH_TOKEN` environment limit, you will likely hit a request rate limit on Github API, which may result in very long wait times for retries.

## Usage (command line)

```
$ npx detect-node-support [options] <path>
```

Prints the supported Node.js versions for the package at the specified path. When the path is not a git repository - tries to read the git repository from `package.json` and tries to detect the versions listed in the repository as well.

When `path` is omitted, tries to detect the versions for `cwd`. 

```
$ npx detect-node-support [options] <package name>
```

Prints supported Node.js versions for the package from the registry.

```
$ npx detect-node-support [options] <repository git URL>
```

Prints supported Node.js versions for the package at the git URL.

### Options

* `--deep` - when used with --deps, include indirect dependencies
* `--deps` - include the support information of direct production dependencies
* `--dev` - when used with --deps, include dev dependencies

## Usage (library)

```
const result = await require('detect-node-support').detect({ path }, options);
```

`path` should be a folder in the local file system. When the path is not a git repository - tries to read the git repository from `package.json` and tries to detect the versions listed in the repository as well. 

```
const result = await require('detect-node-support').detect({ packageName }, options);
```

`packageName` is a string name for the package in the registry. 

```
const result = await require('detect-node-support').detect({ repository }, options);
```

`repository` is a URL for a git repository.

```
const result = await require('detect-node-support').detect(what, options);
```

`what` is a string containing either a package name, or a local path, or a reference to a git repository.

### Options

- `deep: false` - when `true` and used `deps: true`, include indirect dependencies
- `deps: false` - when `true`, include the support information of all dependencies.
- `dev: false` - when `true` and used with `deps: true`, include dev dependencies

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
    },

    // only present when explicitly requested
    "dependencies": {

        // will contain a support object for every unique dependency in the tree
        // note that the `version` will be the _latest_ version available in the registry
        // see below for the actual versions installed   
        "support": [
            { 
                "name": "dependency-A" 
                /*... other fields ...*/ 
            },
            { 
                "name": "dependency-B" 
                /*... other fields ...*/ 
            }           
        ],
    
        // will contain a list of unique versions for each dependency found in the dependency tree
        "versions": {
            "dependency-A": ["0.0.10", "1.2.5"],
            "dependency-B": ["0.5.3", "1.0.0"],
            "dependency-C": ["7.8.9"]
        },
        
        // will contain a list of errors that were encountered while resolving dependency support information
        "errors": {
            "dependency-C": {
                // the `message` will always be either a string or `null`
                "message": "Failed to download some information or something"
            }       
        }       
    }
}
```
