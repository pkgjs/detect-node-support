'use strict';

const _ = require('lodash');
const Nv = require('@pkgjs/nv');


const internals = {};


internals.parseActionsSetupNode = function * (workflow, file) {

    for (const job of Object.values(workflow.jobs)) {

        const nodeSteps = job.steps.filter(({ uses }) => uses && uses.startsWith('actions/setup-node'));
        for (const step of nodeSteps) {
            const nodeVersion = step.with && step.with['node-version'];

            if (!nodeVersion) {
                // Docs say: "The node-version input is optional. If not supplied, the node version that is PATH will be used."
                // Therefore we cannot reliably detect a specific version, but we do want to let the user know
                yield 'not-set';
                continue;
            }

            const matrixMatch = nodeVersion.match(/^\${{\s+matrix.(?<matrixVarName>.*)\s+}}$/);
            if (matrixMatch) {
                const matrix = job.strategy.matrix[matrixMatch.groups.matrixVarName];

                yield * matrix;
                continue;
            }

            const envMatch = nodeVersion.match(/^\${{\s+env.(?<envVarName>.*)\s+}}$/);
            if (envMatch) {
                const env = {
                    ...workflow.env,
                    ...step.env
                };
                const envValue = env[envMatch.groups.envVarName];

                if (!envValue) {
                    yield 'not-set';
                    continue;
                }

                yield envValue;
                continue;
            }

            yield nodeVersion;
        }
    }
};


internals.parseLjharbActions = function * (workflow, file) {

    for (const job of Object.values(workflow.jobs)) {

        const nodeSteps = job.steps.filter(({ uses }) => {

            if (!uses) {
                return false;
            }

            return uses.startsWith('ljharb/actions/node/run') ||  uses.startsWith('ljharb/actions/node/install');
        });

        for (const step of nodeSteps) {
            const nodeVersion = step.with && step.with['node-version'];

            if (!nodeVersion) {
                yield 'lts/*'; // @todo: find ref which tells us that this is so
                continue;
            }

            const matrixMatch = nodeVersion.match(/^\${{\s+matrix.(?<matrixVarName>.*)\s+}}$/);
            if (matrixMatch) {

                let needs = job.strategy.matrix;
                if (typeof job.strategy.matrix !== 'string') {

                    const matrix = job.strategy.matrix[matrixMatch.groups.matrixVarName];

                    if (!matrix) {
                        throw new Error(`Unable to find matrix variable '${matrixMatch.groups.matrixVarName}' in the matrix in ${file}`);
                    }

                    if (typeof matrix !== 'string') {
                        // @todo find an example
                        yield * matrix;
                        continue;
                    }

                    // example: eslint-plugin-react
                    needs = matrix;
                }

                const fromJsonMatch = needs.match(/^\${{\s+fromJson\(needs\.(?<needJobName>.*)\.outputs\.(?<needOutputName>.*)\)\s+}}$/);
                if (fromJsonMatch) {
                    const { needJobName, needOutputName } = fromJsonMatch.groups;
                    const needJob = workflow.jobs[needJobName];
                    const needOutput = needJob.outputs[needOutputName];
                    const stepMatch = needOutput.match(/^\${{\s+steps\.(?<needStepName>.*)\.outputs\.(?<needStepOutputName>.*)\s+}}$/);

                    if (!stepMatch) {
                        throw new Error(`Unable to parse need output: ${needOutput} in ${file}`);
                    }

                    const { needStepName/*, needStepOutputName*/ } = stepMatch.groups;
                    const needStep = needJob.steps.find(({ id }) => id === needStepName);

                    if (!needStep || !needStep.uses.startsWith('ljharb/actions/node/matrix')) {
                        throw new Error(`Unrecognized action in ${needOutput} in ${file}`);
                    }

                    // @todo: with has more options - resolve to precise versions here and yield the full list
                    yield needStep.with.preset;
                    continue;
                }

                throw new Error(`Unable to parse the job matrix: ${job.strategy.matrix} in ${file}`);
            }

            yield nodeVersion;
        }
    }
};


exports.detect = async (meta) => {

    const files = await meta.loadFolder('.github/workflows');
    const rawSet = new Set();
    const byFileSets = {};

    if (!files.length) {
        // explicitly return no `githubActions` - this is different to finding actions and detecting no Node.js versions
        return;
    }

    for (const file of files) {

        if (!file.endsWith('.yaml') && !file.endsWith('.yml')) {
            continue;
        }

        const workflow = await meta.loadFile(`.github/workflows/${file}`, { yaml: true });
        byFileSets[file] = byFileSets[file] || new Set();

        for (const version of internals.parseActionsSetupNode(workflow, file)) {
            rawSet.add(version);
            byFileSets[file].add(version);
        }

        for (const version of internals.parseLjharbActions(workflow, file)) {
            rawSet.add(version);
            byFileSets[file].add(version);
        }
    }

    const raw = [...rawSet];
    const byFile = _.mapValues(byFileSets, (set) => [...set]);

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

    return { githubActions: { byFile, raw, resolved } };
};
