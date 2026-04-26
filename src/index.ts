/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { IConfigurationWithGlobalOptions, TestConfiguration } from './config.js';

export * from './config.js';
export * from './fullJsonStreamReporterTypes.js';

type AnyConfiguration = IConfigurationWithGlobalOptions | TestConfiguration | TestConfiguration[];
type AnyConfigurationOrPromise = AnyConfiguration | Promise<AnyConfiguration>;

export const defineConfig = (
  config: AnyConfigurationOrPromise | (() => AnyConfigurationOrPromise),
) => config;
