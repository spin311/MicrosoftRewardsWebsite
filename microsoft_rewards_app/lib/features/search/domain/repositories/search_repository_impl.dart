import 'dart:math';

import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/repositories/search_repository.dart';
import '../../../../core/di/SearchCancellationToken.dart';
import '../../../../core/utils/error_handler.dart';
import '../../../../core/utils/helpers/search_helper.dart';
import '../../data/dataSources/search_words.dart';
import '../search_pacing.dart';

/// Rewards shows a credited search within ~5s, so the counter is checked that
/// long after a search, while the delay before the next one keeps running.
const _defaultCreditLag = Duration(seconds: 5);

/// How long past the delay a still-running counter check may hold the next
/// search. Beyond that the run moves on, and a late "full" still stops the
/// following search.
const _defaultCheckGrace = Duration(seconds: 5);

/// The delay is waited in slices this long so Cancel takes effect quickly.
const _cancelPollInterval = Duration(milliseconds: 250);

class SearchRepositoryImpl implements SearchRepository {
  final SearchWordsDataSource dataSource;
  final SearchHelper searchHelper;
  final Duration creditLag;
  final Duration checkGrace;

  /// The wait before the next search for a configured gap in seconds: the
  /// extension's jittered pacing, so gaps never repeat exactly.
  final Duration Function(double seconds) _delayFor;

  SearchRepositoryImpl({
    required this.dataSource,
    required this.searchHelper,
    this.creditLag = _defaultCreditLag,
    this.checkGrace = _defaultCheckGrace,
    Duration Function(double seconds)? delayFor,
    Random? random,
  }) : _delayFor = delayFor ?? _jitteredDelay(random ?? Random());

  static Duration Function(double) _jitteredDelay(Random random) =>
      (seconds) => nextDelay(seconds, random);

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
      final check = _CounterCheck(shouldStop, creditLag, cancellationToken);
      var done = 0;
      for (int i = 0; i < count; i++) {
        if (cancellationToken.isCancelled || check.isFull) break;
        onProgress(i + 1, count);
        final query = await dataSource.nextQuery();
        await SearchHelper.launchSearch(controller: controller, query: query);
        done++;

        if (i == count - 1) break;
        check.startIfIdle();
        await _pause(delay, cancellationToken);
        await check.settle(checkGrace);
      }
      return done;
    } catch (e) {
      throw Exception('Search failed: ${ErrorHandler.getErrorMessage(e)}');
    }
  }

  Future<void> _pause(double delay, SearchCancellationToken token) async {
    final end = DateTime.now().add(_delayFor(delay));
    while (!token.isCancelled) {
      final left = end.difference(DateTime.now());
      if (left <= Duration.zero) return;
      await Future<void>.delayed(left < _cancelPollInterval ? left : _cancelPollInterval);
    }
  }
}

/// At most one counter check in flight. A check that's still running when the
/// delay ends never stretches the gap past the grace period, and a slow or
/// hanging status read never piles up WebViews.
class _CounterCheck {
  _CounterCheck(this._shouldStop, this._creditLag, this._token);

  final Future<bool> Function()? _shouldStop;
  final Duration _creditLag;
  final SearchCancellationToken _token;
  Future<void>? _pending;
  bool isFull = false;

  void startIfIdle() {
    final shouldStop = _shouldStop;
    if (shouldStop == null || _pending != null) return;
    _pending = Future<void>.delayed(_creditLag).then((_) async {
      if (_token.isCancelled) return;
      try {
        if (await shouldStop()) isFull = true;
      } catch (e) {
        // A failed check means "unknown", which never stops a run.
        ErrorHandler.logError('counter check', e);
      }
    }).whenComplete(() => _pending = null);
  }

  Future<void> settle(Duration grace) async {
    final pending = _pending;
    if (pending == null || _token.isCancelled) return;
    await Future.any([pending, Future<void>.delayed(grace)]);
  }
}
