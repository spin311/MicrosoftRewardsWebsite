import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/auth/bing_app_authorizer.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/auth/bing_app_token_exchange.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/auth/bing_app_token_provider.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_access_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_token_result.dart';

class FakeAuthorizer implements BingAppAuthorizer {
  FakeAuthorizer(this.result);

  final AuthCodeResult result;
  int calls = 0;

  @override
  Future<AuthCodeResult> requestCode() async {
    calls++;
    return result;
  }
}

void main() {
  group('BingAppTokenExchange', () {
    test('POSTs the code as a form and returns the access token', () async {
      // Arrange
      late http.Request sent;
      final client = MockClient((request) async {
        sent = request;
        return http.Response('{"access_token":"tok","refresh_token":"ref","expires_in":3600}', 200);
      });

      // Act
      final result = await BingAppTokenExchange(client: client).exchange('the-code');

      // Assert
      expect(sent.method, 'POST');
      expect(sent.url.toString(), 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token');
      expect(sent.headers['Content-Type'], startsWith('application/x-www-form-urlencoded'));
      expect(sent.bodyFields, {
        'grant_type': 'authorization_code',
        'client_id': '0000000040170455',
        'code': 'the-code',
        'redirect_uri': 'https://login.live.com/oauth20_desktop.srf',
        'scope': 'service::prod.rewardsplatform.microsoft.com::MBI_SSL',
      });
      expect(result, isA<AppTokenGranted>().having((r) => r.token.value, 'token', 'tok'));
    });

    test('fails when the answer has no access_token', () async {
      final client = MockClient((_) async => http.Response('{"token_type":"bearer"}', 200));

      final result = await BingAppTokenExchange(client: client).exchange('c');

      expect(result, isA<AppTokenFailed>());
    });

    test('fails with the OAuth error code when the code is rejected', () async {
      final client = MockClient((_) async =>
          http.Response('{"error":"invalid_grant","error_description":"expired"}', 400));

      final result = await BingAppTokenExchange(client: client).exchange('c');

      expect(result, isA<AppTokenFailed>().having((r) => r.reason, 'reason', contains('invalid_grant')));
    });

    test('fails when the answer is not JSON', () async {
      final client = MockClient((_) async => http.Response('<html>', 200));

      expect(await BingAppTokenExchange(client: client).exchange('c'), isA<AppTokenFailed>());
    });

    test('fails instead of throwing when the request does not go through', () async {
      final client = MockClient((_) async => throw http.ClientException('offline'));

      expect(await BingAppTokenExchange(client: client).exchange('c'), isA<AppTokenFailed>());
    });
  });

  group('BingAppTokenProvider', () {
    test('exchanges the code the authorizer captured', () async {
      // Arrange
      String? exchangedCode;
      final client = MockClient((request) async {
        exchangedCode = request.bodyFields['code'];
        return http.Response('{"access_token":"tok"}', 200);
      });
      final provider = BingAppTokenProvider(
        authorizer: FakeAuthorizer(const AuthCodeGranted('captured')),
        exchange: BingAppTokenExchange(client: client),
      );

      // Act
      final result = await provider.obtainToken();

      // Assert
      expect(exchangedCode, 'captured');
      expect(result, isA<AppTokenGranted>());
    });

    test('reports signed out without calling the token endpoint', () async {
      var tokenCalls = 0;
      final client = MockClient((_) async {
        tokenCalls++;
        return http.Response('{}', 200);
      });
      final provider = BingAppTokenProvider(
        authorizer: FakeAuthorizer(const AuthCodeSignedOut()),
        exchange: BingAppTokenExchange(client: client),
      );

      final result = await provider.obtainToken();

      expect(result, isA<AppTokenSignedOut>());
      expect(tokenCalls, 0);
    });

    test('passes an authorization failure through with its reason', () async {
      final provider = BingAppTokenProvider(
        authorizer: FakeAuthorizer(const AuthCodeFailed('timed out')),
        exchange: BingAppTokenExchange(client: MockClient((_) async => http.Response('{}', 200))),
      );

      final result = await provider.obtainToken();

      expect(result, isA<AppTokenFailed>().having((r) => r.reason, 'reason', 'timed out'));
    });
  });

  test('AppAccessToken never prints its value', () {
    expect(const AppAccessToken('secret').toString(), isNot(contains('secret')));
    expect(const AppTokenGranted(AppAccessToken('secret')).toString(), isNot(contains('secret')));
  });
}
