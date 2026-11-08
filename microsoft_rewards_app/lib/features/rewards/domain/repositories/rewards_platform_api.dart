import 'package:equatable/equatable.dart';

import '../entities/app_access_token.dart';
import '../entities/app_dashboard.dart';

/// Which Bing app the requests present themselves as. Each has its own
/// dashboard channel and request headers.
enum RewardsChannel { android, ios }

/// What the platform answered to an activity report.
class ActivityReceipt extends Equatable {
  const ActivityReceipt({this.balance});

  /// The account balance after the report, when the answer included it.
  final int? balance;

  @override
  List<Object?> get props => [balance];
}

/// The platform answered with an error or a shape we don't recognise.
class RewardsApiException implements Exception {
  const RewardsApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => statusCode == null
      ? 'RewardsApiException: $message'
      : 'RewardsApiException(HTTP $statusCode): $message';
}

/// The Rewards platform API the Bing mobile app uses
/// (prod.rewardsplatform.microsoft.com), authorised by one [AppAccessToken].
///
/// Methods throw [RewardsApiException] for an error answer, and the HTTP
/// client's exceptions when the request doesn't go through.
abstract interface class RewardsPlatformApi {
  Future<AppDashboard> getDashboard({RewardsChannel channel = RewardsChannel.android});

  /// Reports one article read for the Read to Earn offer [offerId].
  /// A null or blank [country] falls back to "us".
  Future<ActivityReceipt> reportReadToEarn({required String offerId, required String? country});

  /// Submits the daily check-in, presenting as the iOS app.
  Future<ActivityReceipt> submitDailyCheckIn({required String? country});
}

/// Builds an API for one run's token, so the token never outlives the run.
typedef RewardsPlatformApiFactory = RewardsPlatformApi Function(AppAccessToken token);
