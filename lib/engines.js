'use strict';

exports.detect = ({ packageJson }) => {

    if (packageJson.engines) {

        return {
            engines: packageJson.engines.node
        };
    }
};
