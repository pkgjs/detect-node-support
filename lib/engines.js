'use strict';

exports.detect = ({ engines }) => {

    if (engines) {

        return {
            engines: engines.node
        };
    }
};
