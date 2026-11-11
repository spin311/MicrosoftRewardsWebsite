import 'app_access_token.dart';

/// The outcome of getting a Bing app token through single sign-on.
sealed class AppTokenResult {
  const AppTokenResult();
}

final class AppTokenGranted extends AppTokenResult {
  const AppTokenGranted(this.token);

  final AppAccessToken token;

  @override
  String toString() => 'AppTokenGranted($token)';
}

/// No Microsoft session in the app's cookie store: the user must sign in.
final class AppTokenSignedOut extends AppTokenResult {
  const AppTokenSignedOut();

  @override
  String toString() => 'AppTokenSignedOut()';
}

final class AppTokenFailed extends AppTokenResult {
  const AppTokenFailed(this.reason);

  /// Short and safe to show or log: never contains a code or token.
  final String reason;

  @override
  String toString() => 'AppTokenFailed($reason)';
}
