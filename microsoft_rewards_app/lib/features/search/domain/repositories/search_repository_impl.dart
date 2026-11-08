import 'dart:math';

import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/repositories/search_repository.dart';
import '../../../../core/di/SearchCancellationToken.dart';
import '../../../../core/utils/error_handler.dart';
import '../../../../core/utils/helpers/search_helper.dart';
import '../../data/dataSources/search_words.dart';

/// Rewards shows a credited search within ~5s, so the counter is checked that
/// long after a search, while the delay before the next one keeps running.
const _defaultCreditLag = Duration(seconds: 5);

/// Up to this much random time is added to every delay.
const _defaultMaxJitterMs = 1000;

class SearchRepositoryImpl implements SearchRepository {
  final SearchWordsDataSource dataSource;
  final SearchHelper searchHelper;
  final Duration creditLag;
  final int maxJitterMs;
  final Random _random;

  SearchRepositoryImpl({
    required this.dataSource,
    required this.searchHelper,
    this.creditLag = _defaultCreditLag,
    this.maxJitterMs = _defaultMaxJitterMs,
    Random? random,
  }) : _random = random ?? Random();

  @override
  Future<int> performSearches({
    required int count,
    required double delay,
    required SearchCancellationToken cancellationToken,
    required InAppWebViewController controller,
    required void Function(int currentCount, int totalCount) onProgress,
    Future<bool> Function()? shouldStop,
  }) async {
    try {
      var done = 0;
      for (int i = 0; i < count; i++) {
        if (cancellationToken.isCancelled) break;
        onProgress(i + 1, count);
        final query = await dataSource.nextQuery();
        await SearchHelper.launchSearch(controller: controller, query: query);
        done++;

        if (i == count - 1) break;
        final isFull = await _waitForNextSearch(delay, shouldStop);
        if (isFull) break;
      }
      return done;
    } catch (e) {
      throw Exception('Search failed: ${ErrorHandler.getErrorMessage(e)}');
    }
  }

  /// Waits out the delay and, at the same time, asks [shouldStop] once the
  /// last search has had time to be credited. True means stop searching.
  Future<bool> _waitForNextSearch(double delay, Future<bool> Function()? shouldStop) async {
    final jitterMs = maxJitterMs > 0 ? _random.nextInt(maxJitterMs + 1) : 0;
    final pause = Future<void>.delayed(Duration(milliseconds: (delay * 1000).toInt() + jitterMs));
    if (shouldStop == null) {
      await pause;
      return false;
    }
    final check = Future<void>.delayed(creditLag).then((_) => shouldStop());
    final results = await Future.wait([pause.then((_) => false), check]);
    return results[1];
  }
}
