'use strict';

const Package = require('../package.json');


exports.userAgent = `${Package.name}/${Package.version} (${Package.homepage})`;
