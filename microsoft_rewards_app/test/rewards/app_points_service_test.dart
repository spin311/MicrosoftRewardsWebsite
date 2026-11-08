import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/core/di/search_cancellation_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_access_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_token_result.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/repositories/app_token_source.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/app_points_service.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/daily_check_in_runner.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/read_to_earn_result.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/usecases/read_to_earn_runner.dart';

import 'support/fake_rewards_platform_api.dart';

class FakeTokenSource implements AppTokenSource {
  FakeTokenSource(this.result);

  final AppTokenResult result;

  @override
  Future<AppTokenResult> obtainToken() async => result;
}

({AppPointsService service, List<AppAccessToken> tokens}) serviceWith(
  AppTokenResult tokenResult,
  FakeRewardsPlatformApi api,
) {
  final tokens = <AppAccessToken>[];
  final service = AppPointsService(
    tokenSource: FakeTokenSource(tokenResult),
    apiFactory: (token) {
      tokens.add(token);
      return api;
    },
    readToEarnRunner: ReadToEarnRunner(delay: (_) async {}, random: Random(1)),
    dailyCheckInRunner: DailyCheckInRunner(delay: (_) async {}),
  );
  return (service: service, tokens: tokens);
}

const granted = AppTokenGranted(AppAccessToken('tok'));

void main() {
  test('reports signed out and runs nothing without a session', () async {
    // Arrange
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(), checkIn: checkInOffer());
    final subject = serviceWith(const AppTokenSignedOut(), api);

    // Act
    final report = await subject.service.earn();

    // Assert
    expect(report.auth, AppPointsAuth.signedOut);
    expect(report.readToEarn, isNull);
    expect(report.dailyCheckIn, isNull);
    expect(subject.tokens, isEmpty);
  });

  test('stops before any API call when cancelled while the token was fetched', () async {
    // Arrange
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(), checkIn: checkInOffer());
    final subject = serviceWith(granted, api);
    final token = SearchCancellationToken()..cancel();

    // Act
    final report = await subject.service.earn(cancellationToken: token);

    // Assert
    expect(report.readToEarn?.status, ReadToEarnStatus.cancelled);
    expect(report.dailyCheckIn, isNull);
    expect(subject.tokens, isEmpty);
  });

  test('passes an authorization failure through with its reason', () async {
    final subject = serviceWith(const AppTokenFailed('timed out'), FakeRewardsPlatformApi());

    final report = await subject.service.earn();

    expect(report.auth, AppPointsAuth.failed);
    expect(report.authFailureReason, 'timed out');
  });

  test('runs Read to Earn and then the check-in with the granted token', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(), checkIn: checkInOffer());
    final subject = serviceWith(granted, api);
    final progress = <int>[];

    final report = await subject.service.earn(onReadToEarnProgress: (value, _) => progress.add(value));

    expect(report.auth, AppPointsAuth.granted);
    expect(subject.tokens.single.value, 'tok');
    expect(report.readToEarn?.status, ReadToEarnStatus.completed);
    expect(report.dailyCheckIn?.status, DailyCheckInStatus.completed);
    expect(progress.last, 30);
  });

  test('skips the check-in when asked to', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(), checkIn: checkInOffer());

    final report = await serviceWith(granted, api).service.earn(includeDailyCheckIn: false);

    expect(report.dailyCheckIn, isNull);
    expect(api.checkInCountries, isEmpty);
  });

  test('skips the check-in once the run is cancelled', () async {
    final api = FakeRewardsPlatformApi(readOffer: readToEarnOffer(), checkIn: checkInOffer());
    final token = SearchCancellationToken();

    final report = await serviceWith(granted, api).service.earn(
          cancellationToken: token,
          onReadToEarnProgress: (value, _) {
            if (value == 6) token.cancel();
          },
        );

    expect(report.readToEarn?.status, ReadToEarnStatus.cancelled);
    expect(report.dailyCheckIn, isNull);
  });
}
