import 'package:equatable/equatable.dart';

/// Progress on one Rewards counter, e.g. today's search points.
class PointCounter extends Equatable {
  const PointCounter({required this.progress, required this.max});

  final int progress;
  final int max;

  /// Whether every point on this counter has been earned. A zero max is a
  /// counter that isn't running today, not a finished one.
  bool get isMaxed => max > 0 && progress >= max;

  @override
  List<Object?> get props => [progress, max];
}

/// Null-safe [PointCounter.isMaxed]: an unknown counter is never maxed, so a
/// counter we couldn't read never ends a run early.
bool isMaxed(PointCounter? counter) => counter?.isMaxed ?? false;
