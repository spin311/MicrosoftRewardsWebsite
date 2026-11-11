import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/webview/page_landing_watcher.dart';

final dashboard = Uri.parse('https://rewards.bing.com/');
final login = Uri.parse('https://login.live.com/login.srf');
const settle = Duration(milliseconds: 20);

PageLandingWatcher watcher() => PageLandingWatcher(
      isFinal: (url) => url?.host == 'rewards.bing.com',
      settleDelay: settle,
    );

Uri? landedUrl(PageLanding landing) => landing is PageLanded ? landing.url : null;

void main() {
  test('lands as soon as a final page finishes loading', () async {
    // Arrange
    final subject = watcher();

    // Act
    subject.loadStopped(dashboard);

    // Assert
    expect(landedUrl(await subject.landing), dashboard);
  });

  test('settles on a non-final page only after the settle delay', () async {
    final subject = watcher();
    var landed = false;
    subject.landing.then((_) => landed = true);

    subject.loadStopped(login);
    await Future<void>.delayed(Duration.zero);

    expect(landed, isFalse);
    expect(landedUrl(await subject.landing), login);
  });

  // Single sign-on passes through login.live.com pages that finish loading and
  // then move on; those must not read as the final page.
  test('keeps waiting when a new navigation starts within the settle delay', () async {
    final subject = watcher();

    subject.loadStopped(login);
    subject.loadStarted(dashboard);
    await Future<void>.delayed(settle * 3);
    subject.loadStopped(dashboard);

    expect(landedUrl(await subject.landing), dashboard);
  });

  test('finishIfFinal lands on a final URL without waiting for the load', () async {
    final subject = watcher();

    subject.finishIfFinal(login);
    subject.finishIfFinal(dashboard);

    expect(landedUrl(await subject.landing), dashboard);
  });

  test('reports a main-frame load failure', () async {
    final subject = watcher();

    subject.mainFrameFailed('net::ERR_INTERNET_DISCONNECTED');

    expect(await subject.landing, isA<PageLoadFailed>());
  });

  test('keeps the first outcome and ignores later events', () async {
    final subject = watcher();

    subject.loadStopped(dashboard);
    subject.mainFrameFailed('late error');
    subject.loadStopped(login);

    expect(landedUrl(await subject.landing), dashboard);
  });

  // The status fetcher can't trust any URL to be final (the Rewards sign-in
  // may still end on /about), so without a predicate every page must settle.
  test('without a final predicate even a rewards page waits to settle', () async {
    final subject = PageLandingWatcher(settleDelay: settle);
    var landed = false;
    subject.landing.then((_) => landed = true);

    subject.loadStopped(dashboard);
    await Future<void>.delayed(Duration.zero);

    expect(landed, isFalse);
    expect(landedUrl(await subject.landing), dashboard);
  });
}
