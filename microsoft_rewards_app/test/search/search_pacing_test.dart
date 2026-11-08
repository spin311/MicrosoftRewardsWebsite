import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/search/domain/search_pacing.dart';

/// Always returns the same value, so a test can pin the jitter to an extreme.
class _FixedRandom implements Random {
  _FixedRandom(this.pick);
  final int Function(int max) pick;
  @override
  int nextInt(int max) => pick(max);
  @override
  double nextDouble() => 0;
  @override
  bool nextBool() => false;
}

Duration _lowest(double seconds) => nextDelay(seconds, _FixedRandom((_) => 0));
Duration _highest(double seconds) => nextDelay(seconds, _FixedRandom((max) => max - 1));

void main() {
  group('defaults', () {
    test('match the extension: 60s default, warn under 30s', () {
      expect(defaultDelaySeconds, 60);
      expect(recommendedMinDelaySeconds, 30);
    });
  });

  group('isDelayRisky', () {
    test('warns below the recommended minimum', () {
      expect(isDelayRisky(29.9), isTrue);
      expect(isDelayRisky(5), isTrue);
    });

    test('does not warn at or above it, or for unreadable input', () {
      expect(isDelayRisky(30), isFalse);
      expect(isDelayRisky(60), isFalse);
      expect(isDelayRisky(null), isFalse);
    });
  });

  group('jitterSpreadMs (same curve as the extension)', () {
    test('is ±20% for short gaps', () {
      expect(jitterSpreadMs(5000), 1000);
      expect(jitterSpreadMs(30000), 6000);
    });

    test('keeps the low end at the recommended minimum in between', () {
      expect(jitterSpreadMs(45000), 15000);
    });

    test('caps at ±50% for long gaps', () {
      expect(jitterSpreadMs(60000), 30000);
      expect(jitterSpreadMs(120000), 60000);
    });
  });

  group('nextDelay', () {
    test('spreads 60s over 30-90s', () {
      expect(_lowest(60), const Duration(seconds: 30));
      expect(_highest(60), const Duration(seconds: 90));
    });

    test('keeps a deliberately short gap tight', () {
      expect(_lowest(5), const Duration(seconds: 4));
      expect(_highest(5), const Duration(seconds: 6));
    });

    test('never goes below the 1s floor', () {
      expect(_lowest(0), greaterThanOrEqualTo(const Duration(seconds: 1)));
      expect(_lowest(0.5), greaterThanOrEqualTo(const Duration(seconds: 1)));
    });

    test('stays within the spread for random draws', () {
      final random = Random(7);
      for (var i = 0; i < 200; i++) {
        final delay = nextDelay(60, random);
        expect(delay.inMilliseconds, inInclusiveRange(30000, 90000));
      }
    });
  });

  group('migrateOldDefaultDelay', () {
    test('moves the old 20s default to 60s once', () {
      expect(migrateOldDefaultDelay(stored: '20', isMigrated: false), '60');
    });

    test('keeps any other stored value, and never migrates twice', () {
      expect(migrateOldDefaultDelay(stored: '15', isMigrated: false), '15');
      expect(migrateOldDefaultDelay(stored: '20', isMigrated: true), '20');
    });

    test('uses the new default when nothing is stored', () {
      expect(migrateOldDefaultDelay(stored: null, isMigrated: false), '60');
    });
  });
}
