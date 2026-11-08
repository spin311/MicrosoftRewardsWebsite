// Port of the extension's wxt/entrypoints/utils/rewardsStatus.ts parser for
// rewards.bing.com/api/getuserinfo?type=1.

import '../../domain/entities/point_counter.dart';
import '../../domain/entities/rewards_snapshot.dart';
import 'json_readers.dart';

/// "Edge" as a word, so a title like "Knowledge search" isn't the bonus.
final _edgeWord = RegExp(r'\bedge\b', caseSensitive: false);

/// The API keys the daily set by the local date as MM/DD/YYYY.
String dailySetKey(DateTime date) {
  final mm = date.month.toString().padLeft(2, '0');
  final dd = date.day.toString().padLeft(2, '0');
  return '$mm/$dd/${date.year}';
}

/// Parses the getuserinfo JSON. Returns null for any shape it doesn't
/// recognise, so a changed API reads as "unknown": never as zeros, which would
/// look like nothing was earned, or as maxed counters, which would end runs.
RewardsSnapshot? parseUserInfo(Object? json, DateTime today) {
  final dashboard = asObject(asObject(json)?['dashboard']);
  final userStatus = asObject(dashboard?['userStatus']);
  if (dashboard == null || userStatus == null) return null;

  final counters = asObject(userStatus['counters']);
  final levelInfo = asObject(userStatus['levelInfo']);
  final levelName = levelInfo?['activeLevelName'] ?? levelInfo?['activeLevel'];

  return RewardsSnapshot(
    points: asInt(userStatus['availablePoints']),
    level: levelName is String && levelName.isNotEmpty ? levelName : null,
    pcSearch: _sumCounters(counters?['pcSearch'], (entry) => !_isEdgeBonus(entry)),
    edgeBonus: _sumCounters(counters?['pcSearch'], _isEdgeBonus),
    mobileSearch: _sumCounters(counters?['mobileSearch'], (_) => true),
    dailySet: _parseDailySet(dashboard['dailySetPromotions'], today),
  );
}

/// Sums a counter group (e.g. `pcSearch`), keeping only the entries [keep]
/// picks. One unreadable entry makes the whole group unknown: summing the rest
/// could read as maxed while the missing entry still had points to earn.
PointCounter? _sumCounters(Object? value, bool Function(JsonMap entry) keep) {
  final entries = asList(value);
  if (entries == null) return null;

  var found = false;
  var progress = 0;
  var max = 0;
  for (final raw in entries) {
    final entry = asObject(raw);
    if (entry == null || !keep(entry)) continue;
    final entryProgress = asInt(entry['pointProgress']);
    final entryMax = asInt(entry['pointProgressMax']);
    if (entryProgress == null || entryMax == null) return null;
    found = true;
    progress += entryProgress;
    max += entryMax;
  }
  return found ? PointCounter(progress: progress, max: max) : null;
}

bool _isEdgeBonus(JsonMap entry) =>
    _edgeWord.hasMatch('${entry['title'] ?? ''} ${entry['name'] ?? ''}');

DailySetProgress? _parseDailySet(Object? promotions, DateTime today) {
  final cards = asList(asObject(promotions)?[dailySetKey(today)]);
  if (cards == null || cards.isEmpty) return null;
  final done = cards.where((card) => isTrue(asObject(card)?['complete'])).length;
  return DailySetProgress(done: done, total: cards.length);
}
