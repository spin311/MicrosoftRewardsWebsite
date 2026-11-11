import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/notifications/notification_service.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

void main() {
  setUpAll(tzdata.initializeTimeZones);

  group('reminderScheduleMode', () {
    test('does not need the exact-alarm permission', () {
      // Android 14+ denies SCHEDULE_EXACT_ALARM by default, so any exact mode
      // throws exact_alarms_not_permitted and the reminder is never set.
      expect(NotificationService.reminderScheduleMode,
          AndroidScheduleMode.inexactAllowWhileIdle);
    });
  });

  group('nextInstanceOfTime', () {
    // Looked up lazily: group bodies run before setUpAll loads the database.
    tz.Location ljubljana() => tz.getLocation('Europe/Ljubljana');

    test('returns today when the time is still ahead', () {
      final now = tz.TZDateTime(ljubljana(), 2026, 11, 8, 12, 30);

      final next = NotificationService.nextInstanceOfTime(19, 0, now);

      expect(next, tz.TZDateTime(ljubljana(), 2026, 11, 8, 19, 0));
    });

    test('returns tomorrow when the time has already passed', () {
      final now = tz.TZDateTime(ljubljana(), 2026, 11, 8, 20, 15);

      final next = NotificationService.nextInstanceOfTime(19, 0, now);

      expect(next, tz.TZDateTime(ljubljana(), 2026, 11, 9, 19, 0));
    });

    test('returns tomorrow when the time is exactly now', () {
      final now = tz.TZDateTime(ljubljana(), 2026, 11, 8, 19, 0);

      final next = NotificationService.nextInstanceOfTime(19, 0, now);

      expect(next, tz.TZDateTime(ljubljana(), 2026, 11, 9, 19, 0));
    });
  });
}
