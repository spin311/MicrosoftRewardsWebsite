import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest_all.dart' as tzdata;


class NotificationService {
  static final _notifications = FlutterLocalNotificationsPlugin();
  static const int _reminderId = 0;

  static Future<void> init() async {
    WidgetsFlutterBinding.ensureInitialized();

    // 1) Load all the TZ database.
    tzdata.initializeTimeZones();

    // 2) Figure out the device’s current zone name
    final String nativeName = await FlutterTimezone.getLocalTimezone();

    // 3) Tell the timezone package to treat that as “local”
    final tz.Location deviceLocation = tz.getLocation(nativeName);
    print('Device timezone: $nativeName');
    tz.setLocalLocation(deviceLocation);

    // 4) Continue initializing your notifications plugin…
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

  static Future<void> _requestNotificationPermissions() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      await androidPlugin?.requestNotificationsPermission();
    }
  }

  static Future<void> scheduleDailyReminder({int hour = 19, int minute = 0}) async {
    await _requestNotificationPermissions();
    await cancelReminder();
    await _notifications.zonedSchedule(
      _reminderId,
      'Reminder',
      'Don\'t forget to run your Bing searches today!',
      _nextInstanceOfTime(hour, minute),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'daily_reminder_channel',
          'Daily Reminders',
          channelDescription: 'Daily search reminder at 7 PM',
          importance: Importance.max,
          priority: Priority.high,
        ),
      ),
      matchDateTimeComponents: DateTimeComponents.time,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
    );
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
  static tz.TZDateTime _nextInstanceOfTime(int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    print('Current time: ${now}');
    final scheduled = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    print('Scheduled time: ${scheduled}');
    return scheduled.isBefore(now) ? scheduled.add(const Duration(days: 1)) : scheduled;
  }

  static Future<void> cancelReminder() async {
    await _notifications.cancel(_reminderId);
  }
}