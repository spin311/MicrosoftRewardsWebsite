import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/point_counter.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/rewards_snapshot.dart';

void main() {
  group('isMaxed', () {
    test('is true once progress reaches the max', () {
      expect(isMaxed(const PointCounter(progress: 90, max: 90)), isTrue);
      expect(isMaxed(const PointCounter(progress: 91, max: 90)), isTrue);
    });

    test('is false while points are left, or with nothing known', () {
      expect(isMaxed(const PointCounter(progress: 87, max: 90)), isFalse);
      expect(isMaxed(null), isFalse);
    });

    // A zero max is a counter that isn't running today, not a finished one.
    test('is false for a counter with a zero max', () {
      expect(isMaxed(const PointCounter(progress: 0, max: 0)), isFalse);
    });
  });

  group('RewardsSnapshot.phoneSearchCounter', () {
    // A full PC counter must not stop phone searches whose own counter is
    // merely unreadable.
    test('is unknown when the mobile counter exists but was unreadable', () {
      const snapshot = RewardsSnapshot(
        pcSearch: PointCounter(progress: 90, max: 90),
        isMobileSearchUnreadable: true,
      );

      expect(snapshot.phoneSearchCounter, isNull);
      expect(snapshot.isPhoneSearchMaxed, isFalse);
    });

    test('prefers the mobile counter when the account has one', () {
      // Arrange
      const snapshot = RewardsSnapshot(
        pcSearch: PointCounter(progress: 90, max: 90),
        mobileSearch: PointCounter(progress: 15, max: 60),
      );

      // Act & Assert
      expect(snapshot.phoneSearchCounter, const PointCounter(progress: 15, max: 60));
      expect(snapshot.isPhoneSearchMaxed, isFalse);
    });

    test('falls back to the shared PC counter on Member-level accounts', () {
      const snapshot = RewardsSnapshot(pcSearch: PointCounter(progress: 15, max: 15));

      expect(snapshot.phoneSearchCounter, const PointCounter(progress: 15, max: 15));
      expect(snapshot.isPhoneSearchMaxed, isTrue);
    });

    test('is unknown, and not maxed, when neither counter could be read', () {
      const snapshot = RewardsSnapshot(points: 10);

      expect(snapshot.phoneSearchCounter, isNull);
      expect(snapshot.isPhoneSearchMaxed, isFalse);
    });
  });
}
