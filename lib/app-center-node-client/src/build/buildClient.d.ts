/*
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

import { ServiceClient, ServiceClientOptions, ServiceClientCredentials } from 'ms-rest';
import * as operations from "./operations";

declare class BuildClient extends ServiceClient {
  /**
   * @class
   * Initializes a new instance of the BuildClient class.
   * @constructor
   *
   * @param {credentials} credentials - Subscription credentials which uniquely identify client subscription.
   *
   * @param {string} [baseUri] - The base URI of the service.
   *
   * @param {object} [options] - The parameter options
   *
   * @param {Array} [options.filters] - Filters to be added to the request pipeline
   *
   * @param {object} [options.requestOptions] - Options for the underlying request object
   * {@link https://github.com/request/request#requestoptions-callback Options doc}
   *
   * @param {boolean} [options.noRetryPolicy] - If set to true, turn off default retry policy
   *
   */
  constructor(credentials: ServiceClientCredentials, baseUri?: string, options?: ServiceClientOptions);

  credentials: ServiceClientCredentials;

  // Operation groups
  builds: operations.Builds;
  branchConfigurations: operations.BranchConfigurations;
  commits: operations.Commits;
  fileAssets: operations.FileAssets;
  repositoryConfigurations: operations.RepositoryConfigurations;
  repositories: operations.Repositories;
}

export = BuildClient;
