import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/auth/bing_app_authorizer.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/auth/bing_app_oauth.dart';

const state = 'abc123';

void main() {
  group('buildAuthorizeUri', () {
    test('asks login.live.com for a code for the Bing app client', () {
      // Act
      final uri = buildAuthorizeUri(state: state);

      // Assert
      expect(uri.scheme, 'https');
      expect(uri.host, 'login.live.com');
      expect(uri.path, '/oauth20_authorize.srf');
      expect(uri.queryParameters, {
        'response_type': 'code',
        'client_id': '0000000040170455',
        'redirect_uri': 'https://login.live.com/oauth20_desktop.srf',
        'scope': 'service::prod.rewardsplatform.microsoft.com::MBI_SSL',
        'state': state,
      });
    });
  });

  group('generateOAuthState', () {
    test('returns 32 random hex chars', () {
      final random = Random(9);

      final first = generateOAuthState(random);
      final second = generateOAuthState(random);

      expect(first, matches(RegExp(r'^[0-9a-f]{32}$')));
      expect(first, isNot(second));
    });
  });

  group('parseAuthRedirect', () {
    test('reads the code from the desktop redirect', () {
      final url = Uri.parse(
          'https://login.live.com/oauth20_desktop.srf?code=M.C5_BAY.2.U.abc&state=$state&lc=1033');

      final redirect = parseAuthRedirect(url, expectedState: state);

      expect(redirect, isA<AuthRedirectCode>().having((r) => r.code, 'code', 'M.C5_BAY.2.U.abc'));
    });

    test('reads an error from the desktop redirect', () {
      final url = Uri.parse(
          'https://login.live.com/oauth20_desktop.srf?error=access_denied&error_description=The+user+said+no');

      final redirect = parseAuthRedirect(url, expectedState: state);

      expect(
        redirect,
        isA<AuthRedirectError>()
            .having((r) => r.error, 'error', 'access_denied')
            .having((r) => r.description, 'description', 'The user said no'),
      );
    });

    test('is still pending on any other page', () {
      expect(parseAuthRedirect(buildAuthorizeUri(state: state), expectedState: state),
          isA<AuthRedirectPending>());
      expect(parseAuthRedirect(Uri.parse('https://www.bing.com/?code=x'), expectedState: state),
          isA<AuthRedirectPending>());
      expect(parseAuthRedirect(null, expectedState: state), isA<AuthRedirectPending>());
    });

    test('rejects a redirect whose state is not the one we sent', () {
      final url = Uri.parse('https://login.live.com/oauth20_desktop.srf?code=x&state=other');

      final redirect = parseAuthRedirect(url, expectedState: state);

      expect(redirect, isA<AuthRedirectError>().having((r) => r.error, 'error', 'state_mismatch'));
    });

    test('treats a desktop redirect with neither code nor error as an error', () {
      final url = Uri.parse('https://login.live.com/oauth20_desktop.srf');

      expect(parseAuthRedirect(url, expectedState: state), isA<AuthRedirectError>());
    });
  });

  group('authCodeResultFor', () {
    test('grants the code from the redirect', () {
      final url = Uri.parse('https://login.live.com/oauth20_desktop.srf?code=abc&state=$state');

      final result = authCodeResultFor(url, expectedState: state);

      expect(result, isA<AuthCodeGranted>().having((r) => r.code, 'code', 'abc'));
    });

    test('reads a login_required error as signed out', () {
      final url = Uri.parse('https://login.live.com/oauth20_desktop.srf?error=login_required');

      expect(authCodeResultFor(url, expectedState: state), isA<AuthCodeSignedOut>());
    });

    test('reads any other error as a failure that names it', () {
      final url = Uri.parse('https://login.live.com/oauth20_desktop.srf?error=access_denied');

      final result = authCodeResultFor(url, expectedState: state);

      expect(result, isA<AuthCodeFailed>().having((r) => r.reason, 'reason', contains('access_denied')));
    });

    // Without a session, the authorize page settles on a sign-in form instead
    // of redirecting.
    test('reads a page that settled on a Microsoft sign-in host as signed out', () {
      final url = Uri.parse('https://login.live.com/oauth20_authorize.srf?client_id=x');

      expect(authCodeResultFor(url, expectedState: state), isA<AuthCodeSignedOut>());
    });

    test('reads a page that settled anywhere else as a failure', () {
      final url = Uri.parse('https://www.example.com/');

      expect(authCodeResultFor(url, expectedState: state), isA<AuthCodeFailed>());
    });
  });

  test('AuthCodeGranted never prints the code', () {
    expect(const AuthCodeGranted('secret-code').toString(), isNot(contains('secret-code')));
  });
}
