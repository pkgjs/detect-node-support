'use strict';

const SimpleGit = require('simple-git/promise');

/* $lab:coverage:off$ */
// this is wrapped primarily to be able to stub it
exports.simpleGit = (...args) => {

    return SimpleGit(...args);
};
/* $lab:coverage:on$ */

exports.getErrorMessage = (error) => {

    if (typeof error === 'string') {
        return error;
    }

    if (error && error.message) {
        return error.message;
    }

    return null;
};
