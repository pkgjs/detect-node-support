'use strict';

const SimpleGit = require('simple-git/promise');

/* $lab:coverage:off$ */
// this is wrapped primarily to be able to stub it
exports.simpleGit = (...args) => SimpleGit(...args);
/* $lab:coverage:on$ */
