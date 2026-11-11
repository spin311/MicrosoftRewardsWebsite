import 'dart:async';

/// Where a headless page ended up.
sealed class PageLanding {
  const PageLanding();
}

final class PageLanded extends PageLanding {
  const PageLanded(this.url);

  final Uri? url;
}

final class PageLoadFailed extends PageLanding {
  const PageLoadFailed(this.description);

  final String description;
}

/// Decides when a headless WebView has landed, from its navigation events.
///
/// Single sign-on passes through login.live.com pages that finish loading and
/// then navigate on, so a finished load is only the landing once no new
/// navigation starts within [settleDelay]. A URL that [isFinal] accepts lands
/// at once. Pure Dart, so the WebView classes stay thin.
class PageLandingWatcher {
  PageLandingWatcher({
    bool Function(Uri? url)? isFinal,
    this.settleDelay = const Duration(seconds: 3),
  }) : _isFinal = isFinal ?? _neverFinal;

  final bool Function(Uri? url) _isFinal;
  final Duration settleDelay;
  final _landing = Completer<PageLanding>();
  Timer? _settleTimer;

  static bool _neverFinal(Uri? _) => false;

  /// Completes once, with the first outcome.
  Future<PageLanding> get landing => _landing.future;

  /// A navigation started: whatever page just finished wasn't the last one.
  void loadStarted(Uri? url) => _settleTimer?.cancel();

  void loadStopped(Uri? url) {
    if (_landing.isCompleted) return;
    if (_isFinal(url)) return _finish(PageLanded(url));
    _settleTimer?.cancel();
    _settleTimer = Timer(settleDelay, () => _finish(PageLanded(url)));
  }

  /// Lands on [url] without waiting for it to load, if [isFinal] accepts it.
  /// For redirects whose URL is all we need, such as an OAuth code.
  void finishIfFinal(Uri? url) {
    if (_isFinal(url)) _finish(PageLanded(url));
  }

  void mainFrameFailed(String description) => _finish(PageLoadFailed(description));

  void dispose() => _settleTimer?.cancel();

  void _finish(PageLanding landing) {
    if (_landing.isCompleted) return;
    _settleTimer?.cancel();
    _landing.complete(landing);
  }
}
