import 'package:bloc/bloc.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import '../../../../core/di/SearchCancellationToken.dart';
import '../../../../core/utils/error_handler.dart';
import '../../../rewards/presentation/rewards_messages.dart';
import '../../../rewards/rewards.dart';
import '../../domain/useCases/perform_search.dart';
import 'package:equatable/equatable.dart';

/// Rewards credits a search within ~5s; wait that long before the final read
/// so the last search shows up in the summary.
const _defaultFinalCheckDelay = Duration(seconds: 5);

class SearchBloc extends Bloc<SearchEvent, SearchState> {
  SearchCancellationToken _cancelToken = SearchCancellationToken();
  final PerformSearch performSearch;
  final RewardsStatusSource statusSource;
  final Duration finalCheckDelay;

  SearchBloc({
    required this.performSearch,
    required this.statusSource,
    this.finalCheckDelay = _defaultFinalCheckDelay,
  }) : super(SearchInitial()) {
    on<StartSearchEvent>(_onStartSearch);
    on<CancelSearchEvent>(_onCancelSearch);
  }

  Future<void> _onStartSearch(
      StartSearchEvent event,
      Emitter<SearchState> emit,
      ) async {
    emit(const SearchInProgress());
    final cancelToken = SearchCancellationToken();
    _cancelToken = cancelToken;
    try {
      // The status only ever stops a run when it confirms the counter is full;
      // an unknown or signed-out status never blocks searching.
      final before = await statusSource.fetchStatus();
      if (cancelToken.isCancelled) return;
      if (_isMaxed(before)) {
        emit(SearchSkipped(describeAlreadyComplete(before)));
        return;
      }

      RewardsStatus? latest;
      final searchesDone = await performSearch(
        count: event.count,
        delay: event.delay,
        cancellationToken: cancelToken,
        controller: event.controller,
        onProgress: (currentCount, totalCount) {
          if (cancelToken.isCancelled) return;
          emit(SearchInProgress(currentCount: currentCount, totalCount: event.count));
        },
        shouldStop: () async {
          latest = await statusSource.fetchStatus();
          return _isMaxed(latest!);
        },
      );
      if (cancelToken.isCancelled) return;

      final stoppedMaxed = latest != null && _isMaxed(latest!);
      final after = stoppedMaxed ? latest! : await _finalStatus();
      if (cancelToken.isCancelled) return;
      emit(SearchSuccess(describeSearchRun(
        before: before,
        after: after,
        searchesDone: searchesDone,
        stoppedMaxed: stoppedMaxed,
      )));
    } catch (e) {
      if (cancelToken.isCancelled) return;
      emit(SearchFailure(ErrorHandler.getErrorMessage(e)));
    }
  }

  Future<RewardsStatus> _finalStatus() async {
    await Future.delayed(finalCheckDelay);
    return statusSource.fetchStatus();
  }

  static bool _isMaxed(RewardsStatus status) =>
      status is RewardsStatusLoaded && status.snapshot.isPhoneSearchMaxed;

  void _onCancelSearch(
      CancelSearchEvent event,
      Emitter<SearchState> emit,
      ) {
    _cancelToken.cancel();
    emit(SearchCancelled());
  }
}

abstract class SearchEvent with EquatableMixin {
  const SearchEvent();

  @override
  List<Object> get props => [];
}

class StartSearchEvent extends SearchEvent {
  final int count;
  final double delay;
  final InAppWebViewController controller;

  const StartSearchEvent({required this.count, required this.delay, required this.controller});

  @override
  List<Object> get props => [count, delay, controller];
}

class CancelSearchEvent extends SearchEvent {}

abstract class SearchState with EquatableMixin {
  const SearchState();

  @override
  List<Object> get props => [];
}

class SearchInitial extends SearchState {}

class SearchInProgress extends SearchState {
  final bool isCancelled;
  final int currentCount;
  final int totalCount;
  const SearchInProgress({this.isCancelled = false, this.currentCount = 0, this.totalCount = 0});

  @override
  List<Object> get props => [isCancelled, currentCount, totalCount];
}

class SearchCancelled extends SearchState {}

class SearchSuccess extends SearchState {
  final String message;

  const SearchSuccess(this.message);

  @override
  List<Object> get props => [message];
}

/// The run didn't start because today's search counter is already full.
class SearchSkipped extends SearchState {
  final String message;

  const SearchSkipped(this.message);

  @override
  List<Object> get props => [message];
}

class SearchFailure extends SearchState {
  final String message;

  const SearchFailure(this.message);

  @override
  List<Object> get props => [message];
}
