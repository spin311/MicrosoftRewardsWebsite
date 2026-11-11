import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import '../../domain/entities/app_access_token.dart';
import '../../domain/entities/app_dashboard.dart';
import '../../domain/repositories/rewards_platform_api.dart';
import '../parsers/app_dashboard_parser.dart';
import '../requests/rewards_platform_requests.dart';

/// [RewardsPlatformApi] over HTTP, for one run's [AppAccessToken].
///
/// The [http.Client] is injected and owned by the caller, who closes it.
class HttpRewardsPlatformApi implements RewardsPlatformApi {
  HttpRewardsPlatformApi({
    required http.Client client,
    required AppAccessToken token,
    Random? random,
    this.timeout = const Duration(seconds: 30),
  })  : _client = client,
        _token = token,
        _random = random ?? Random.secure();

  final http.Client _client;
  final AppAccessToken _token;
  final Random _random;
  final Duration timeout;

  @override
  Future<AppDashboard> getDashboard({RewardsChannel channel = RewardsChannel.android}) async {
    final response = await _client
        .get(dashboardUri(channel), headers: dashboardHeaders(_token, channel))
        .timeout(timeout);
    final dashboard = parseAppDashboard(_decode(response));
    if (dashboard == null) {
      throw const RewardsApiException('dashboard in an unrecognised shape');
    }
    return dashboard;
  }

  @override
  Future<ActivityReceipt> reportReadToEarn({required String offerId, required String? country}) {
    final body = readToEarnBody(offerId: offerId, country: country, random: _random);
    return _submitActivity(body, RewardsChannel.android);
  }

  @override
  Future<ActivityReceipt> submitDailyCheckIn({required String? country}) {
    final body = dailyCheckInBody(country: country, random: _random);
    return _submitActivity(body, RewardsChannel.ios);
  }

  Future<ActivityReceipt> _submitActivity(Map<String, Object?> body, RewardsChannel channel) async {
    // Bytes, not a String: a String body makes package:http append
    // "; charset=utf-8" to the Content-Type verified live as application/json.
    final response = await _client
        .post(activitiesUri,
            headers: activityHeaders(_token, channel), body: utf8.encode(jsonEncode(body)))
        .timeout(timeout);
    return parseActivityReceipt(_decode(response));
  }

  /// Decodes a 2xx JSON answer. The body is read as UTF-8 whatever charset the
  /// content type claims, and is never echoed into the exception.
  Object? _decode(http.Response response) {
    final status = response.statusCode;
    if (status < 200 || status >= 300) {
      throw RewardsApiException('request failed', statusCode: status);
    }
    try {
      return jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw RewardsApiException('answer is not JSON', statusCode: status);
    }
  }
}
