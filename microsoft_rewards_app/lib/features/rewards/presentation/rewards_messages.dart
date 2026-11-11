// User-facing text for Rewards status, search runs and app points. Pure
// functions so the wording is tested and the widgets stay thin.

import '../rewards.dart';

const _checking = 'Checking Microsoft Rewards…';
const _signedOut = 'Not signed in to Microsoft Rewards';
const _unavailable = "Couldn't load your Rewards status";

/// The one-line status shown at the top of the search screen.
String describeStatus(RewardsStatus? status) {
  return switch (status) {
    null => _checking,
    RewardsStatusFailed(isSignedOut: true) => _signedOut,
    RewardsStatusFailed() => _unavailable,
    RewardsStatusLoaded(:final snapshot) => _describeSnapshot(snapshot),
  };
}

String _describeSnapshot(RewardsSnapshot snapshot) {
  final points = snapshot.points == null ? null : '${snapshot.points} points';
  final counter = _counterText(snapshot);
  return [points, counter].whereType<String>().join(' · ');
}

/// "Searches 6/15", or "Mobile searches 20/60" when the account has its own
/// mobile counter. Member accounts have one shared Search counter.
String? _counterText(RewardsSnapshot snapshot) {
  final counter = snapshot.phoneSearchCounter;
  if (counter == null) return null;
  final label = snapshot.mobileSearch != null ? 'Mobile searches' : 'Searches';
  return '$label ${counter.progress}/${counter.max}';
}

String _counterOf(RewardsStatus status) => switch (status) {
      RewardsStatusLoaded(:final snapshot) => _counterText(snapshot) ?? 'Searches',
      RewardsStatusFailed() => 'Searches',
    };

/// Shown instead of running when the counter is already full.
String describeAlreadyComplete(RewardsStatus status) =>
    "Today's searches are already complete (${_counterOf(status)}).";

/// The message after a search run, from the statuses read before and after.
String describeSearchRun({
  required RewardsStatus before,
  required RewardsStatus after,
  required int searchesDone,
  required bool stoppedMaxed,
}) {
  final done = '$searchesDone ${searchesDone == 1 ? 'search' : 'searches'} done';
  if (after is RewardsStatusFailed && after.isSignedOut) {
    return "$done, but you're not signed in to Microsoft Rewards, so they may not count.";
  }
  final earned = pointsEarnedBetween(before, after);
  if (earned == null) return '$done.';

  final counter = _counterOf(after);
  if (stoppedMaxed) {
    return "Stopped after $searchesDone ${searchesDone == 1 ? 'search' : 'searches'}: "
        "today's searches are complete (+$earned points, $counter).";
  }
  if (earned == 0) return '$done, but Microsoft credited none of them ($counter).';
  return '$done: +$earned points ($counter).';
}

/// Points the phone-search counter gained between two readings, or null when
/// either reading is unknown.
int? pointsEarnedBetween(RewardsStatus before, RewardsStatus after) {
  if (before is! RewardsStatusLoaded || after is! RewardsStatusLoaded) return null;
  final start = before.snapshot.phoneSearchCounter;
  final end = after.snapshot.phoneSearchCounter;
  if (start == null || end == null) return null;
  return end.progress - start.progress;
}

/// Points an app-points run earned: Read to Earn plus the check-in.
int appPointsEarned(AppPointsReport report) =>
    (report.readToEarn?.pointsEarned ?? 0) + (report.dailyCheckIn?.pointsEarned ?? 0);

/// The message after collecting app-only points.
String describeAppPoints(AppPointsReport report) {
  switch (report.auth) {
    case AppPointsAuth.signedOut:
      return 'Sign in again to collect app points.';
    case AppPointsAuth.failed:
      final reason = report.authFailureReason;
      return "Couldn't reach the Bing app service${reason == null ? '' : ' ($reason)'}.";
    case AppPointsAuth.granted:
      return [_describeReadToEarn(report.readToEarn), _describeCheckIn(report.dailyCheckIn)]
          .whereType<String>()
          .join(' ');
  }
}

String? _describeReadToEarn(ReadToEarnResult? result) {
  if (result == null) return null;
  final of = result.progress != null && result.max != null ? '${result.progress}/${result.max}' : null;
  final earned = '+${result.pointsEarned} points';
  final detail = [earned, of].whereType<String>().join(', ');
  return switch (result.status) {
    ReadToEarnStatus.completed => 'Read to Earn: $earned${of == null ? '' : ' ($of)'}.',
    ReadToEarnStatus.alreadyDone => 'Read to Earn is already done today${of == null ? '' : ' ($of)'}.',
    ReadToEarnStatus.notAvailable => "Read to Earn isn't offered on this account today.",
    ReadToEarnStatus.stalled =>
      'Read to Earn stopped: Microsoft stopped crediting reads ($detail). Try again later.',
    ReadToEarnStatus.reportLimitReached =>
      'Read to Earn paused after ${result.reportsSent} reads ($detail). Run it again to continue.',
    ReadToEarnStatus.cancelled => 'Read to Earn cancelled ($detail).',
    ReadToEarnStatus.failed => "Read to Earn failed${result.pointsEarned > 0 ? ' ($detail)' : ''}. Try again later.",
  };
}

String? _describeCheckIn(DailyCheckInResult? result) {
  if (result == null) return null;
  return switch (result.status) {
    DailyCheckInStatus.completed =>
      'Daily check-in: ${result.pointsEarned == null ? 'done' : '+${result.pointsEarned} points'}.',
    DailyCheckInStatus.alreadyDone => 'Daily check-in is already done.',
    DailyCheckInStatus.notAvailable => null,
    DailyCheckInStatus.unconfirmed => "Daily check-in sent, but Microsoft didn't confirm it.",
    DailyCheckInStatus.failed => 'Daily check-in failed.',
  };
}
