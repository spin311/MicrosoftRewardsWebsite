import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/presentation/rewards_messages.dart';
import 'package:microsoft_automatic_rewards/features/rewards/rewards.dart';

final _now = DateTime(2026, 11, 8, 13);

RewardsStatus _loaded({int? points = 263, PointCounter? pc, PointCounter? mobile}) =>
    RewardsStatusLoaded(
      snapshot: RewardsSnapshot(points: points, pcSearch: pc, mobileSearch: mobile),
      fetchedAt: _now,
    );

RewardsStatus _failed(RewardsStatusError error) =>
    RewardsStatusFailed(error: error, fetchedAt: _now);

AppPointsReport _granted({ReadToEarnResult? read, DailyCheckInResult? checkIn}) =>
    AppPointsReport(auth: AppPointsAuth.granted, readToEarn: read, dailyCheckIn: checkIn);

void main() {
  group('describeStatus', () {
    test('says it is checking before the first status arrives', () {
      expect(describeStatus(null), 'Checking Microsoft Rewards…');
    });

    test('shows points and the shared Search counter on Member accounts', () {
      final status = _loaded(pc: const PointCounter(progress: 6, max: 15));

      expect(describeStatus(status), '263 points · Searches 6/15');
    });

    test('labels the separate mobile counter when the account has one', () {
      final status = _loaded(
        pc: const PointCounter(progress: 30, max: 90),
        mobile: const PointCounter(progress: 20, max: 60),
      );

      expect(describeStatus(status), '263 points · Mobile searches 20/60');
    });

    test('says when the user is not signed in to Rewards', () {
      expect(describeStatus(_failed(RewardsStatusError.signedOut)),
          'Not signed in to Microsoft Rewards');
    });

    test('says when the status could not be loaded', () {
      expect(describeStatus(_failed(RewardsStatusError.network)),
          "Couldn't load your Rewards status");
      expect(describeStatus(_failed(RewardsStatusError.unrecognized)),
          "Couldn't load your Rewards status");
    });
  });

  group('describeAlreadyComplete', () {
    test('names the maxed counter', () {
      final status = _loaded(pc: const PointCounter(progress: 15, max: 15));

      expect(describeAlreadyComplete(status),
          "Today's searches are already complete (Searches 15/15).");
    });
  });

  group('describeSearchRun', () {
    test('reports the points earned between the two readings', () {
      final message = describeSearchRun(
        before: _loaded(pc: const PointCounter(progress: 6, max: 15)),
        after: _loaded(pc: const PointCounter(progress: 12, max: 15)),
        searchesDone: 2,
        stoppedMaxed: false,
      );

      expect(message, '2 searches done: +6 points (Searches 12/15).');
    });

    test('says when the counter maxed during the run', () {
      final message = describeSearchRun(
        before: _loaded(pc: const PointCounter(progress: 6, max: 15)),
        after: _loaded(pc: const PointCounter(progress: 15, max: 15)),
        searchesDone: 3,
        stoppedMaxed: true,
      );

      expect(message,
          "Stopped after 3 searches: today's searches are complete (+9 points, Searches 15/15).");
    });

    test('warns when no search was credited', () {
      final message = describeSearchRun(
        before: _loaded(pc: const PointCounter(progress: 6, max: 15)),
        after: _loaded(pc: const PointCounter(progress: 6, max: 15)),
        searchesDone: 4,
        stoppedMaxed: false,
      );

      expect(message,
          "4 searches done, but Microsoft credited none of them (Searches 6/15).");
    });

    test('warns when the user is not signed in to Rewards', () {
      final message = describeSearchRun(
        before: _failed(RewardsStatusError.signedOut),
        after: _failed(RewardsStatusError.signedOut),
        searchesDone: 5,
        stoppedMaxed: false,
      );

      expect(message,
          "5 searches done, but you're not signed in to Microsoft Rewards, so they may not count.");
    });

    test('falls back to a plain count when the status is unknown', () {
      final message = describeSearchRun(
        before: _failed(RewardsStatusError.network),
        after: _failed(RewardsStatusError.network),
        searchesDone: 1,
        stoppedMaxed: false,
      );

      expect(message, '1 search done.');
    });
  });

  group('describeAppPoints', () {
    test('reports Read to Earn points', () {
      final report = _granted(
        read: const ReadToEarnResult(
            status: ReadToEarnStatus.completed, pointsEarned: 27, progress: 30, max: 30, reportsSent: 9),
      );

      expect(describeAppPoints(report), 'Read to Earn: +27 points (30/30).');
    });

    test('says Read to Earn was already done and adds the check-in result', () {
      final report = _granted(
        read: const ReadToEarnResult(
            status: ReadToEarnStatus.alreadyDone, pointsEarned: 0, progress: 30, max: 30, reportsSent: 0),
        checkIn: const DailyCheckInResult(status: DailyCheckInStatus.completed, pointsEarned: 5),
      );

      expect(describeAppPoints(report),
          'Read to Earn is already done today (30/30). Daily check-in: +5 points.');
    });

    test('leaves out a check-in the account does not offer', () {
      final report = _granted(
        read: const ReadToEarnResult(
            status: ReadToEarnStatus.notAvailable, pointsEarned: 0, reportsSent: 0),
        checkIn: const DailyCheckInResult(status: DailyCheckInStatus.notAvailable),
      );

      expect(describeAppPoints(report), "Read to Earn isn't offered on this account today.");
    });

    test('explains a stalled run', () {
      final report = _granted(
        read: const ReadToEarnResult(
            status: ReadToEarnStatus.stalled, pointsEarned: 9, progress: 12, max: 30, reportsSent: 5),
      );

      expect(describeAppPoints(report),
          'Read to Earn stopped: Microsoft stopped crediting reads (+9 points, 12/30). Try again later.');
    });

    test('asks the user to sign in again when the token was refused', () {
      const report = AppPointsReport(auth: AppPointsAuth.signedOut);

      expect(describeAppPoints(report), 'Sign in again to collect app points.');
    });

    test('reports a connection failure', () {
      const report = AppPointsReport(auth: AppPointsAuth.failed, authFailureReason: 'timeout');

      expect(describeAppPoints(report), "Couldn't reach the Bing app service (timeout).");
    });
  });
}
