'use strict';

const Debug = require('debug');


const internals = {
    loggers: {}
};


internals.getLogger = (tags) => {

    const suffix = tags.join(':');

    if (!internals.loggers[suffix]) {
        internals.loggers[suffix] = Debug(`detect-node-support:${suffix}`);
    }

    return internals.loggers[suffix];
};


exports.log = (tags, ...args) => {

    const logger = internals.getLogger(tags);
    logger(...args);
};


exports.warn = (tags, ...args) => {

    exports.log(['warn', ...tags], ...args);
};


exports.error = (tags, ...args) => {

    exports.log(['error', ...tags], ...args);
};
