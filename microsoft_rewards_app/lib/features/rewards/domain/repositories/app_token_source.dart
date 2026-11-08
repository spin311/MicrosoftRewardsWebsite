import '../entities/app_token_result.dart';

/// Gets a fresh Bing app token for the Rewards platform API.
abstract interface class AppTokenSource {
  Future<AppTokenResult> obtainToken();
}
