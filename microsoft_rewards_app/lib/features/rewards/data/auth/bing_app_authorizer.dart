/// The outcome of asking login.live.com for a Bing app authorization code.
sealed class AuthCodeResult {
  const AuthCodeResult();
}

final class AuthCodeGranted extends AuthCodeResult {
  const AuthCodeGranted(this.code);

  /// Short-lived and single-use, but still a credential: never log it.
  final String code;

  @override
  String toString() => 'AuthCodeGranted(<redacted>)';
}

/// The authorize page wanted a sign-in instead of redirecting with a code.
final class AuthCodeSignedOut extends AuthCodeResult {
  const AuthCodeSignedOut();
}

final class AuthCodeFailed extends AuthCodeResult {
  const AuthCodeFailed(this.reason);

  final String reason;

  @override
  String toString() => 'AuthCodeFailed($reason)';
}

/// Gets an authorization code for the Bing app client through the app's
/// signed-in cookie store (single sign-on, no UI).
abstract interface class BingAppAuthorizer {
  Future<AuthCodeResult> requestCode();
}
