/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import type { TestsStream } from 'node:test';
import test from 'node:test';

export async function run() {
  const {
    nodeTestOpts,
    files,
    preload,
  }: {
    nodeTestOpts: {
      timeout?: number;
      testNamePattern?: string;
      reporter?: string;
      require?: string | string[];
    };
    files: string[];
    preload: string[];
  } = JSON.parse(process.env.VSCODE_TEST_OPTIONS!);

  const requirePaths = [...preload, ...ensureArray(nodeTestOpts.require)];

  for (const f of requirePaths) {
    await import(normalizeCasing(f));
  }

  const normalizedFiles = files.map(normalizeCasing);

  for (const file of normalizedFiles) {
    await import(file);
  }

  const stream: TestsStream = test.run({
    ...nodeTestOpts,
  } as Parameters<typeof test.run>[0]);

  let totalFailed = 0;

  stream.on('test:fail', () => {
    totalFailed++;
  });

  await new Promise<void>((resolve) => {
    stream.on('test:summary', (data) => {
      if (data) {
        const summaryData = data as {
          counts: { failed?: number; passed: number; skipped: number; tests: number };
        };
        totalFailed =
          summaryData.counts.failed ??
          summaryData.counts.tests -
            summaryData.counts.passed -
            summaryData.counts.skipped;
      }
      resolve();
    });
  });

  if (totalFailed > 0) {
    throw new Error(`${totalFailed} test(s) failed.`);
  }
}

const normalizeCasing = (path: string) => {
  if (process.platform === 'win32' && path.match(/^[A-Z]:/)) {
    return path[0].toLowerCase() + path.slice(1);
  }

  return path;
};

const ensureArray = <T,>(value: T | T[] | undefined): T[] =>
  value ? (Array.isArray(value) ? value : [value]) : [];