import { nuErrorDetails } from './nuErrors';

const messages: Record<string, string> = {
  send_unknown: 'erru.ncr.form.sendUnknown',
  invalid_ncr_xml: 'erru.ncr.form.invalidXml',
  invalid_ncr_response_xml: 'erru.ncr.form.invalidResponseXml',
  validation_unavailable: 'erru.ncr.form.validationUnavailable',
};

/** Message for a failed NCR request or response send; anything unknown is a plain rejection. */
export function ncrSendErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const { code } = nuErrorDetails(error);
  return t((code && messages[code]) || 'erru.ncr.form.sendFailed');
}
