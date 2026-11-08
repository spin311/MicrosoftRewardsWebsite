import '../entities/rewards_status.dart';

/// Reads today's Rewards dashboard (points, search counters, daily set).
abstract interface class RewardsStatusSource {
  /// Never throws for expected outcomes: signed out, offline and an unknown
  /// response shape all come back as [RewardsStatusFailed].
  Future<RewardsStatus> fetchStatus();
}
