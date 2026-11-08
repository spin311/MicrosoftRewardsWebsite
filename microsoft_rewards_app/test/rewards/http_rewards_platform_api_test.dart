import 'dart:convert';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/api/http_rewards_platform_api.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_access_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/repositories/rewards_platform_api.dart';

const token = AppAccessToken('secret-token');

final dashboardJson = jsonEncode({
  'response': {
    'balance': 997,
    'profile': {
      'attributes': {'country': 'si'},
    },
    'promotions': [
      {
        'name': 'ENUS_readarticle3_30points',
        'attributes': {
          'type': 'msnreadearn',
          'offerid': 'ENUS_readarticle3_30points',
          'pointprogress': '3',
          'pointmax': '30',
          'complete': 'False',
        },
      },
    ],
  },
});

/// Records every request and answers with [respond].
({MockClient client, List<http.Request> requests}) recordingClient(
    http.Response Function(http.Request request) respond) {
  final requests = <http.Request>[];
  final client = MockClient((request) async {
    requests.add(request);
    return respond(request);
  });
  return (client: client, requests: requests);
}

HttpRewardsPlatformApi apiWith(MockClient client) =>
    HttpRewardsPlatformApi(client: client, token: token, random: Random(1));

void main() {
  group('getDashboard', () {
    test('GETs the Android dashboard with the token and parses it', () async {
      // Arrange
      final mock = recordingClient((_) => http.Response(dashboardJson, 200));

      // Act
      final dashboard = await apiWith(mock.client).getDashboard();

      // Assert
      final request = mock.requests.single;
      expect(request.method, 'GET');
      expect(request.url.toString(),
          'https://prod.rewardsplatform.microsoft.com/dapi/me?channel=SAAndroid&options=613');
      expect(request.headers['Authorization'], 'Bearer secret-token');
      expect(request.headers['Cache-Control'], 'no-cache');
      expect(dashboard.balance, 997);
      expect(dashboard.promotionOfType('msnreadearn')?.progress, 3);
    });

    test('uses the iOS channel and identity when asked', () async {
      final mock = recordingClient((_) => http.Response(dashboardJson, 200));

      await apiWith(mock.client).getDashboard(channel: RewardsChannel.ios);

      final request = mock.requests.single;
      expect(request.url.queryParameters['channel'], 'SAIOS');
      expect(request.headers['X-Rewards-AppId'], 'SAIOS/33.4.440603001');
    });

    test('throws a RewardsApiException with the status for a non-2xx answer', () async {
      final mock = recordingClient((_) => http.Response('nope', 401));

      final call = apiWith(mock.client).getDashboard();

      await expectLater(
          call, throwsA(isA<RewardsApiException>().having((e) => e.statusCode, 'statusCode', 401)));
    });

    test('throws a RewardsApiException for a dashboard it cannot read', () async {
      final mock = recordingClient((_) => http.Response('{"hello":1}', 200));

      await expectLater(apiWith(mock.client).getDashboard(), throwsA(isA<RewardsApiException>()));
    });

    test('throws a RewardsApiException for a body that is not JSON', () async {
      final mock = recordingClient((_) => http.Response('<html>', 200));

      await expectLater(apiWith(mock.client).getDashboard(), throwsA(isA<RewardsApiException>()));
    });

    test('never puts the token in the exception message', () async {
      final mock = recordingClient((_) => http.Response('secret-token', 500));

      await expectLater(
        apiWith(mock.client).getDashboard(),
        throwsA(predicate((e) => !e.toString().contains('secret-token'))),
      );
    });
  });

  group('reportReadToEarn', () {
    test('POSTs one read as JSON and returns the new balance', () async {
      // Arrange
      final mock = recordingClient((_) => http.Response('{"response":{"balance":1000}}', 200));

      // Act
      final receipt = await apiWith(mock.client)
          .reportReadToEarn(offerId: 'ENUS_readarticle3_30points', country: 'si');

      // Assert
      final request = mock.requests.single;
      expect(request.method, 'POST');
      expect(request.url.toString(),
          'https://prod.rewardsplatform.microsoft.com/dapi/me/activities');
      expect(request.headers['Content-Type'], 'application/json');
      expect(request.headers['X-Rewards-AppId'], 'SAAndroid/34.5.450113001');
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['type'], 101);
      expect(body['attributes'], {'offerid': 'ENUS_readarticle3_30points'});
      expect(body['id'], matches(RegExp(r'^[0-9a-f]{128}$')));
      expect(receipt.balance, 1000);
    });

    test('throws a RewardsApiException when the report is rejected', () async {
      final mock = recordingClient((_) => http.Response('', 400));

      await expectLater(
        apiWith(mock.client).reportReadToEarn(offerId: 'x', country: 'si'),
        throwsA(isA<RewardsApiException>().having((e) => e.statusCode, 'statusCode', 400)),
      );
    });
  });

  group('submitDailyCheckIn', () {
    test('POSTs the check-in with the iOS identity', () async {
      final mock = recordingClient((_) => http.Response('{"response":{"balance":1005}}', 200));

      final receipt = await apiWith(mock.client).submitDailyCheckIn(country: null);

      final request = mock.requests.single;
      expect(request.headers['X-Rewards-AppId'], 'SAIOS/33.4.440603001');
      expect(request.headers['X-Rewards-PartnerId'], 'startapp');
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      expect(body['type'], 103);
      expect(body['channel'], 'SAIOS');
      expect(body['country'], 'us');
      expect(receipt.balance, 1005);
    });
  });
}
