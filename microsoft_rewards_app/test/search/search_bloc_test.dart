import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/core/di/search_cancellation_token.dart';
import 'package:microsoft_automatic_rewards/features/rewards/rewards.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/repositories/search_repository.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/useCases/perform_search.dart';
import 'package:microsoft_automatic_rewards/features/search/presentation/bloc/search_bloc.dart';

final _now = DateTime(2026, 11, 8, 13);

RewardsStatus _counter(int progress, {int max = 15}) => RewardsStatusLoaded(
      snapshot: RewardsSnapshot(points: 263, pcSearch: PointCounter(progress: progress, max: max)),
      fetchedAt: _now,
    );

/// Hands out the queued statuses in order, repeating the last one.
class _QueuedStatusSource implements RewardsStatusSource {
  _QueuedStatusSource(this._queue);
  final List<RewardsStatus> _queue;
  int calls = 0;

  @override
  Future<RewardsStatus> fetchStatus() async {
    final status = _queue[calls < _queue.length ? calls : _queue.length - 1];
    calls++;
    return status;
  }
}

/// Runs the loop like the real repository, without a WebView or delays.
class _FakeRepository implements SearchRepository {
  int searches = 0;
  void Function()? onSearch;

  @override
  Future<int> performSearches({
    required int count,
    required double delay,
    required SearchCancellationToken cancellationToken,
    required InAppWebViewController controller,
    required void Function(int currentCount, int totalCount) onProgress,
    Future<bool> Function()? shouldStop,
  }) async {
    var done = 0;
    for (var i = 0; i < count; i++) {
      if (cancellationToken.isCancelled) break;
      if (i > 0 && shouldStop != null && await shouldStop()) break;
      if (cancellationToken.isCancelled) break;
      onProgress(i + 1, count);
      searches++;
      done++;
      onSearch?.call();
    }
    return done;
  }
}

class _FakeController extends Fake implements InAppWebViewController {}

class _ThrowingStatusSource implements RewardsStatusSource {
  @override
  Future<RewardsStatus> fetchStatus() async => throw StateError('dispose failed');
}

SearchBloc _bloc(_FakeRepository repo, RewardsStatusSource status) => SearchBloc(
      performSearch: PerformSearch(repo),
      statusSource: status,
      finalCheckDelay: Duration.zero,
    );

StartSearchEvent _start(int count) =>
    StartSearchEvent(count: count, delay: 0, controller: _FakeController());

void main() {
  group('SearchBloc', () {
    late _FakeRepository repo;
    setUp(() => repo = _FakeRepository());

    blocTest<SearchBloc, SearchState>(
      'skips the run when today\'s counter is already maxed',
      build: () => _bloc(repo, _QueuedStatusSource([_counter(15)])),
      act: (bloc) => bloc.add(_start(5)),
      expect: () => [
        const SearchInProgress(),
        const SearchSkipped("Today's searches are already complete (Searches 15/15)."),
      ],
      verify: (_) => expect(repo.searches, 0),
    );

    blocTest<SearchBloc, SearchState>(
      'stops as soon as the counter maxes and reports the points',
      // before the run, before search 2, before search 3 (maxed)
      build: () => _bloc(repo, _QueuedStatusSource([_counter(6), _counter(9), _counter(15)])),
      act: (bloc) => bloc.add(_start(10)),
      skip: 1,
      expect: () => [
        const SearchInProgress(currentCount: 1, totalCount: 10),
        const SearchInProgress(currentCount: 2, totalCount: 10),
        const SearchSuccess(
            "Stopped after 2 searches: today's searches are complete (+9 points, Searches 15/15).",
            pointsEarned: 9),
      ],
      verify: (_) => expect(repo.searches, 2),
    );

    blocTest<SearchBloc, SearchState>(
      'still searches when the status is unknown',
      build: () => _bloc(repo, _QueuedStatusSource([
        RewardsStatusFailed(error: RewardsStatusError.network, fetchedAt: _now),
      ])),
      act: (bloc) => bloc.add(_start(3)),
      wait: const Duration(milliseconds: 50),
      skip: 4,
      expect: () => [const SearchSuccess('3 searches done.')],
      verify: (_) => expect(repo.searches, 3),
    );

    blocTest<SearchBloc, SearchState>(
      'still searches when Rewards reports signed out, and says so',
      build: () => _bloc(repo, _QueuedStatusSource([
        RewardsStatusFailed(error: RewardsStatusError.signedOut, fetchedAt: _now),
      ])),
      act: (bloc) => bloc.add(_start(2)),
      wait: const Duration(milliseconds: 50),
      skip: 3,
      expect: () => [
        const SearchSuccess(
            "2 searches done, but you're not signed in to Microsoft Rewards, so they may not count."),
      ],
      verify: (_) => expect(repo.searches, 2),
    );

    blocTest<SearchBloc, SearchState>(
      'still searches when reading the status throws',
      build: () => _bloc(repo, _ThrowingStatusSource()),
      act: (bloc) => bloc.add(_start(2)),
      wait: const Duration(milliseconds: 50),
      skip: 3,
      expect: () => [const SearchSuccess('2 searches done.')],
      verify: (_) => expect(repo.searches, 2),
    );

    blocTest<SearchBloc, SearchState>(
      'does not report success after the user cancels',
      build: () {
        late SearchBloc bloc;
        repo.onSearch = () {
          if (repo.searches == 1) bloc.add(CancelSearchEvent());
        };
        bloc = _bloc(repo, _QueuedStatusSource([_counter(0)]));
        return bloc;
      },
      act: (bloc) => bloc.add(_start(5)),
      wait: const Duration(milliseconds: 50),
      verify: (bloc) {
        expect(bloc.state, isA<SearchCancelled>());
      },
    );
  });
}
