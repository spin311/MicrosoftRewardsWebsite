import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/core/di/SearchCancellationToken.dart';
import 'package:microsoft_automatic_rewards/features/rewards/presentation/rewards_cubit.dart';
import 'package:microsoft_automatic_rewards/features/rewards/rewards.dart';

final _now = DateTime(2026, 11, 8, 13);
final _status = RewardsStatusLoaded(
  snapshot: const RewardsSnapshot(points: 263, pcSearch: PointCounter(progress: 6, max: 15)),
  fetchedAt: _now,
);

class _FixedStatusSource implements RewardsStatusSource {
  int calls = 0;
  @override
  Future<RewardsStatus> fetchStatus() async {
    calls++;
    return _status;
  }
}

class _FakeAppPoints implements AppPointsEarner {
  _FakeAppPoints(this._report, {this.error});
  final AppPointsReport _report;
  final Object? error;

  @override
  Future<AppPointsReport> earn({
    SearchCancellationToken? cancellationToken,
    ProgressCallback? onReadToEarnProgress,
    bool includeDailyCheckIn = true,
  }) async {
    if (error != null) throw error!;
    onReadToEarnProgress?.call(3, 30);
    onReadToEarnProgress?.call(30, 30);
    return _report;
  }
}

const _completed = AppPointsReport(
  auth: AppPointsAuth.granted,
  readToEarn: ReadToEarnResult(
      status: ReadToEarnStatus.completed, pointsEarned: 27, progress: 30, max: 30, reportsSent: 9),
);

void main() {
  group('RewardsCubit', () {
    blocTest<RewardsCubit, RewardsState>(
      'refresh loads the status',
      build: () => RewardsCubit(statusSource: _FixedStatusSource(), appPoints: _FakeAppPoints(_completed)),
      act: (cubit) => cubit.refresh(),
      expect: () => [
        const RewardsState(isRefreshing: true),
        RewardsState(status: _status),
      ],
    );

    blocTest<RewardsCubit, RewardsState>(
      'collecting app points reports progress, the result, then refreshes',
      build: () => RewardsCubit(statusSource: _FixedStatusSource(), appPoints: _FakeAppPoints(_completed)),
      act: (cubit) => cubit.collectAppPoints(),
      expect: () => [
        const RewardsState(isCollecting: true),
        const RewardsState(isCollecting: true, readProgress: 3, readMax: 30),
        const RewardsState(isCollecting: true, readProgress: 30, readMax: 30),
        const RewardsState(readProgress: 30, readMax: 30, appPointsMessage: 'Read to Earn: +27 points (30/30).'),
        const RewardsState(
            isRefreshing: true, readProgress: 30, readMax: 30, appPointsMessage: 'Read to Earn: +27 points (30/30).'),
        RewardsState(
            status: _status, readProgress: 30, readMax: 30, appPointsMessage: 'Read to Earn: +27 points (30/30).'),
      ],
    );

    blocTest<RewardsCubit, RewardsState>(
      'an unexpected error ends the run with a message instead of crashing',
      build: () => RewardsCubit(
        statusSource: _FixedStatusSource(),
        appPoints: _FakeAppPoints(_completed, error: StateError('boom')),
      ),
      act: (cubit) => cubit.collectAppPoints(),
      skip: 1,
      expect: () => [
        const RewardsState(appPointsMessage: "Couldn't collect app points. Try again later."),
        const RewardsState(isRefreshing: true, appPointsMessage: "Couldn't collect app points. Try again later."),
        RewardsState(status: _status, appPointsMessage: "Couldn't collect app points. Try again later."),
      ],
    );
  });
}
