'use strict';

const { Octokit } = require('@octokit/rest');
const { throttling } = require('@octokit/plugin-throttling');

const Constants = require('../constants');
const Logger = require('../logger');


const internals = {
    Octokit: Octokit.plugin(throttling)
};


exports.create = () => {

    const octokit = new internals.Octokit({
        auth: process.env.GH_TOKEN,
        userAgent: Constants.userAgent,
        throttle: {
            onRateLimit: (retryAfter, options) => {

                Logger.warn(['loader'], 'Request quota exceeded for request %s %s. Will retry in %d seconds. Have you set a GH_TOKEN in env?', options.method, options.url, retryAfter);

                return true;
            },
            onAbuseLimit: (retryAfter, options) => {

                return false;
            }
        }
    });

    return octokit;
};
