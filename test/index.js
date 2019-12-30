'use strict';

const Path = require('path');

const NodeSupport = require('..');


const { describe, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

describe('node-support', () => {

    describe('detect()', () => {

        describe('path', () => {

            it('returns node versions from .travis.yml at the path', async () => {

                const path = Path.join(__dirname, '..');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'node-support',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['10', '12', '13']
                    }
                });
            });
        });
    });
});
