/// A Bing app access token for the Rewards platform API.
///
/// Held in memory for one run only: never persist or log it. [toString] is
/// redacted so it can't leak through string interpolation or error messages.
class AppAccessToken {
  const AppAccessToken(this.value);

  final String value;

  @override
  String toString() => 'AppAccessToken(<redacted>)';
}
