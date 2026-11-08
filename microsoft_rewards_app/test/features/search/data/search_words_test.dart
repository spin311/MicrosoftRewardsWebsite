import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/search/data/dataSources/search_query_builder.dart';
import 'package:microsoft_automatic_rewards/features/search/data/dataSources/search_terms.dart';
import 'package:microsoft_automatic_rewards/features/search/data/dataSources/search_words.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _queryShape = RegExp(r'^[a-z0-9]+( [a-z0-9]+)+$');

Future<List<String>> _storedHistory() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getStringList('used_queries') ?? <String>[];
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('buildSearchQuery', () {
    test('produces lowercase ASCII queries of two or more words', () {
      // Arrange
      final random = Random(1);

      // Act
      final queries = List.generate(500, (_) => buildSearchQuery(random));

      // Assert
      for (final query in queries) {
        expect(query, matches(_queryShape));
      }
    });

    test('is deterministic for a seeded Random', () {
      // Arrange & Act
      final first = List.generate(20, (_) => buildSearchQuery(Random(7)));
      final second = List.generate(20, (_) => buildSearchQuery(Random(7)));

      // Assert
      expect(first, second);
    });

    test('only uses words from the term pools', () {
      // Arrange
      final random = Random(3);

      // Act
      final query = buildSearchQuery(random);

      // Assert
      final hasTopic = searchTopics.any(query.contains);
      expect(hasTopic, isTrue);
    });

    test('keeps every pool entry lowercase ASCII', () {
      // Arrange
      final entries = [...searchLeadIns, ...searchTopics, ...searchTails];

      // Act & Assert
      for (final entry in entries) {
        expect(entry, matches(RegExp(r'^[a-z0-9]+( [a-z0-9]+)*$')));
      }
    });
  });

  group('SearchWordsDataSourceImpl.nextQuery', () {
    test('returns well-shaped queries', () async {
      // Arrange
      final dataSource = SearchWordsDataSourceImpl(random: Random(1));

      // Act
      final query = await dataSource.nextQuery();

      // Assert
      expect(query, matches(_queryShape));
    });

    test('never repeats a query across 300 calls', () async {
      // Arrange
      final dataSource = SearchWordsDataSourceImpl(random: Random(2));

      // Act
      final queries = <String>[];
      for (var i = 0; i < 300; i++) {
        queries.add(await dataSource.nextQuery());
      }

      // Assert
      expect(queries.toSet().length, 300);
    });

    test('records each returned query in the stored history', () async {
      // Arrange
      final dataSource = SearchWordsDataSourceImpl(random: Random(4));

      // Act
      final first = await dataSource.nextQuery();
      final second = await dataSource.nextQuery();

      // Assert
      expect(await _storedHistory(), [first, second]);
    });

    test('does not repeat queries across new instances', () async {
      // Arrange: same seed would replay the same sequence without history.
      final firstRun = SearchWordsDataSourceImpl(random: Random(5));
      final seen = <String>[];
      for (var i = 0; i < 50; i++) {
        seen.add(await firstRun.nextQuery());
      }
      final secondRun = SearchWordsDataSourceImpl(random: Random(5));

      // Act
      final later = <String>[];
      for (var i = 0; i < 50; i++) {
        later.add(await secondRun.nextQuery());
      }

      // Assert
      expect(later.toSet().intersection(seen.toSet()), isEmpty);
    });

    test('avoids queries already present in stored history', () async {
      // Arrange
      final expected = buildSearchQuery(Random(6));
      SharedPreferences.setMockInitialValues({
        'used_queries': [expected],
      });
      final dataSource = SearchWordsDataSourceImpl(random: Random(6));

      // Act
      final query = await dataSource.nextQuery();

      // Assert
      expect(query, isNot(expected));
    });

    test('caps the history at the newest 2000 entries', () async {
      // Arrange
      final seeded = List.generate(2000, (i) => 'seed query $i');
      SharedPreferences.setMockInitialValues({'used_queries': seeded});
      final dataSource = SearchWordsDataSourceImpl(random: Random(8));

      // Act
      final query = await dataSource.nextQuery();

      // Assert
      final history = await _storedHistory();
      expect(history.length, 2000);
      expect(history.first, 'seed query 1');
      expect(history.last, query);
    });

    test('returns the last attempt after 100 straight collisions', () async {
      // Arrange
      var attempts = 0;
      final dataSource = SearchWordsDataSourceImpl(
        random: Random(9),
        queryBuilder: (_) {
          attempts++;
          return 'only query';
        },
      );
      await dataSource.nextQuery();
      attempts = 0;

      // Act
      final query = await dataSource.nextQuery();

      // Assert
      expect(query, 'only query');
      expect(attempts, 100);
      expect(await _storedHistory(), ['only query']);
    });
  });
}
