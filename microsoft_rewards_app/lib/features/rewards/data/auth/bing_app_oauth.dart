// OAuth for the Bing mobile app's client (verified live on 2026-11-08). With a
// signed-in cookie store, the authorize URL redirects straight to the desktop
// redirect URI with a code.

import 'dart:math';

import '../requests/random_ids.dart';
import 'bing_app_authorizer.dart';

const bingAppClientId = '0000000040170455';
const bingAppRedirectUri = 'https://login.live.com/oauth20_desktop.srf';
const bingAppScope = 'service::prod.rewardsplatform.microsoft.com::MBI_SSL';
final Uri bingAppTokenUri =
    Uri.parse('https://login.microsoftonline.com/consumers/oauth2/v2.0/token');

const _redirectHost = 'login.live.com';
const _redirectPath = '/oauth20_desktop.srf';
const _stateLength = 32;

/// OAuth errors that mean "a sign-in is needed", not a broken flow.
const _signedOutErrors = {'login_required', 'interaction_required'};

/// Hosts that show Microsoft's sign-in pages.
const _signInHosts = {'login.live.com', 'login.microsoftonline.com', 'account.live.com'};

Uri buildAuthorizeUri({required String state}) => Uri.https(
      'login.live.com',
      '/oauth20_authorize.srf',
      {
        'response_type': 'code',
        'client_id': bingAppClientId,
        'redirect_uri': bingAppRedirectUri,
        'scope': bingAppScope,
        'state': state,
      },
    );

String generateOAuthState(Random random) => randomHex(random, _stateLength);

/// What a URL in the authorize flow says.
sealed class AuthRedirect {
  const AuthRedirect();
}

/// Not the redirect URI (yet): keep waiting.
final class AuthRedirectPending extends AuthRedirect {
  const AuthRedirectPending();
}

final class AuthRedirectCode extends AuthRedirect {
  const AuthRedirectCode(this.code);

  final String code;
}

final class AuthRedirectError extends AuthRedirect {
  const AuthRedirectError(this.error, {this.description});

  final String error;
  final String? description;
}

/// Reads [url] as a possible redirect to [bingAppRedirectUri]. A `state` that
/// differs from [expectedState] is rejected; a missing one is accepted, since
/// it isn't verified that login.live.com always echoes it.
AuthRedirect parseAuthRedirect(Uri? url, {required String expectedState}) {
  if (url == null || url.host != _redirectHost || url.path != _redirectPath) {
    return const AuthRedirectPending();
  }
  final params = url.queryParameters;
  final state = params['state'];
  if (state != null && state != expectedState) return const AuthRedirectError('state_mismatch');

  final code = params['code'];
  if (code != null && code.isNotEmpty) return AuthRedirectCode(code);

  final error = params['error'];
  if (error != null && error.isNotEmpty) {
    return AuthRedirectError(error, description: params['error_description']);
  }
  return const AuthRedirectError('no_code');
}

/// The [AuthCodeResult] for the URL the authorize flow landed on.
AuthCodeResult authCodeResultFor(Uri? url, {required String expectedState}) {
  return switch (parseAuthRedirect(url, expectedState: expectedState)) {
    AuthRedirectCode(:final code) => AuthCodeGranted(code),
    AuthRedirectError(:final error) when _signedOutErrors.contains(error) =>
      const AuthCodeSignedOut(),
    AuthRedirectError(:final error) => AuthCodeFailed('authorization error: $error'),
    AuthRedirectPending() when _signInHosts.contains(url?.host) => const AuthCodeSignedOut(),
    // Only the host: the query of an unexpected page could carry anything.
    AuthRedirectPending() => AuthCodeFailed('stopped on an unexpected page (${url?.host})'),
  };
}
