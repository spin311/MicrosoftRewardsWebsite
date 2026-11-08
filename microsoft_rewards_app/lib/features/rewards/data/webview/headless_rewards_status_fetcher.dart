import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../../domain/entities/rewards_status.dart';
import '../../domain/repositories/rewards_status_source.dart';
import '../parsers/user_info_response.dart';
import 'page_landing_watcher.dart';
import 'webview_errors.dart';

/// Reads today's dashboard through a headless WebView, which shares the app's
/// cookie store and therefore its Microsoft session.
///
/// It opens the Rewards sign-in URL (silent single sign-on), waits for the page
/// to settle, then runs the getuserinfo fetch inside the page. Thin on purpose:
/// every decision lives in the pure, tested `user_info_response.dart` and
/// `page_landing_watcher.dart`. Not unit-tested (needs a real WebView).
class HeadlessRewardsStatusFetcher implements RewardsStatusSource {
  HeadlessRewardsStatusFetcher({
    this.timeout = const Duration(seconds: 30),
    DateTime Function() clock = DateTime.now,
  }) : _clock = clock;

  final Duration timeout;
  final DateTime Function() _clock;

  @override
  Future<RewardsStatus> fetchStatus() async {
    final now = _clock();
    // No URL is final: the sign-in may still end on /about, so always settle.
    final watcher = PageLandingWatcher();
    final webView = HeadlessInAppWebView(
      initialUrlRequest: URLRequest(url: WebUri(rewardsSignInUrl)),
      initialSettings: InAppWebViewSettings(
        javaScriptEnabled: true,
        incognito: false,
        cacheEnabled: true,
      ),
      onLoadStart: (_, url) => watcher.loadStarted(url),
      onLoadStop: (_, url) => watcher.loadStopped(url),
      onReceivedError: (_, request, error) {
        if (isFatalMainFrameError(request, error)) watcher.mainFrameFailed(error.description);
      },
    );

    try {
      // Outside the timeout: the plugin's dispose() only releases a WebView
      // whose run() has returned.
      await webView.run();
      return await _awaitAndFetch(webView, watcher, now).timeout(timeout);
    } on TimeoutException {
      return RewardsStatusFailed(error: RewardsStatusError.network, fetchedAt: now);
    } catch (error) {
      // Never throws: callers rely on a status, and a throw must not end a run.
      debugPrint('Rewards status fetch failed: ${error.runtimeType}');
      return RewardsStatusFailed(error: RewardsStatusError.network, fetchedAt: now);
    } finally {
      watcher.dispose();
      try {
        await webView.dispose();
      } catch (error) {
        debugPrint('Rewards status WebView dispose failed: ${error.runtimeType}');
      }
    }
  }

  Future<RewardsStatus> _awaitAndFetch(
    HeadlessInAppWebView webView,
    PageLandingWatcher watcher,
    DateTime now,
  ) async {
    final landing = await watcher.landing;
    final controller = webView.webViewController;

    if (landing is PageLoadFailed || controller == null) {
      return RewardsStatusFailed(error: RewardsStatusError.network, fetchedAt: now);
    }
    // Settled off rewards.bing.com (e.g. the login.live.com password form):
    // single sign-on didn't happen, and an in-page fetch would hit the wrong
    // origin.
    if (landing is PageLanded && !isOnRewardsSite(landing.url)) {
      return RewardsStatusFailed(error: RewardsStatusError.signedOut, fetchedAt: now);
    }

    final result = await controller.callAsyncJavaScript(functionBody: userInfoFetchScript);
    return interpretUserInfoScriptResult(value: result?.value, error: result?.error, now: now);
  }
}
