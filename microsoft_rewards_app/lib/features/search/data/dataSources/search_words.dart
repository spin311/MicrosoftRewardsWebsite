import 'dart:math';

import 'package:word_generator/word_generator.dart';

abstract class SearchWordsDataSource {
  String randomSentence();
}

class SearchWordsDataSourceImpl implements SearchWordsDataSource {
  @override
  String randomSentence() {
    final random = Random();
    final wordGenerator = WordGenerator();
    return wordGenerator.randomSentence(2 + random.nextInt(3));
  }
}