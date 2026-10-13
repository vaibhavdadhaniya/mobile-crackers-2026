// Where tapping a notification should take the user (unit tested).
export function notificationRoute(type: string, isAdmin: boolean): string | null {
  if (type.startsWith('money_')) return '/wallet';
  if (type === 'kit_request' || type === 'kit_return') return isAdmin ? '/admin/requests' : null;
  if (type === 'kit_received') return isAdmin ? '/admin/activity' : '/user/activity';
  if (type === 'request_rejected' || type === 'return_accepted') return isAdmin ? null : '/user/request';
  return null;
}
