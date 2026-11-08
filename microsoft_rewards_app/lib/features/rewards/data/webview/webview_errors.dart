import 'package:flutter_inappwebview/flutter_inappwebview.dart';

/// A main-frame load error that means the page can't load. A cancelled
/// navigation is not one: redirects supersede navigations during sign-on.
bool isFatalMainFrameError(WebResourceRequest request, WebResourceError error) {
  // iOS leaves isForMainFrame null; it only reports main-frame failures.
  final isMainFrame = request.isForMainFrame ?? true;
  return isMainFrame && error.type != WebResourceErrorType.CANCELLED;
}
