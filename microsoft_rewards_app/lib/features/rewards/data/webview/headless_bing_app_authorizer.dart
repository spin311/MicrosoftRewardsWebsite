import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../auth/bing_app_authorizer.dart';
import '../auth/bing_app_oauth.dart';
import 'page_landing_watcher.dart';
import 'webview_errors.dart';

/// Captures a Bing app authorization code in a headless WebView. The WebView
/// shares the app's cookie store, so a signed-in user is redirected straight
/// to the desktop redirect URI with a code (single sign-on, no UI).
///
/// Thin on purpose: URL building and parsing live in the pure, tested
/// `bing_app_oauth.dart`. Not unit-tested (needs a real WebView).
class HeadlessBingAppAuthorizer implements BingAppAuthorizer {
  HeadlessBingAppAuthorizer({
    this.timeout = const Duration(seconds: 30),
    Random? random,
  }) : _random = random ?? Random.secure();

  final Duration timeout;
  final Random _random;

  @override
  Future<AuthCodeResult> requestCode() async {
    final state = generateOAuthState(_random);
    bool isRedirect(Uri? url) =>
        parseAuthRedirect(url, expectedState: state) is! AuthRedirectPending;

    final watcher = PageLandingWatcher(isFinal: isRedirect);
    final webView = HeadlessInAppWebView(
      initialUrlRequest: URLRequest(url: WebUri.uri(buildAuthorizeUri(state: state))),
      initialSettings: InAppWebViewSettings(
        javaScriptEnabled: true,
        incognito: false,
        useShouldOverrideUrlLoading: true,
      ),
      // The redirect URL is all we need: take it and don't load the page.
      shouldOverrideUrlLoading: (_, action) async {
        final url = action.request.url;
        if (!isRedirect(url)) return NavigationActionPolicy.ALLOW;
        watcher.finishIfFinal(url);
        return NavigationActionPolicy.CANCEL;
      },
      onLoadStart: (_, url) {
        watcher.finishIfFinal(url);
        watcher.loadStarted(url);
      },
      onLoadStop: (_, url) => watcher.loadStopped(url),
      onReceivedError: (_, request, error) {
        if (isFatalMainFrameError(request, error)) watcher.mainFrameFailed(error.description);
      },
    );

    try {
      await webView.run();
      final landing = await watcher.landing.timeout(timeout);
      return switch (landing) {
        PageLoadFailed() => const AuthCodeFailed('authorize page failed to load (network)'),
        PageLanded(:final url) => authCodeResultFor(url, expectedState: state),
      };
    } on TimeoutException {
      return const AuthCodeFailed('authorization timed out');
    } on Exception catch (error) {
      debugPrint('Bing app authorization failed: ${error.runtimeType}');
      return const AuthCodeFailed('authorization failed unexpectedly');
    } finally {
      watcher.dispose();
      await webView.dispose();
    }
  }
}
