import 'package:equatable/equatable.dart';

import '../entities/app_dashboard.dart';
import '../repositories/rewards_platform_api.dart';
import 'delay.dart';

enum DailyCheckInStatus {
  /// Verified: the promotion completed or the balance rose.
  completed,
  alreadyDone,

  /// No check-in promotion on this account today.
  notAvailable,

  /// Submitted without an error, but the dashboard showed no change.
  unconfirmed,

  /// An error, and the dashboard showed no change; see failureReason.
  failed,
}

class DailyCheckInResult extends Equatable {
  const DailyCheckInResult({required this.status, this.pointsEarned, this.failureReason});

  final DailyCheckInStatus status;

  /// The balance gain seen while verifying, when both balances were readable.
  final int? pointsEarned;
  final String? failureReason;

  @override
  List<Object?> get props => [status, pointsEarned, failureReason];
}

/// Best-effort daily check-in, presenting as the iOS Bing app. NOT verified on
/// a real account: modelled on TheNetsky/Microsoft-Rewards-Script
/// (DailyCheckIn.ts). Only reports success it can see on the dashboard.
class DailyCheckInRunner {
  DailyCheckInRunner({
    Delay delay = realDelay,
    this.verifyAttempts = 3,
    this.verifyInterval = const Duration(seconds: 2),
  }) : _delay = delay;

  final Delay _delay;
  final int verifyAttempts;
  final Duration verifyInterval;

  /// Never throws for API or network errors.
  Future<DailyCheckInResult> run(RewardsPlatformApi api) async {
    final ({int? balance, String? country}) baseline;
    try {
      // The promotion was seen on the Android dashboard; the iOS dashboard is
      // the baseline for the iOS check-in.
      final android = await api.getDashboard();
      final promotion = android.promotionOfType(dailyCheckInPromotionType);
      if (promotion == null) return const DailyCheckInResult(status: DailyCheckInStatus.notAvailable);
      if (promotion.isDone) return const DailyCheckInResult(status: DailyCheckInStatus.alreadyDone);

      final ios = await api.getDashboard(channel: RewardsChannel.ios);
      if (ios.promotionOfType(dailyCheckInPromotionType)?.isDone ?? false) {
        return const DailyCheckInResult(status: DailyCheckInStatus.alreadyDone);
      }
      baseline = (balance: ios.balance ?? android.balance, country: ios.country ?? android.country);
    } on Exception catch (error) {
      return DailyCheckInResult(status: DailyCheckInStatus.failed, failureReason: '$error');
    }

    String? submitError;
    try {
      await api.submitDailyCheckIn(country: baseline.country);
    } on Exception catch (error) {
      // It may still have gone through, so verify before calling it failed.
      submitError = '$error';
    }

    final gained = await _verify(api, baseline.balance);
    if (gained != null) {
      return DailyCheckInResult(status: DailyCheckInStatus.completed, pointsEarned: gained.points);
    }
    return submitError == null
        ? const DailyCheckInResult(status: DailyCheckInStatus.unconfirmed)
        : DailyCheckInResult(status: DailyCheckInStatus.failed, failureReason: submitError);
  }

  /// Re-reads the iOS dashboard until the check-in shows. Returns null when it
  /// never did (or the dashboard couldn't be read).
  Future<_Gain?> _verify(RewardsPlatformApi api, int? balanceBefore) async {
    for (var attempt = 0; attempt < verifyAttempts; attempt++) {
      await _delay(verifyInterval);
      try {
        final after = await api.getDashboard(channel: RewardsChannel.ios);
        final balanceAfter = after.balance;
        final points = balanceBefore != null && balanceAfter != null
            ? balanceAfter - balanceBefore
            : null;
        final isComplete = after.promotionOfType(dailyCheckInPromotionType)?.isDone ?? false;
        if (isComplete || (points != null && points > 0)) return _Gain(points);
      } on Exception {
        // Try again; a dashboard that never answers leaves it unconfirmed.
      }
    }
    return null;
  }
}

class _Gain {
  const _Gain(this.points);

  final int? points;
}
