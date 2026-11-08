// Request shapes for prod.rewardsplatform.microsoft.com, as the Bing mobile
// apps send them. Android values verified live on 2026-11-08; the iOS check-in
// values come from TheNetsky/Microsoft-Rewards-Script (DailyCheckIn.ts) and are
// not verified on this account.

import 'dart:math';

import '../../domain/entities/app_access_token.dart';
import '../../domain/repositories/rewards_platform_api.dart';
import 'random_ids.dart';

const _platformHost = 'prod.rewardsplatform.microsoft.com';
const _fallbackCountry = 'us';

/// Read to Earn reports need a 128-hex-char id.
const readToEarnIdLength = 128;

final Uri activitiesUri = Uri.https(_platformHost, '/dapi/me/activities');

const _androidHeaders = {
  'X-Rewards-AppId': 'SAAndroid/34.5.450113001',
  'X-Rewards-PartnerId': 'BingHomepage',
};

const _iosHeaders = {
  'User-Agent': 'Mozilla/5.0 (iPad; CPU iPad OS 26_5 like Mac OS X) AppleWebKit/605.1.15 '
      '(KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/605.1.15 BingSapphire/33.4.440603001',
  'X-Rewards-AppId': 'SAIOS/33.4.440603001',
  'X-Rewards-PartnerId': 'startapp',
  'X-Rewards-Flights': 'rwgobig',
};

String channelName(RewardsChannel channel) => switch (channel) {
      RewardsChannel.android => 'SAAndroid',
      RewardsChannel.ios => 'SAIOS',
    };

Uri dashboardUri(RewardsChannel channel) => Uri.https(
      _platformHost,
      '/dapi/me',
      {'channel': channelName(channel), 'options': '613'},
    );

/// Headers every platform request carries for [channel].
Map<String, String> platformHeaders(AppAccessToken token, RewardsChannel channel) => {
      'Authorization': 'Bearer ${token.value}',
      'Accept': '*/*',
      'X-Rewards-IsMobile': 'true',
      ...switch (channel) {
        RewardsChannel.android => _androidHeaders,
        RewardsChannel.ios => _iosHeaders,
      },
    };

Map<String, String> dashboardHeaders(AppAccessToken token, RewardsChannel channel) =>
    {...platformHeaders(token, channel), 'Cache-Control': 'no-cache'};

Map<String, String> activityHeaders(AppAccessToken token, RewardsChannel channel) =>
    {...platformHeaders(token, channel), 'Content-Type': 'application/json'};

String countryOrDefault(String? country) {
  final trimmed = country?.trim() ?? '';
  return trimmed.isEmpty ? _fallbackCountry : trimmed;
}

/// One Read to Earn report: worth 3 points on the offer seen live.
Map<String, Object?> readToEarnBody({
  required String offerId,
  required String? country,
  required Random random,
}) {
  return {
    'id': randomHex(random, readToEarnIdLength),
    'amount': 1,
    'type': 101,
    'attributes': {'offerid': offerId},
    'country': countryOrDefault(country),
  };
}

/// The iOS app's daily check-in.
Map<String, Object?> dailyCheckInBody({required String? country, required Random random}) {
  return {
    'risk_context': <String, Object?>{},
    'type': 103,
    'channel': channelName(RewardsChannel.ios),
    'attributes': <String, Object?>{},
    'id': uuidV4(random),
    'amount': 1,
    'country': countryOrDefault(country),
  };
}
