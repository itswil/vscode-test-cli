/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { Transform } from 'node:stream';
import { inspect } from 'node:util';
import { TestEvent, TestEventTuple } from './fullJsonStreamReporterTypes.js';

export * from './fullJsonStreamReporterTypes.js';

class FullJsonStreamReporter extends Transform {
  private slow = 75;
  private testCount = 0;

  constructor() {
    super({ writableObjectMode: true });
  }

  override _transform(
    event: { type: string; data: unknown },
    _encoding: string,
    callback: (err?: Error | null, data?: string) => void,
  ) {
    switch (event.type) {
      case 'test:enqueue': {
        this.testCount++;
        const data = event.data as { name: string; file?: string; parentName?: string };
        if (!data.parentName) {
          const path = [data.name];
          this.writeEvent([TestEvent.SuiteStart, { path, file: data.file }]);
        }
        break;
      }
      case 'test:dequeue': {
        break;
      }
      case 'test:start': {
        const data = event.data as {
          name: string;
          file?: string;
          parentName?: string;
          testNumber: number;
        };
        const path = data.parentName ? [data.parentName, data.name] : [data.name];
        this.writeEvent([
          TestEvent.TestStart,
          { path, currentRetry: 0, file: data.file },
        ]);
        break;
      }
      case 'test:pass': {
        const data = event.data as {
          name: string;
          file?: string;
          parentName?: string;
          duration: number;
          testNumber: number;
        };
        const path = data.parentName ? [data.parentName, data.name] : [data.name];
        const speed =
          !data.duration || data.duration < this.slow / 2
            ? ('fast' as const)
            : data.duration > this.slow
            ? ('slow' as const)
            : ('medium' as const);
        this.writeEvent([
          TestEvent.Pass,
          { path, duration: data.duration, speed, currentRetry: 0, file: data.file },
        ]);
        break;
      }
      case 'test:fail': {
        const data = event.data as {
          name: string;
          file?: string;
          parentName?: string;
          duration: number;
          error: { message: string; stack?: string; actual?: unknown; expected?: unknown };
          testNumber: number;
        };
        const path = data.parentName ? [data.parentName, data.name] : [data.name];
        const speed =
          !data.duration || data.duration < this.slow / 2
            ? ('fast' as const)
            : data.duration > this.slow
            ? ('slow' as const)
            : ('medium' as const);
        this.writeEvent([
          TestEvent.Fail,
          {
            path,
            duration: data.duration,
            speed,
            currentRetry: 0,
            file: data.file,
            actual: inspect(data.error.actual, { depth: 30 }),
            expected: inspect(data.error.expected, { depth: 30 }),
            err: data.error.message,
            stack: data.error.stack || null,
          },
        ]);
        break;
      }
      case 'test:summary': {
        this.writeEvent([TestEvent.Start, { total: this.testCount }]);
        this.writeEvent([TestEvent.End, {}]);
        break;
      }
    }
    callback(null);
  }

  private writeEvent(event: TestEventTuple) {
    this.push(JSON.stringify(event) + '\n');
  }
}

export default FullJsonStreamReporter;