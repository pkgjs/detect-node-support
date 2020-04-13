'use strict';

const Utils = require('../lib/utils');

const { describe, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

describe('Utils', () => {

    describe('getErrorMessage()', () => {

        it('returns error message when present', () => {

            expect(Utils.getErrorMessage(new Error('Test error'))).to.equal('Test error');
        });

        it('returns the string', () => {

            expect(Utils.getErrorMessage('Test error')).to.equal('Test error');
        });

        it('null for an object without a message', () => {

            expect(Utils.getErrorMessage({})).to.equal(null);
        });

        it('null for null', () => {

            expect(Utils.getErrorMessage(null)).to.equal(null);
        });


        it('null for undefined', () => {

            expect(Utils.getErrorMessage()).to.equal(null);
        });
    });
});
