import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/core/di/SearchCancellationToken.dart';
import 'package:microsoft_automatic_rewards/core/utils/helpers/search_helper.dart';
import 'package:microsoft_automatic_rewards/features/search/data/dataSources/search_words.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/repositories/search_repository_impl.dart';

class _Queries implements SearchWordsDataSource {
  int calls = 0;
  @override
  Future<String> nextQuery() async => 'query ${calls++}';
}

class _Controller extends Fake implements InAppWebViewController {
  final loaded = <String>[];
  @override
  Future<void> loadUrl({
    required URLRequest urlRequest,
    @Deprecated('Use allowingReadAccessTo instead') Uri? iosAllowingReadAccessTo,
    WebUri? allowingReadAccessTo,
  }) async =>
      loaded.add(urlRequest.url.toString());
}

SearchRepositoryImpl _repo({Duration creditLag = Duration.zero}) => SearchRepositoryImpl(
      dataSource: _Queries(),
      searchHelper: SearchHelper(),
      creditLag: creditLag,
      maxJitterMs: 0,
    );

void main() {
  group('SearchRepositoryImpl.performSearches', () {
    test('stops once shouldStop reports the counter is full', () async {
      // Arrange
      final controller = _Controller();
      var checks = 0;

      // Act
      final done = await _repo().performSearches(
        count: 10,
        delay: 0,
        cancellationToken: SearchCancellationToken(),
        controller: controller,
        onProgress: (_, __) {},
        shouldStop: () async => ++checks == 2,
      );

      // Assert: checked after search 1 (no) and search 2 (yes).
      expect(done, 2);
      expect(controller.loaded, hasLength(2));
    });

    test('never asks after the last search', () async {
      var checks = 0;

      final done = await _repo().performSearches(
        count: 3,
        delay: 0,
        cancellationToken: SearchCancellationToken(),
        controller: _Controller(),
        onProgress: (_, __) {},
        shouldStop: () async {
          checks++;
          return false;
        },
      );

      expect(done, 3);
      expect(checks, 2);
    });

    test('runs the status check alongside the delay, not after it', () async {
      // Arrange: a 300ms delay and a check that takes 250ms. In sequence that
      // is 550ms per gap; overlapped it stays near 300ms.
      final stopwatch = Stopwatch()..start();

      // Act
      await _repo().performSearches(
        count: 3,
        delay: 0.3,
        cancellationToken: SearchCancellationToken(),
        controller: _Controller(),
        onProgress: (_, __) {},
        shouldStop: () async {
          await Future<void>.delayed(const Duration(milliseconds: 250));
          return false;
        },
      );

      // Assert: two gaps.
      expect(stopwatch.elapsedMilliseconds, lessThan(900));
    });

    test('stops when cancelled during the gap', () async {
      final token = SearchCancellationToken();

      final done = await _repo().performSearches(
        count: 5,
        delay: 0,
        cancellationToken: token,
        controller: _Controller(),
        onProgress: (_, __) {},
        shouldStop: () async {
          token.cancel();
          return false;
        },
      );

      expect(done, 1);
    });
  });
}
