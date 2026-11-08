import 'dart:math';

/// Waits for [duration]. Injected so tests don't sleep.
typedef Delay = Future<void> Function(Duration duration);

/// Reports progress on an offer, e.g. Read to Earn at 9 of 30.
typedef ProgressCallback = void Function(int progress, int max);

Future<void> realDelay(Duration duration) => Future<void>.delayed(duration);

/// A random duration from [min] to [max], inclusive, to the millisecond.
Duration randomDuration(Random random, Duration min, Duration max) {
  final spread = max.inMilliseconds - min.inMilliseconds;
  if (spread <= 0) return min;
  return min + Duration(milliseconds: random.nextInt(spread + 1));
}
