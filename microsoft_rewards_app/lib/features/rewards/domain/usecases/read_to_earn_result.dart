import 'package:equatable/equatable.dart';

enum ReadToEarnStatus {
  /// The offer reached its max during this run.
  completed,

  /// The offer was already complete before the run.
  alreadyDone,

  /// No Read to Earn offer on this account today.
  notAvailable,

  /// Reports stopped adding progress (2 in a row added nothing).
  stalled,

  /// Hit the report cap before the offer completed.
  reportLimitReached,

  cancelled,

  /// The API errored or answered in a shape we can't read; see failureReason.
  failed,
}

/// The outcome of a Read to Earn run. [progress] and [max] are the last values
/// the dashboard reported (null when the offer couldn't be read).
class ReadToEarnResult extends Equatable {
  const ReadToEarnResult({
    required this.status,
    this.pointsEarned = 0,
    this.progress,
    this.max,
    this.reportsSent = 0,
    this.failureReason,
  });

  final ReadToEarnStatus status;

  /// Offer progress gained during this run, as the dashboard reported it.
  final int pointsEarned;
  final int? progress;
  final int? max;
  final int reportsSent;
  final String? failureReason;

  @override
  List<Object?> get props => [status, pointsEarned, progress, max, reportsSent, failureReason];
}
