import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/SearchCancellationToken.dart';
import '../../../core/utils/error_handler.dart';
import '../rewards.dart';
import 'rewards_messages.dart';

class RewardsState extends Equatable {
  const RewardsState({
    this.status,
    this.isRefreshing = false,
    this.isCollecting = false,
    this.readProgress,
    this.readMax,
    this.appPointsMessage,
  });

  /// The last Rewards status read; null until the first one arrives.
  final RewardsStatus? status;
  final bool isRefreshing;

  /// Whether app points (Read to Earn, check-in) are being collected.
  final bool isCollecting;
  final int? readProgress;
  final int? readMax;

  /// The outcome of the last app-points run, shown under the status.
  final String? appPointsMessage;

  @override
  List<Object?> get props =>
      [status, isRefreshing, isCollecting, readProgress, readMax, appPointsMessage];
}

/// Today's Rewards status and the app-points run behind the search screen's
/// status card.
class RewardsCubit extends Cubit<RewardsState> {
  RewardsCubit({required RewardsStatusSource statusSource, required AppPointsEarner appPoints})
      : _statusSource = statusSource,
        _appPoints = appPoints,
        super(const RewardsState());

  final RewardsStatusSource _statusSource;
  final AppPointsEarner _appPoints;
  SearchCancellationToken? _appPointsToken;

  Future<void> refresh() async {
    if (state.isRefreshing) return;
    _emit(isRefreshing: true);
    final status = await _statusSource.fetchStatus();
    _emit(status: status, isRefreshing: false);
  }

  Future<void> collectAppPoints() async {
    if (state.isCollecting) return;
    final token = SearchCancellationToken();
    _appPointsToken = token;
    emit(RewardsState(status: state.status, isRefreshing: state.isRefreshing, isCollecting: true));
    final message = await _earn(token);
    _emit(isCollecting: false, appPointsMessage: message);
    if (!isClosed) await refresh();
  }

  void cancelAppPoints() => _appPointsToken?.cancel();

  Future<String> _earn(SearchCancellationToken token) async {
    try {
      final report = await _appPoints.earn(
        cancellationToken: token,
        onReadToEarnProgress: (progress, max) => _emit(readProgress: progress, readMax: max),
      );
      return describeAppPoints(report);
    } catch (e) {
      ErrorHandler.logError('app points', e);
      return "Couldn't collect app points. Try again later.";
    }
  }

  /// Emits a copy of the state with the given fields replaced, unless closed.
  void _emit({
    RewardsStatus? status,
    bool? isRefreshing,
    bool? isCollecting,
    int? readProgress,
    int? readMax,
    String? appPointsMessage,
  }) {
    if (isClosed) return;
    emit(RewardsState(
      status: status ?? state.status,
      isRefreshing: isRefreshing ?? state.isRefreshing,
      isCollecting: isCollecting ?? state.isCollecting,
      readProgress: readProgress ?? state.readProgress,
      readMax: readMax ?? state.readMax,
      appPointsMessage: appPointsMessage ?? state.appPointsMessage,
    ));
  }

  @override
  Future<void> close() {
    _appPointsToken?.cancel();
    return super.close();
  }
}
