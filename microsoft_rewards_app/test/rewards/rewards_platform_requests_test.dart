import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/requests/random_ids.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/requests/rewards_platform_requests.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_access_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/repositories/rewards_platform_api.dart';

const token = AppAccessToken('test-token');
final hex128 = RegExp(r'^[0-9a-f]{128}$');
final uuidV4Pattern = RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

void main() {
  group('dashboardUri', () {
    test('asks for the Android app dashboard by default', () {
      expect(
        dashboardUri(RewardsChannel.android).toString(),
        'https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613',
      );
    });

    test('asks for the iOS app dashboard on the iOS channel', () {
      expect(dashboardUri(RewardsChannel.ios).queryParameters['channel'], 'SAIOS');
    });
  });

  test('activitiesUri points at the activity report endpoint', () {
    expect(activitiesUri.toString(),
        'https://prod.rewardsplatform.microsoft.com/dapi/me/activities');
  });

  group('platform headers', () {
    test('sends the bearer token and the Android app identity', () {
      // Act
      final headers = platformHeaders(token, RewardsChannel.android);

      // Assert
      expect(headers, {
        'Authorization': 'Bearer test-token',
        'Accept': '*/*',
        'X-Rewards-AppId': 'SAAndroid/34.5.450113001',
        'X-Rewards-PartnerId': 'BingHomepage',
        'X-Rewards-IsMobile': 'true',
      });
    });

    test('swaps in the iOS app identity on the iOS channel', () {
      final headers = platformHeaders(token, RewardsChannel.ios);

      expect(headers['Authorization'], 'Bearer test-token');
      expect(headers['X-Rewards-AppId'], 'SAIOS/33.4.440603001');
      expect(headers['X-Rewards-PartnerId'], 'startapp');
      expect(headers['X-Rewards-Flights'], 'rwgobig');
      expect(headers['User-Agent'], contains('BingSapphire/33.4.440603001'));
      expect(headers['User-Agent'], startsWith('Mozilla/5.0 (iPad; CPU iPad OS 26_5'));
    });

    test('asks the dashboard not to be served from a cache', () {
      expect(dashboardHeaders(token, RewardsChannel.android)['Cache-Control'], 'no-cache');
    });

    test('labels activity reports as JSON', () {
      expect(activityHeaders(token, RewardsChannel.android)['Content-Type'], 'application/json');
    });
  });

  group('readToEarnBody', () {
    test('reports one read of the offer with a 128-hex-char id', () {
      // Act
      final body = readToEarnBody(
          offerId: 'ENUS_readarticle3_30points', country: 'si', random: Random(1));

      // Assert
      expect(body.keys, unorderedEquals(['id', 'amount', 'type', 'attributes', 'country']));
      expect(body['id'], matches(hex128));
      expect(body['amount'], 1);
      expect(body['type'], 101);
      expect(body['attributes'], {'offerid': 'ENUS_readarticle3_30points'});
      expect(body['country'], 'si');
    });

    test('falls back to "us" when the profile has no country', () {
      expect(readToEarnBody(offerId: 'x', country: null, random: Random(1))['country'], 'us');
      expect(readToEarnBody(offerId: 'x', country: ' ', random: Random(1))['country'], 'us');
    });

    test('uses a fresh id for every report', () {
      final random = Random(7);

      final first = readToEarnBody(offerId: 'x', country: 'si', random: random)['id'];
      final second = readToEarnBody(offerId: 'x', country: 'si', random: random)['id'];

      expect(first, isNot(second));
    });
  });

  group('dailyCheckInBody', () {
    test('builds the iOS check-in activity with a v4 uuid', () {
      final body = dailyCheckInBody(country: 'si', random: Random(3));

      expect(body.keys, unorderedEquals(
          ['risk_context', 'type', 'channel', 'attributes', 'id', 'amount', 'country']));
      expect(body['risk_context'], <String, Object?>{});
      expect(body['type'], 103);
      expect(body['channel'], 'SAIOS');
      expect(body['attributes'], <String, Object?>{});
      expect(body['id'], matches(uuidV4Pattern));
      expect(body['amount'], 1);
      expect(body['country'], 'si');
    });
  });

  group('random ids', () {
    test('randomHex returns the requested number of lowercase hex chars', () {
      expect(randomHex(Random(5), 128), matches(hex128));
      expect(randomHex(Random(5), 32), matches(RegExp(r'^[0-9a-f]{32}$')));
    });

    test('uuidV4 sets the version and variant bits', () {
      for (var seed = 0; seed < 20; seed++) {
        expect(uuidV4(Random(seed)), matches(uuidV4Pattern));
      }
    });
  });
}
