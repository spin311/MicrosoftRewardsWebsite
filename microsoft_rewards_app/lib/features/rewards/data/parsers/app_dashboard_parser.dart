// Parsers for prod.rewardsplatform.microsoft.com answers. Numbers inside
// promotion attributes arrive as strings ("30") and flags as "True"/"False".

import '../../domain/entities/app_dashboard.dart';
import '../../domain/repositories/rewards_platform_api.dart';
import 'json_readers.dart';

/// Parses `GET /dapi/me`. Returns null unless there is a `response` object
/// with a `promotions` list, so a changed API reads as "unknown" rather than
/// as "no promotions today".
AppDashboard? parseAppDashboard(Object? json) {
  final response = asObject(asObject(json)?['response']);
  final promotions = asList(response?['promotions']);
  if (response == null || promotions == null) return null;

  final profileAttributes = asObject(asObject(response['profile'])?['attributes']);
  return AppDashboard(
    balance: asInt(response['balance']),
    country: asNonEmptyString(profileAttributes?['country']),
    promotions: List.unmodifiable(promotions.map(_parsePromotion).whereType<AppPromotion>()),
  );
}

AppPromotion? _parsePromotion(Object? raw) {
  final promotion = asObject(raw);
  final attributes = asObject(promotion?['attributes']);
  if (promotion == null || attributes == null) return null;

  return AppPromotion(
    name: asNonEmptyString(promotion['name']) ?? '',
    type: asNonEmptyString(attributes['type']),
    offerId: asNonEmptyString(attributes['offerid']),
    title: asNonEmptyString(attributes['title']),
    progress: asInt(attributes['pointprogress']),
    max: asInt(attributes['pointmax']),
    isComplete: isTrue(attributes['complete']),
    isHidden: isTrue(attributes['hidden']),
  );
}

/// Parses the answer to `POST /dapi/me/activities`: `{"response": {"balance": N}}`.
ActivityReceipt parseActivityReceipt(Object? json) {
  final response = asObject(asObject(json)?['response']);
  return ActivityReceipt(balance: asInt(response?['balance']));
}
