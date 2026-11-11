import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/repositories/rewards_platform_api.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/daily_check_in_runner.dart';

import 'support/fake_rewards_platform_api.dart';

DailyCheckInRunner instantRunner() => DailyCheckInRunner(delay: (_) async {});

void main() {
  test('is not available when there is no check-in promotion', () async {
    final api = FakeRewardsPlatformApi(checkIn: null);

    final result = await instantRunner().run(api);

    expect(result.status, DailyCheckInStatus.notAvailable);
    expect(api.checkInCountries, isEmpty);
  });

  test('is already done when the promotion is complete', () async {
    final api = FakeRewardsPlatformApi(checkIn: checkInOffer(isComplete: true));

    final result = await instantRunner().run(api);

    expect(result.status, DailyCheckInStatus.alreadyDone);
    expect(api.checkInCountries, isEmpty);
  });

  test('completes when the iOS dashboard shows the promotion complete afterwards', () async {
    // Arrange
    final api = FakeRewardsPlatformApi(checkIn: checkInOffer(), country: 'si');

    // Act
    final result = await instantRunner().run(api);

    // Assert
    expect(result.status, DailyCheckInStatus.completed);
    expect(result.pointsEarned, 5);
    expect(api.checkInCountries, ['si']);
    expect(api.dashboardReads.last, RewardsChannel.ios);
  });

  test('completes when the balance rose even if the promotion is not marked', () async {
    final api = FakeRewardsPlatformApi(checkIn: checkInOffer(), checkInMarksComplete: false);

    final result = await instantRunner().run(api);

    expect(result.status, DailyCheckInStatus.completed);
    expect(result.pointsEarned, 5);
  });

  test('is unconfirmed when the check-in went through but nothing changed', () async {
    final api = FakeRewardsPlatformApi(checkIn: checkInOffer(), checkInWorks: false);

    final result = await instantRunner().run(api);

    expect(result.status, DailyCheckInStatus.unconfirmed);
    expect(result.pointsEarned, isNull);
  });

  test('fails with the reason when the check-in was rejected and nothing changed', () async {
    final api = FakeRewardsPlatformApi(checkIn: checkInOffer(), checkInWorks: false)
      ..checkInError = const RewardsApiException('rejected', statusCode: 400);

    final result = await instantRunner().run(api);

    expect(result.status, DailyCheckInStatus.failed);
    expect(result.failureReason, contains('400'));
  });
}
