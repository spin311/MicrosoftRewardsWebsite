import 'package:equatable/equatable.dart';

import '../../../../core/di/SearchCancellationToken.dart';
import '../entities/app_token_result.dart';
import '../repositories/app_token_source.dart';
import '../repositories/rewards_platform_api.dart';
import 'daily_check_in_runner.dart';
import 'delay.dart';
import 'read_to_earn_result.dart';
import 'read_to_earn_runner.dart';

enum AppPointsAuth { granted, signedOut, failed }

/// What one app-points run did. The token itself never leaves the service.
class AppPointsReport extends Equatable {
  const AppPointsReport({
    required this.auth,
    this.authFailureReason,
    this.readToEarn,
    this.dailyCheckIn,
  });

  final AppPointsAuth auth;
  final String? authFailureReason;

  /// Null when nothing ran (no token).
  final ReadToEarnResult? readToEarn;

  /// Null when skipped: no token, not requested, or the run was cancelled.
  final DailyCheckInResult? dailyCheckIn;

  @override
  List<Object?> get props => [auth, authFailureReason, readToEarn, dailyCheckIn];
}

/// What the UI needs from the app-points feature; lets tests swap in a fake.
abstract interface class AppPointsEarner {
  Future<AppPointsReport> earn({
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onReadToEarnProgress,
    bool includeDailyCheckIn = true,
  });
}

/// Earns the points only the Bing mobile app can: Read to Earn, then
/// (best effort) the daily check-in. The single entry point for the UI.
class AppPointsService implements AppPointsEarner {
  AppPointsService({
    required AppTokenSource tokenSource,
    required RewardsPlatformApiFactory apiFactory,
    ReadToEarnRunner? readToEarnRunner,
    DailyCheckInRunner? dailyCheckInRunner,
  })  : _tokenSource = tokenSource,
        _apiFactory = apiFactory,
        _readToEarn = readToEarnRunner ?? ReadToEarnRunner(),
        _dailyCheckIn = dailyCheckInRunner ?? DailyCheckInRunner();

  final AppTokenSource _tokenSource;
  final RewardsPlatformApiFactory _apiFactory;
  final ReadToEarnRunner _readToEarn;
  final DailyCheckInRunner _dailyCheckIn;

  @override
  Future<AppPointsReport> earn({
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onReadToEarnProgress,
    bool includeDailyCheckIn = true,
  }) async {
    switch (await _tokenSource.obtainToken()) {
      case AppTokenSignedOut():
        return const AppPointsReport(auth: AppPointsAuth.signedOut);
      case AppTokenFailed(:final reason):
        return AppPointsReport(auth: AppPointsAuth.failed, authFailureReason: reason);
      case AppTokenGranted() when cancellationToken?.isCancelled ?? false:
        return const AppPointsReport(
          auth: AppPointsAuth.granted,
          readToEarn: ReadToEarnResult(status: ReadToEarnStatus.cancelled),
        );
      case AppTokenGranted(:final token):
        return _earnWith(_apiFactory(token), cancellationToken, onReadToEarnProgress,
            includeDailyCheckIn);
    }
  }

  Future<AppPointsReport> _earnWith(
    RewardsPlatformApi api,
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onReadToEarnProgress,
    bool includeDailyCheckIn,
  ) async {
    final readToEarn = await _readToEarn.run(
      api,
      cancellationToken: cancellationToken,
      onProgress: onReadToEarnProgress,
    );
    final isCancelled = cancellationToken?.isCancelled ?? false;
    final dailyCheckIn = includeDailyCheckIn && !isCancelled ? await _dailyCheckIn.run(api) : null;

    return AppPointsReport(
      auth: AppPointsAuth.granted,
      readToEarn: readToEarn,
      dailyCheckIn: dailyCheckIn,
    );
  }
}
