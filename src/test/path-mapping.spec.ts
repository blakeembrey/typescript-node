import * as expect from 'expect';
import { join } from 'path';

import { createExec } from './exec-helpers';
import {
  CMD_ESM_LOADER_WITHOUT_PROJECT,
  CMD_TS_NODE_WITHOUT_PROJECT_FLAG,
  nodeSupportsEsmHooks,
  TEST_DIR,
  installTsNode,
} from './helpers';
import { test } from './testlib';

test.beforeAll(installTsNode);

function execBuilder(
  command: string,
  moduleDir: string,
  tsConfig: string = 'tsconfig.json'
) {
  const partialExec = createExec({
    cwd: join(TEST_DIR, moduleDir),
    env: { ...process.env, TS_NODE_PROJECT: tsConfig },
  });

  return (file = 'index.ts') => partialExec(`${command} ${file}`);
}

const MODULE_TYPES = <const>{
  CJS: {
    name: 'cjs',
    baseDir: 'cjs-path-mapping',
    command: CMD_TS_NODE_WITHOUT_PROJECT_FLAG,
  },
  ESM: {
    name: 'esm',
    baseDir: 'esm-path-mapping',
    command: CMD_ESM_LOADER_WITHOUT_PROJECT,
  },
};

const PROJECT_CONFIGS = <const>{
  BASE_URL_NO_PATHS: 'tsconfig-baseurl-no-paths.json',
  BASE_URL_SOME_PATHS: 'tsconfig-baseurl-some-paths.json',
  BASE_URL_STAR_PATH: 'tsconfig-baseurl-star-path.json',
};

for (const moduleType of Object.values(MODULE_TYPES)) {
  test.suite(`path mapping ${moduleType.name}`, (test) => {
    test.runIf(
      nodeSupportsEsmHooks || moduleType.name !== MODULE_TYPES.ESM.name
    );

    for (const project of Object.values(PROJECT_CONFIGS)) {
      // Create ts-node runner for this config
      const exec = execBuilder(moduleType.command, moduleType.baseDir, project);

      test.suite(`${project}`, (test) => {
        test('ignore type definitions', async (t) => {
          const { err } = await exec('ignore-type-definitions.ts');
          expect(err).toBeNull();
        });

        test(`import at baseUrl`, async () => {
          const { err } = await exec('import-at-base.ts');
          expect(err).toBeNull();
        });

        test(`import at baseUrl without file extensions`, async () => {
          const { err } = await exec('import-at-base-no-extensions.ts');
          expect(err).toBeNull();
        });

        test(`import below baseUrl`, async () => {
          const { err } = await exec('import-below-base.ts');
          expect(err).toBeNull();
        });

        test(`import from js, jsx, tsx`, async () => {
          const { err } = await exec('import-from-js-jsx-tsx.ts');
          expect(err).toBeNull();
        });

        test(`import node built-in`, async (t) => {
          const { err } = await exec('import-node-built-in.ts');
          expect(err).toBeNull();
        });

        test(`import node_modules`, async (t) => {
          const { err } = await exec('import-node-modules.ts');
          expect(err).toBeNull();
        });

        test(`import within node_modules ignores paths`, async (t) => {
          const { err } = await exec('import-within-node-modules.ts');
          expect(err).toBeNull();
        });

        test('import relative', async () => {
          const { err } = await exec('import-relative.ts');
          expect(err).toBeNull();
        });

        // test(`import invalid path`, async () => {
        //   const { stderr, err } = await exec('import-non-existing.ts');

        //   // Expect error
        //   expect(err).toBeTruthy();
        //   expect(stderr).toMatch(
        //     `[ERR_MODULE_NOT_FOUND]: Cannot find 'map2/does-not-exist.ts'`
        //   );

        //   // Expect tried candidates to be listed
        //   expect(stderr).toMatch(/- file:\/\/.*mapped\/2-does-not-exist.ts/);
        //   expect(stderr).toMatch(/- file:\/\/.*mapped\/2a-does-not-exist.ts/);
        // });
      });
    }

    // TODO: Import relative shouldn't succeed using star-path

    // // Create ts-node runner config with paths
    // const exec = execBuilder(
    //   execBuilderParams.command,
    //   execBuilderParams.baseDir,
    //   PROJECT_CONFIGS.BASE_URL_AND_PATHS
    // );

    // test(`import specific paths`, async () => {
    //   const { err } = await exec('???');
    //   expect(err).toBeNull();
    // });
  });
}
