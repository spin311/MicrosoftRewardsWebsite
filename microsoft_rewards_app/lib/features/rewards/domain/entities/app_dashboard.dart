import 'package:equatable/equatable.dart';

/// Promotion type of the Bing app's Read to Earn offer.
const readToEarnPromotionType = 'msnreadearn';

/// Promotion type of the Bing app's daily check-in.
const dailyCheckInPromotionType = 'checkin';

/// One promotion on the Bing app's Rewards dashboard (`dapi/me`).
/// Unreadable numbers are null, never zero.
class AppPromotion extends Equatable {
  const AppPromotion({
    required this.name,
    this.type,
    this.offerId,
    this.title,
    this.progress,
    this.max,
    this.isComplete = false,
    this.isHidden = false,
  });

  final String name;
  final String? type;
  final String? offerId;
  final String? title;
  final int? progress;
  final int? max;
  final bool isComplete;
  final bool isHidden;

  /// Marked complete, or every point earned. A zero max isn't running, not done.
  bool get isDone {
    if (isComplete) return true;
    final progress = this.progress;
    final max = this.max;
    return progress != null && max != null && max > 0 && progress >= max;
  }

  @override
  List<Object?> get props => [name, type, offerId, title, progress, max, isComplete, isHidden];
}

/// The Bing app's view of the Rewards account.
class AppDashboard extends Equatable {
  const AppDashboard({this.balance, this.country, this.promotions = const []});

  final int? balance;

  /// The profile country (e.g. "si"), sent back with activity reports.
  final String? country;
  final List<AppPromotion> promotions;

  /// The first promotion of [type], matched case-insensitively.
  AppPromotion? promotionOfType(String type) {
    final wanted = type.toLowerCase();
    for (final promotion in promotions) {
      if (promotion.type?.toLowerCase() == wanted) return promotion;
    }
    return null;
  }

  @override
  List<Object?> get props => [balance, country, promotions];
}
