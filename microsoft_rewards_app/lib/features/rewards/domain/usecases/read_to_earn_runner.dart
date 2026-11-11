import 'dart:math';

import '../../../../core/di/SearchCancellationToken.dart';
import '../entities/app_dashboard.dart';
import '../repositories/rewards_platform_api.dart';
import 'delay.dart';
import 'read_to_earn_result.dart';

/// Earns the Bing app's Read to Earn points: reports one read at a time and
/// re-reads the dashboard after each, so progress is always what Microsoft
/// credited, never what we assume.
class ReadToEarnRunner {
  ReadToEarnRunner({
    Delay delay = realDelay,
    Random? random,
    this.minDelay = const Duration(seconds: 5),
    this.maxDelay = const Duration(seconds: 12),
    this.maxReports = 12,
    this.maxReportsWithoutProgress = 2,
  })  : _delay = delay,
        _random = random ?? Random();

  final Delay _delay;
  final Random _random;
  final Duration minDelay;
  final Duration maxDelay;
  final int maxReports;
  final int maxReportsWithoutProgress;

  /// Never throws for API or network errors: they end the run as
  /// [ReadToEarnStatus.failed] with the progress made so far. A cancellation
  /// during the post-report wait ends the run without re-reading progress.
  Future<ReadToEarnResult> run(
    RewardsPlatformApi api, {
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onProgress,
  }) async {
    final AppDashboard dashboard;
    try {
      dashboard = await api.getDashboard();
    } on Exception catch (error) {
      return ReadToEarnResult(status: ReadToEarnStatus.failed, failureReason: '$error');
    }

    final offer = dashboard.promotionOfType(readToEarnPromotionType);
    if (offer == null) return const ReadToEarnResult(status: ReadToEarnStatus.notAvailable);
    final progress = offer.progress;
    final max = offer.max;
    if (offer.isDone) {
      return ReadToEarnResult(status: ReadToEarnStatus.alreadyDone, progress: progress, max: max);
    }
    final offerId = offer.offerId;
    if (offerId == null || progress == null || max == null) {
      return const ReadToEarnResult(
        status: ReadToEarnStatus.failed,
        failureReason: 'Read to Earn offer without a readable id or progress',
      );
    }
    if (max <= 0) return const ReadToEarnResult(status: ReadToEarnStatus.notAvailable);

    onProgress?.call(progress, max);
    return _reportUntilDone(
      api,
      _Run(offerId: offerId, country: dashboard.country, startProgress: progress, max: max),
      cancellationToken,
      onProgress,
    );
  }

  Future<ReadToEarnResult> _reportUntilDone(
    RewardsPlatformApi api,
    _Run run,
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onProgress,
  ) async {
    var progress = run.startProgress;
    var reportsSent = 0;
    var reportsWithoutProgress = 0;

    ReadToEarnResult result(ReadToEarnStatus status, {String? failureReason}) => ReadToEarnResult(
          status: status,
          pointsEarned: progress - run.startProgress,
          progress: progress,
          max: run.max,
          reportsSent: reportsSent,
          failureReason: failureReason,
        );
    bool isCancelled() => cancellationToken?.isCancelled ?? false;

    while (reportsSent < maxReports) {
      if (isCancelled()) return result(ReadToEarnStatus.cancelled);
      try {
        await api.reportReadToEarn(offerId: run.offerId, country: run.country);
        reportsSent++;
        await _delay(randomDuration(_random, minDelay, maxDelay));
        if (isCancelled()) return result(ReadToEarnStatus.cancelled);

        final offer = (await api.getDashboard()).promotionOfType(readToEarnPromotionType);
        final newProgress = offer?.progress;
        if (offer == null || newProgress == null) {
          return result(ReadToEarnStatus.failed, failureReason: 'Read to Earn offer unreadable mid-run');
        }
        reportsWithoutProgress = newProgress > progress ? 0 : reportsWithoutProgress + 1;
        progress = newProgress;
        onProgress?.call(progress, run.max);
        if (offer.isComplete || progress >= run.max) return result(ReadToEarnStatus.completed);
        if (reportsWithoutProgress >= maxReportsWithoutProgress) {
          return result(ReadToEarnStatus.stalled);
        }
      } on Exception catch (error) {
        return result(ReadToEarnStatus.failed, failureReason: '$error');
      }
    }
    return result(ReadToEarnStatus.reportLimitReached);
  }
}

/// The fixed facts of one run.
class _Run {
  const _Run({
    required this.offerId,
    required this.country,
    required this.startProgress,
    required this.max,
  });

  final String offerId;
  final String? country;
  final int startProgress;
  final int max;
}
