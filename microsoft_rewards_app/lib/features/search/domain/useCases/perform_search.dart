import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../../../../core/di/SearchCancellationToken.dart';
import '../repositories/search_repository.dart';

class PerformSearch {
  final SearchRepository repository;

  PerformSearch(this.repository);

  Future<void> call({
    required int count,
    required double delay,
    required SearchCancellationToken cancellationToken,
    required InAppWebViewController controller,
    required void Function(int currentCount, int totalCount) onProgress,
  }) async {
    if (count < 1) throw ArgumentError('Count must be positive');
    if (delay < 0) throw ArgumentError('Delay must be non-negative');

    return repository.performSearches(
        count: count,
        delay: delay,
        cancellationToken: cancellationToken,
        controller: controller,
        onProgress: onProgress,
    );
  }
}