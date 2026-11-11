import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/parsers/user_info_response.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/point_counter.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/rewards_status.dart';

// Ported from the extension's wxt/entrypoints/background/rewardsStatus.test.ts:
// the same status/body rules, applied to what the in-page fetch returns.

final now = DateTime(2026, 11, 7, 9);

final dashboardBody = jsonEncode({
  'dashboard': {
    'userStatus': {
      'availablePoints': 500,
      'counters': {
        'pcSearch': [
          {'title': 'PC search', 'pointProgress': 90, 'pointProgressMax': 90},
        ],
      },
    },
  },
});

RewardsStatusError? errorOf(RewardsStatus status) =>
    status is RewardsStatusFailed ? status.error : null;

void main() {
  group('interpretUserInfoResponse', () {
    test('parses the dashboard from a 200 text/plain body', () {
      // Act
      final status = interpretUserInfoResponse(statusCode: 200, body: dashboardBody, now: now);

      // Assert
      expect(status, isA<RewardsStatusLoaded>());
      final snapshot = (status as RewardsStatusLoaded).snapshot;
      expect(snapshot.points, 500);
      expect(snapshot.pcSearch, const PointCounter(progress: 90, max: 90));
      expect(status.fetchedAt, now);
    });

    // Signed out, the endpoint redirects to an HTML sign-in page.
    test('reads an HTML answer as signed out', () {
      final status = interpretUserInfoResponse(
          statusCode: 200, body: '  <html>sign in</html>', now: now);

      expect(errorOf(status), RewardsStatusError.signedOut);
    });

    // Seen live on a fresh Bing sign-in with no rewards.bing.com session.
    test('reads a 401 with an HTML body as signed out', () {
      final status = interpretUserInfoResponse(
          statusCode: 401, body: '<!DOCTYPE html><html></html>', now: now);

      expect(errorOf(status), RewardsStatusError.signedOut);
    });

    test('reads 401 and 403 as signed out', () {
      expect(errorOf(interpretUserInfoResponse(statusCode: 401, body: '{}', now: now)),
          RewardsStatusError.signedOut);
      expect(errorOf(interpretUserInfoResponse(statusCode: 403, body: '', now: now)),
          RewardsStatusError.signedOut);
    });

    test('reports a server error as a network error', () {
      final status = interpretUserInfoResponse(statusCode: 500, body: '{}', now: now);

      expect(errorOf(status), RewardsStatusError.network);
    });

    test('reports a body that is not JSON as unrecognised', () {
      final status = interpretUserInfoResponse(statusCode: 200, body: 'oops', now: now);

      expect(errorOf(status), RewardsStatusError.unrecognized);
    });

    test('reports JSON in an unknown shape as unrecognised', () {
      final status = interpretUserInfoResponse(statusCode: 200, body: '{"hello":1}', now: now);

      expect(errorOf(status), RewardsStatusError.unrecognized);
    });
  });

  group('interpretUserInfoScriptResult', () {
    test('parses the status and body the in-page fetch returned', () {
      // Arrange: the platform channel hands back an untyped map, and JS
      // numbers can arrive as doubles.
      final value = <dynamic, dynamic>{'status': 200.0, 'body': dashboardBody};

      // Act
      final status = interpretUserInfoScriptResult(value: value, error: null, now: now);

      // Assert
      expect(status, isA<RewardsStatusLoaded>());
    });

    test('reads a script error (the fetch rejected) as a network error', () {
      final status = interpretUserInfoScriptResult(
          value: null, error: 'TypeError: Failed to fetch', now: now);

      expect(errorOf(status), RewardsStatusError.network);
    });

    test('reads a missing or malformed result as a network error', () {
      expect(errorOf(interpretUserInfoScriptResult(value: null, error: null, now: now)),
          RewardsStatusError.network);
      expect(errorOf(interpretUserInfoScriptResult(value: {'status': 200}, error: null, now: now)),
          RewardsStatusError.network);
    });

    test('applies the status rules to the returned status code', () {
      final status = interpretUserInfoScriptResult(
          value: {'status': 401, 'body': ''}, error: null, now: now);

      expect(errorOf(status), RewardsStatusError.signedOut);
    });
  });

  group('rewardsSignInUrl', () {
    // Verified live: a fresh Bing sign-in has no rewards.bing.com session, and
    // the root lands on /about with a 401 from the API. The Signin URL signs in
    // silently through the login.live.com cookies.
    test('is the Rewards sign-in entry that returns to the dashboard', () {
      final url = Uri.parse(rewardsSignInUrl);

      expect(url.host, 'rewards.bing.com');
      expect(url.path, '/Signin');
      expect(url.queryParameters['idru'], '/');
    });
  });

  group('isOnRewardsSite', () {
    // After sign-in the page may still end on /about, so any rewards.bing.com
    // page is good enough to run the fetch; the API answer decides.
    test('accepts any page on rewards.bing.com, including /about', () {
      expect(isOnRewardsSite(Uri.parse('https://rewards.bing.com/')), isTrue);
      expect(isOnRewardsSite(Uri.parse('https://rewards.bing.com/about')), isTrue);
    });

    test('rejects the sign-in pages and anything else', () {
      expect(isOnRewardsSite(Uri.parse('https://login.live.com/login.srf')), isFalse);
      expect(isOnRewardsSite(Uri.parse('https://www.bing.com/rewards')), isFalse);
      expect(isOnRewardsSite(null), isFalse);
    });
  });
}
