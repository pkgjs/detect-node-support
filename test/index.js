'use strict';

const NodeSupport = require('..');


const { describe, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

describe('node-support', () => {

    it('is not implemented', () => {

        expect(NodeSupport).to.throw('Not implemented');
    });
});
