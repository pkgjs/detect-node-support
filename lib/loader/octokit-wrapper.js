'use strict';

const { Octokit } = require('@octokit/rest');

const Constants = require('../constants');

exports.create = () => {

    const octokit = new Octokit({
        userAgent: Constants.userAgent
    });

    // @todo: onRateLimit
    // @todo: auth

    return octokit;
};
