import 'dart:math';

import 'search_terms.dart';

const int _queryShapeCount = 8;

T _pick<T>(List<T> pool, Random random) => pool[random.nextInt(pool.length)];

/// Builds a natural-looking query: `<lead-in> <topic>`, `<topic> <tail>` or
/// `<lead-in> <topic> <tail>`. The three-part shape is weighted 6:1:1 because
/// it holds nearly all of the combinations (same weighting as the extension).
String buildSearchQuery(Random random) {
  final topic = _pick(searchTopics, random);
  switch (random.nextInt(_queryShapeCount)) {
    case 0:
      return '${_pick(searchLeadIns, random)} $topic';
    case 1:
      return '$topic ${_pick(searchTails, random)}';
    default:
      return '${_pick(searchLeadIns, random)} $topic ${_pick(searchTails, random)}';
  }
}
