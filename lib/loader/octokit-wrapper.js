'use strict';

const { Octokit } = require('@octokit/rest');

exports.create = () => {

    const octokit = new Octokit();

    // @todo: onRateLimit
    // @todo: auth
    // @todo: user agent

    return octokit;
};
