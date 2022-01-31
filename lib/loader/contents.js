'use strict';

const Yaml = require('js-yaml');

exports.convert = (buffer, options) => {

    if (options.json) {
        return JSON.parse(buffer.toString());
    }

    if (options.yaml) {
        return Yaml.load(buffer, {
            schema: Yaml.FAILSAFE_SCHEMA,
            json: true
        });
    }

    return buffer;
};
