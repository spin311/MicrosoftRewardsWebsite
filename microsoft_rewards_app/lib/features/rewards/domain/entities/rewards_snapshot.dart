import 'package:equatable/equatable.dart';

import 'point_counter.dart';

/// How many of today's daily set cards are complete.
class DailySetProgress extends Equatable {
  const DailySetProgress({required this.done, required this.total});

  final int done;
  final int total;

  @override
  List<Object?> get props => [done, total];
}

/// Today's progress as the Rewards dashboard reports it. Every field is
/// nullable: null means "couldn't read it", never zero or finished.
class RewardsSnapshot extends Equatable {
  const RewardsSnapshot({
    this.points,
    this.level,
    this.pcSearch,
    this.edgeBonus,
    this.mobileSearch,
    this.dailySet,
  });

  final int? points;
  final String? level;

  /// PC searches without the Edge bonus, which only completes in Edge.
  final PointCounter? pcSearch;
  final PointCounter? edgeBonus;

  /// Absent on Member-level accounts, which have one shared search counter.
  final PointCounter? mobileSearch;
  final DailySetProgress? dailySet;

  /// The counter the app's phone searches fill. Member-level accounts have no
  /// mobile counter: their phone searches fill the shared pcSearch counter
  /// (verified live, Nov 2026).
  PointCounter? get phoneSearchCounter => mobileSearch ?? pcSearch;

  bool get isPhoneSearchMaxed => isMaxed(phoneSearchCounter);

  @override
  List<Object?> get props => [points, level, pcSearch, edgeBonus, mobileSearch, dailySet];
}
