import 'dart:math';

import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/repositories/search_repository.dart';
import '../../../../core/di/SearchCancellationToken.dart';
import '../../../../core/utils/error_handler.dart';
import '../../../../core/utils/helpers/search_helper.dart';
import '../../data/dataSources/search_words.dart';

class SearchRepositoryImpl implements SearchRepository {
  final SearchWordsDataSource dataSource;
  final SearchHelper searchHelper;

  SearchRepositoryImpl({
    required this.dataSource,
    required this.searchHelper,
  });

  @override
  Future<void> performSearches({
    required int count,
    required double delay,
    required SearchCancellationToken cancellationToken,
    required InAppWebViewController controller,
    required void Function(int currentCount, int totalCount) onProgress,
}) async {
    try {
      final random = Random();
      for (int i = 0; i < count; i++) {
        if (cancellationToken.isCancelled) {
          break;
        }
        onProgress(i + 1, count);
        final query = dataSource.randomSentence();
        await SearchHelper.launchSearch(controller: controller, query: query);

        if (i < count - 1) {
          int delayInMilli = (delay * 1000 + random.nextInt(1001)).toInt();
          await Future.delayed(Duration(milliseconds: delayInMilli));
        }
      }
    } catch (e) {
      throw Exception('Search failed: ${ErrorHandler.getErrorMessage(e)}');
    }
  }
}