export interface ResponseModel<T> {
  message: string | null;
  statusCode: number | string;
  result: T;
}

export function isErrorResponse(res: any): boolean {
  if (!res || typeof res !== 'object') return false;

  const sc = res.statusCode;
  if (typeof sc === 'number' && sc >= 400) return true;
  if (typeof sc === 'string') {
    const lower = sc.trim().toLowerCase();
    if (lower !== 'ok' && lower !== 'created' && lower !== 'accepted' && lower !== 'nocontent') {
      return true;
    }
  }
  if (res.result === false && res.message) {
    return true;
  }
  return false;
}

export function unwrapResult<T>(response: ResponseModel<T> | T): T {
  if (response && typeof response === 'object' && 'result' in response && 'statusCode' in response) {
    return (response as ResponseModel<T>).result;
  }
  return response as T;
}
