export interface ResponseModel<T> {
  message: string | null;
  statusCode: number;
  result: T;
}

export function unwrapResult<T>(response: ResponseModel<T> | T): T {
  if (response && typeof response === 'object' && 'result' in response && 'statusCode' in response) {
    return (response as ResponseModel<T>).result;
  }
  return response as T;
}
