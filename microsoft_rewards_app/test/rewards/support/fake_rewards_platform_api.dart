import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_dashboard.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/repositories/rewards_platform_api.dart';

/// A scripted Rewards platform: each read report adds [pointsPerRead] to the
/// Read to Earn offer, and the check-in completes when [checkInWorks].
class FakeRewardsPlatformApi implements RewardsPlatformApi {
  FakeRewardsPlatformApi({
    this.readOffer,
    this.checkIn,
    this.balance = 1000,
    this.country = 'si',
    this.pointsPerRead = 3,
    this.checkInWorks = true,
    this.checkInPoints = 5,
    this.checkInMarksComplete = true,
  });

  AppPromotion? readOffer;
  AppPromotion? checkIn;
  int balance;
  String? country;
  int pointsPerRead;
  bool checkInWorks;
  int checkInPoints;
  bool checkInMarksComplete;

  /// When set, the report with this 1-based number throws instead.
  int? failOnReport;
  Exception? checkInError;

  final dashboardReads = <RewardsChannel>[];
  final readReports = <({String offerId, String? country})>[];
  final checkInCountries = <String?>[];

  @override
  Future<AppDashboard> getDashboard({RewardsChannel channel = RewardsChannel.android}) async {
    dashboardReads.add(channel);
    return AppDashboard(
      balance: balance,
      country: country,
      promotions: [
        if (readOffer != null) readOffer!,
        if (checkIn != null) checkIn!,
      ],
    );
  }

  @override
  Future<ActivityReceipt> reportReadToEarn({required String offerId, required String? country}) async {
    readReports.add((offerId: offerId, country: country));
    if (readReports.length == failOnReport) {
      throw const RewardsApiException('server said no', statusCode: 500);
    }
    final offer = readOffer!;
    final progress = offer.progress! + pointsPerRead;
    final capped = progress > offer.max! ? offer.max! : progress;
    balance += capped - offer.progress!;
    readOffer = readToEarnOffer(progress: capped, max: offer.max!, offerId: offer.offerId);
    return ActivityReceipt(balance: balance);
  }

  @override
  Future<ActivityReceipt> submitDailyCheckIn({required String? country}) async {
    checkInCountries.add(country);
    if (checkInError != null) throw checkInError!;
    if (checkInWorks) {
      balance += checkInPoints;
      if (checkInMarksComplete) checkIn = checkInOffer(isComplete: true);
    }
    return ActivityReceipt(balance: balance);
  }
}

AppPromotion readToEarnOffer({
  int? progress = 0,
  int? max = 30,
  bool isComplete = false,
  String? offerId = 'ENUS_readarticle3_30points',
}) {
  return AppPromotion(
    name: 'ENUS_readarticle3_30points',
    type: 'msnreadearn',
    offerId: offerId,
    progress: progress,
    max: max,
    isComplete: isComplete,
  );
}

AppPromotion checkInOffer({bool isComplete = false}) {
  return AppPromotion(
    name: 'Gamification_Sapphire_DailyCheckIn',
    type: 'checkin',
    offerId: 'Gamification_Sapphire_DailyCheckIn',
    isComplete: isComplete,
    isHidden: true,
  );
}
