import 'package:equatable/equatable.dart';

import 'rewards_snapshot.dart';

/// Why today's dashboard couldn't be read.
enum RewardsStatusError {
  /// No Microsoft session in the app's cookie store: the user must sign in.
  signedOut,

  /// The request failed or timed out; worth retrying later.
  network,

  /// The dashboard answered in a shape we don't know (the API changed).
  unrecognized,
}

/// The result of reading today's Rewards dashboard.
sealed class RewardsStatus extends Equatable {
  const RewardsStatus({required this.fetchedAt});

  final DateTime fetchedAt;
}

final class RewardsStatusLoaded extends RewardsStatus {
  const RewardsStatusLoaded({required this.snapshot, required super.fetchedAt});

  final RewardsSnapshot snapshot;

  @override
  List<Object?> get props => [snapshot, fetchedAt];
}

final class RewardsStatusFailed extends RewardsStatus {
  const RewardsStatusFailed({required this.error, required super.fetchedAt});

  final RewardsStatusError error;

  bool get isSignedOut => error == RewardsStatusError.signedOut;

  @override
  List<Object?> get props => [error, fetchedAt];
}
