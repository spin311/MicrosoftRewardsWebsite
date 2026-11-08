import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:microsoft_automatic_rewards/core/di/search_cancellation_token.dart';

abstract class SearchRepository {
  /// Runs up to [count] searches and returns how many ran. [shouldStop] is
  /// asked after every search but the last, while the delay runs; returning
  /// true ends the run early, e.g. when the Rewards counter is full.
  Future<int> performSearches({
    required int count,
    required double delay,
    required SearchCancellationToken cancellationToken,
    required InAppWebViewController controller,
    required void Function(int currentCount, int totalCount) onProgress,
    Future<bool> Function()? shouldStop,
  });
}