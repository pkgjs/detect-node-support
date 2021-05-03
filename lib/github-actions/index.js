'use strict';

const Nv = require('@pkgjs/nv');

exports.detect = async (meta) => {

    const files = await meta.loadFolder('.github/workflows');
    const rawSet = new Set();

    if (!files.length) {
        return;
    }

    for (const file of files) {

        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
            continue;
        }

        const workflow = await meta.loadFile(`.github/workflows/${file}`, { yaml: true });

        for (const job of Object.values(workflow.jobs)) {

            const nodeSteps = job.steps.filter(({ uses }) => uses && uses.startsWith('actions/setup-node'));
            for (const step of nodeSteps) {
                const nodeVersion = step.with && step.with['node-version'];

                if (!nodeVersion) {
                    // @todo - no node version defined - use default? what is the default?
                    continue;
                }

                const matrixMatch = nodeVersion.match(/^\${{\s+matrix.(?<matrixVarName>.*)\s+}}$/);
                if (matrixMatch) {
                    const matrix = job.strategy.matrix[matrixMatch.groups.matrixVarName];

                    for (const version of matrix) {
                        rawSet.add(version);
                    }

                    continue;
                }

                const envMatch = nodeVersion.match(/^\${{\s+env.(?<envVarName>.*)\s+}}$/);
                if (envMatch) {
                    rawSet.add(workflow.env[envMatch.groups.envVarName]);

                    continue;
                }

                rawSet.add(nodeVersion);
            }
        }
    }

    const raw = [...rawSet];

    const resolved = {};

    for (const version of raw) {

        const nv = await Nv(version);

        if (!nv.length) {
            resolved[version] = false;
        }
        else {
            resolved[version] = nv[nv.length - 1].version;
        }
    }

    return { githubActions: { raw, resolved } };
};
