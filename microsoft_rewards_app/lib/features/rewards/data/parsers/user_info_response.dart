// Turns what the in-page getuserinfo fetch returned into a RewardsStatus.
// Same rules as the extension's wxt/entrypoints/background/rewardsStatus.ts.

import 'dart:convert';

import '../../domain/entities/rewards_status.dart';
import 'json_readers.dart';
import 'user_info_parser.dart';

/// The Rewards sign-in entry. A user freshly signed in to Bing has no
/// rewards.bing.com session yet: the root then lands on /about and the API
/// answers 401. This URL signs in silently through the login.live.com cookies
/// and returns to the dashboard (verified live, Nov 2026).
const rewardsSignInUrl = 'https://rewards.bing.com/Signin?idru=%2F';

/// Runs inside the rewards.bing.com page so the request carries that origin's
/// session cookies. The body is returned as text and decoded in Dart: the
/// endpoint labels its JSON `text/plain`.
const userInfoFetchScript = '''
const r = await fetch('/api/getuserinfo?type=1', {credentials: 'include', cache: 'no-store', headers: {'X-Requested-With': 'XMLHttpRequest'}});
return {status: r.status, body: await r.text()};
''';

/// Whether the page settled on rewards.bing.com, where the in-page fetch can
/// run. Any path counts: after sign-in the page may still end on /about, so the
/// API answer decides. Anywhere else (the login.live.com password form, an
/// error page) means single sign-on didn't happen.
bool isOnRewardsSite(Uri? url) => url?.host == 'rewards.bing.com';

/// Interprets the result of [userInfoFetchScript]. A script [error] means the
/// fetch itself rejected, which is a network failure.
RewardsStatus interpretUserInfoScriptResult({
  required Object? value,
  required String? error,
  required DateTime now,
}) {
  final result = asObject(value);
  final statusCode = asInt(result?['status']);
  final body = result?['body'];
  if (error != null || statusCode == null || body is! String) {
    return RewardsStatusFailed(error: RewardsStatusError.network, fetchedAt: now);
  }
  return interpretUserInfoResponse(statusCode: statusCode, body: body, now: now);
}

/// Interprets a getuserinfo HTTP response.
RewardsStatus interpretUserInfoResponse({
  required int statusCode,
  required String body,
  required DateTime now,
}) {
  RewardsStatus failed(RewardsStatusError error) =>
      RewardsStatusFailed(error: error, fetchedAt: now);

  if (statusCode == 401 || statusCode == 403) return failed(RewardsStatusError.signedOut);
  if (statusCode < 200 || statusCode >= 300) return failed(RewardsStatusError.network);
  // The content type says text/plain either way, so the body decides: an HTML
  // page is the sign-in redirect.
  if (body.trimLeft().startsWith('<')) return failed(RewardsStatusError.signedOut);

  final Object? json;
  try {
    json = jsonDecode(body);
  } on FormatException {
    return failed(RewardsStatusError.unrecognized);
  }
  final snapshot = parseUserInfo(json, now);
  if (snapshot == null) return failed(RewardsStatusError.unrecognized);
  return RewardsStatusLoaded(snapshot: snapshot, fetchedAt: now);
}
