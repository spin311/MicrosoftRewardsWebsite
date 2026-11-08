import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tzdata;

class NotificationService {
  static final _notifications = FlutterLocalNotificationsPlugin();
  static const int _reminderId = 0;

  /// A reminder doesn't need to fire on the exact minute, and exact modes need
  /// SCHEDULE_EXACT_ALARM, which Android 14+ denies by default: scheduling then
  /// throws `exact_alarms_not_permitted` and no reminder is ever set.
  @visibleForTesting
  static const AndroidScheduleMode reminderScheduleMode =
      AndroidScheduleMode.inexactAllowWhileIdle;

  static Future<void> init() async {
    WidgetsFlutterBinding.ensureInitialized();

    tzdata.initializeTimeZones();
    final String nativeName = await FlutterTimezone.getLocalTimezone();
    tz.setLocalLocation(tz.getLocation(nativeName));

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _notifications.initialize(
      const InitializationSettings(android: androidSettings),
      onDidReceiveNotificationResponse: (_) {},
    );

    await _createNotificationChannel();
  }

  static Future<void> _createNotificationChannel() async {
    const androidChannel = AndroidNotificationChannel(
      'daily_reminder_channel',
      'Daily Reminders',
      description: 'Channel for daily search reminders',
      importance: Importance.max,
    );

    await _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(androidChannel);
  }

  /// Asks for the notification permission (Android 13+). True when granted.
  static Future<bool> _requestNotificationPermission() async {
    if (defaultTargetPlatform != TargetPlatform.android) return true;
    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    return await androidPlugin?.requestNotificationsPermission() ?? false;
  }

  /// Schedules the daily reminder. Returns false, without scheduling, when the
  /// user doesn't allow notifications. Throws if the platform call fails.
  static Future<bool> scheduleDailyReminder({int hour = 19, int minute = 0}) async {
    if (!await _requestNotificationPermission()) return false;
    await cancelReminder();
    await _notifications.zonedSchedule(
      _reminderId,
      'Reminder',
      'Don\'t forget to run your Bing searches today!',
      nextInstanceOfTime(hour, minute, tz.TZDateTime.now(tz.local)),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_reminder_channel',
          'Daily Reminders',
          channelDescription: 'Daily search reminder',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      matchDateTimeComponents: DateTimeComponents.time,
      androidScheduleMode: reminderScheduleMode,
    );
    return true;
  }

  static Future<void> sendImmediateNotification({
    String title = 'Microsoft Automatic Rewards',
    String body = 'Thank you for using our app!',
  }) async {
    await _notifications.show(
      1, // Different ID from reminder
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_reminder_channel',
          'Daily Reminders',
          channelDescription: 'Immediate notifications',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
    );
  }

  /// The next [hour]:[minute] after [now]: today if it's still ahead, else tomorrow.
  @visibleForTesting
  static tz.TZDateTime nextInstanceOfTime(int hour, int minute, tz.TZDateTime now) {
    final scheduled = tz.TZDateTime(now.location, now.year, now.month, now.day, hour, minute);
    return scheduled.isAfter(now) ? scheduled : scheduled.add(const Duration(days: 1));
  }

  static Future<void> cancelReminder() async {
    await _notifications.cancel(_reminderId);
  }
}
