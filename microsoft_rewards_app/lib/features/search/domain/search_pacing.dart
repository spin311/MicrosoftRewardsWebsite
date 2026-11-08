// Time between searches: the same defaults, warning threshold and jitter as
// the extension (wxt/entrypoints/utils/search.ts and settings.ts), so both
// clients pace searches the way Microsoft most reliably credits them.

import 'dart:math';

/// The default gap. Gaps of 45–120s were all credited in the 2026-11 credit
/// experiment, and a varied ~60s pace looks least like a bot.
const int defaultDelaySeconds = 60;

/// Below this the app warns, rather than overriding the user's choice:
/// Microsoft often stops crediting searches that come faster.
const int recommendedMinDelaySeconds = 30;

/// Absolute floor, so searches never fire back to back.
const int _minDelaySeconds = 1;

const double _minJitterFraction = 0.2;
const double _maxJitterFraction = 0.5;

/// The pre-1.3.0 default, moved to [defaultDelaySeconds] once on upgrade.
const String _oldDefaultDelay = '20';

bool isDelayRisky(double? seconds) => seconds != null && seconds < recommendedMinDelaySeconds;

/// ±20% of the gap at the short end, ±50% once the gap is wide enough, and in
/// between only as wide as keeps the low end at the recommended minimum. So 5s
/// gives 4–6s, 30s gives 24–36s, 45s gives 30–60s and 60s gives 30–90s.
int jitterSpreadMs(int baseMs) {
  final headroom = baseMs - recommendedMinDelaySeconds * 1000;
  final atLeast = max(baseMs * _minJitterFraction, headroom.toDouble());
  return min(baseMs * _maxJitterFraction, atLeast).round();
}

/// The wait before the next search for a configured gap of [seconds].
Duration nextDelay(double seconds, Random random) {
  final baseMs = (max(seconds, _minDelaySeconds.toDouble()) * 1000).round();
  final spread = jitterSpreadMs(baseMs);
  final jitter = random.nextInt(2 * spread + 1) - spread;
  return Duration(milliseconds: max(baseMs + jitter, _minDelaySeconds * 1000));
}

/// The delay to show at launch. Before 1.3.0 the default was 20s, and the
/// field saved it on first launch, so a stored "20" is almost always the old
/// default rather than a choice: it moves to the new default once.
String migrateOldDefaultDelay({required String? stored, required bool isMigrated}) {
  if (stored == null) return '$defaultDelaySeconds';
  if (!isMigrated && stored == _oldDefaultDelay) return '$defaultDelaySeconds';
  return stored;
}
