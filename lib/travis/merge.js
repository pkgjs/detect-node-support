'use strict';

// ref: https://github.com/travis-ci/travis-yml/blob/bf82881491134c72a64778f9664a8dd3f97158e7/lib/travis/yml/support/merge.rb

const internals = {};


internals.isObject = (arg) => typeof arg === 'object' && !Array.isArray(arg);


exports.deep_merge_append = (left, right) => {

    for (const key in right) {

        if (internals.isObject(left[key]) && internals.isObject(right[key])) {
            exports.deep_merge_append(left[key], right[key]);
            continue;
        }

        if (Array.isArray(left[key]) && Array.isArray(right[key])) {
            left[key].push(...right[key]);
            continue;
        }

        left[key] = right[key];
    }
};

exports.deep_merge_prepend = (left, right) => {

    for (const key in right) {

        if (internals.isObject(left[key]) && internals.isObject(right[key])) {
            exports.deep_merge_prepend(left[key], right[key]);
            continue;
        }

        if (Array.isArray(left[key]) && Array.isArray(right[key])) {
            left[key].unshift(...right[key]);
            continue;
        }

        left[key] = right[key];
    }
};

exports.deep_merge = (left, right) => {

    for (const key in right) {

        if (internals.isObject(left[key]) && internals.isObject(right[key])) {
            exports.deep_merge(left[key], right[key]);
            continue;
        }

        left[key] = right[key];
    }
};

exports.merge = (left, right) => {

    for (const key in right) {
        left[key] = right[key];
    }
};
