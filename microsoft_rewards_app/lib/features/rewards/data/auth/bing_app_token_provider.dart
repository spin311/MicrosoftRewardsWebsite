import '../../domain/entities/app_token_result.dart';
import '../../domain/repositories/app_token_source.dart';
import 'bing_app_authorizer.dart';
import 'bing_app_token_exchange.dart';

/// Gets a fresh Bing app token: an authorization code through single sign-on,
/// then the token exchange. Call it once per run; nothing is cached.
class BingAppTokenProvider implements AppTokenSource {
  BingAppTokenProvider({
    required BingAppAuthorizer authorizer,
    required BingAppTokenExchange exchange,
  })  : _authorizer = authorizer,
        _exchange = exchange;

  final BingAppAuthorizer _authorizer;
  final BingAppTokenExchange _exchange;

  @override
  Future<AppTokenResult> obtainToken() async {
    return switch (await _authorizer.requestCode()) {
      AuthCodeGranted(:final code) => _exchange.exchange(code),
      AuthCodeSignedOut() => const AppTokenSignedOut(),
      AuthCodeFailed(:final reason) => AppTokenFailed(reason),
    };
  }
}
