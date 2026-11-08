import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/core/di/SearchCancellationToken.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/read_to_earn_result.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/read_to_earn_runner.dart';

import 'support/fake_rewards_platform_api.dart';

/// A runner that records its delays instead of sleeping.
({ReadToEarnRunner runner, List<Duration> delays}) instantRunner() {
  final delays = <Duration>[];
  final runner = ReadToEarnRunner(
    delay: (duration) async => delays.add(duration),
    random: Random(42),
  );
  return (runner: runner, delays: delays);
}

void main() {
  test('completes 0 to 30 in 10 reports of 3 points', () async {
    // Arrange
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 0, max: 30));
    final progress = <(int, int)>[];

    // Act
    final result = await instantRunner().runner.run(
          api,
          onProgress: (value, max) => progress.add((value, max)),
        );

    // Assert
    expect(
      result,
      const ReadToEarnResult(
        status: ReadToEarnStatus.completed,
        pointsEarned: 30,
        progress: 30,
        max: 30,
        reportsSent: 10,
      ),
    );
    expect(api.readReports, hasLength(10));
    expect(progress.first, (0, 30));
    expect(progress.last, (30, 30));
    expect(progress, hasLength(11));
  });

  test('reports the offer id and the profile country', () async {
    final api = FakeRewardsPlatformApi(
      readOffer: readToEarnOffer(progress: 27, max: 30),
      country: 'si',
    );

    await instantRunner().runner.run(api);

    expect(api.readReports.single, (offerId: 'ENUS_readarticle3_30points', country: 'si'));
  });

  test('waits a random 5 to 12 seconds after every report', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 0, max: 30));
    final subject = instantRunner();

    await subject.runner.run(api);

    expect(subject.delays, hasLength(10));
    for (final delay in subject.delays) {
      expect(delay, greaterThanOrEqualTo(const Duration(seconds: 5)));
      expect(delay, lessThanOrEqualTo(const Duration(seconds: 12)));
    }
  });

  test('stops after 2 reports in a row that added nothing', () async {
    // Arrange: progress moves once, then the server stops crediting.
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 0, max: 30));
    final subject = instantRunner();

    // Act
    final result = await subject.runner.run(
      api,
      onProgress: (value, _) {
        if (value >= 3) api.pointsPerRead = 0;
      },
    );

    // Assert
    expect(result.status, ReadToEarnStatus.stalled);
    expect(result.reportsSent, 3);
    expect(result.pointsEarned, 3);
    expect(result.progress, 3);
  });

  test('is not available when there is no Read to Earn offer', () async {
    final api = FakeRewardsPlatformApi(readOffer: null);

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.notAvailable);
    expect(result.progress, isNull);
    expect(api.readReports, isEmpty);
  });

  test('is already done when the offer is marked complete', () async {
    final api = FakeRewardsPlatformApi(
        readOffer: readToEarnOffer(progress: 27, max: 30, isComplete: true));

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.alreadyDone);
    expect(result.pointsEarned, 0);
    expect(api.readReports, isEmpty);
  });

  test('is already done when progress already reached the max', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 30, max: 30));

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.alreadyDone);
    expect(result.progress, 30);
    expect(api.readReports, isEmpty);
  });

  test('stops when cancelled and reports what was earned so far', () async {
    // Arrange
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 0, max: 30));
    final token = SearchCancellationToken();

    // Act
    final result = await instantRunner().runner.run(
      api,
      cancellationToken: token,
      onProgress: (value, _) {
        if (value == 9) token.cancel();
      },
    );

    // Assert
    expect(result.status, ReadToEarnStatus.cancelled);
    expect(result.reportsSent, 3);
    expect(result.pointsEarned, 9);
  });

  test('does not report at all when cancelled before starting', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer());
    final token = SearchCancellationToken()..cancel();

    final result = await instantRunner().runner.run(api, cancellationToken: token);

    expect(result.status, ReadToEarnStatus.cancelled);
    expect(api.readReports, isEmpty);
  });

  test('sends at most 12 reports', () async {
    final api = FakeRewardsPlatformApi(
      readOffer: readToEarnOffer(progress: 0, max: 30),
      pointsPerRead: 1,
    );

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.reportLimitReached);
    expect(api.readReports, hasLength(12));
    expect(result.progress, 12);
    expect(result.pointsEarned, 12);
  });

  test('fails with the progress so far when the API errors mid-run', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: 0, max: 30))
      ..failOnReport = 3;

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.failed);
    expect(result.pointsEarned, 6);
    expect(result.reportsSent, 2);
    expect(result.failureReason, contains('500'));
  });

  test('fails rather than guessing when the offer progress is unreadable', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(progress: null, max: 30));

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.failed);
    expect(api.readReports, isEmpty);
  });

  test('fails rather than guessing when the offer has no offer id', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(offerId: null));

    final result = await instantRunner().runner.run(api);

    expect(result.status, ReadToEarnStatus.failed);
    expect(api.readReports, isEmpty);
  });
}
