import axios, { AxiosRequestConfig } from 'axios';
import apiClient from './client';

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = apiClient({
    ...config,
    ...options,
    cancelToken: config.cancelToken || source.token,
  }).then(({ data }) => data);

  // @ts-expect-error cancel token attached for aborting query
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export default customInstance;
