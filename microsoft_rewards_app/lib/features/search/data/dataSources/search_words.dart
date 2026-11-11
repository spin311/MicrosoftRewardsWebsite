import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import 'search_query_builder.dart';

const String usedQueriesKey = 'used_queries';
const int maxUsedQueries = 2000;
const int maxQueryAttempts = 100;

abstract class SearchWordsDataSource {
  /// Returns a query that is not in the persisted history and records it.
  Future<String> nextQuery();
}

class SearchWordsDataSourceImpl implements SearchWordsDataSource {
  final Random _random;
  final String Function(Random random) _queryBuilder;

  SearchWordsDataSourceImpl({
    Random? random,
    String Function(Random random) queryBuilder = buildSearchQuery,
  })  : _random = random ?? Random(),
        _queryBuilder = queryBuilder;

  @override
  Future<String> nextQuery() async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList(usedQueriesKey) ?? const <String>[];
    final query = _pickUnusedQuery(history.toSet());
    await prefs.setStringList(usedQueriesKey, _appendCapped(history, query));
    return query;
  }

  // Pool exhausted: the last attempt is returned rather than looping forever.
  String _pickUnusedQuery(Set<String> used) {
    var query = _queryBuilder(_random);
    for (var attempt = 1; attempt < maxQueryAttempts && used.contains(query);
        attempt++) {
      query = _queryBuilder(_random);
    }
    return query;
  }

  List<String> _appendCapped(List<String> history, String query) {
    final updated = [...history.where((q) => q != query), query];
    final overflow = updated.length - maxUsedQueries;
    return overflow > 0 ? updated.sublist(overflow) : updated;
  }
}
