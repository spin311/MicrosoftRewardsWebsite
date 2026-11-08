// When to ask for a Play Store review and for a sponsorship. Mirrors the
// extension's one-time review card and sponsor milestone (reviewPrompt.ts,
// sponsorPrompt.ts), counted in runs that actually earned points, since the
// app is run by hand rather than on a daily schedule.

import 'package:equatable/equatable.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum SupportPrompt { review, sponsor }

/// Enough that the app has proven itself, early enough that a casual user
/// still sees the ask.
const int reviewAfterHelpfulRuns = 3;

/// The sponsor ask comes only after the app has clearly paid off.
const int sponsorAfterHelpfulRuns = 10;

/// Space the two asks so they never feel like nagging.
const Duration reviewToSponsorGap = Duration(days: 7);

const _helpfulRunsKey = 'support_helpful_runs';
const _reviewPromptedAtKey = 'support_review_prompted_at';
const _sponsorAnsweredKey = 'support_sponsor_answered';

class SupportPromptState extends Equatable {
  const SupportPromptState({
    required this.helpfulRuns,
    this.reviewPromptedAt,
    this.isSponsorAnswered = false,
  });

  /// Search runs or app-point collections that earned points.
  final int helpfulRuns;
  final DateTime? reviewPromptedAt;
  final bool isSponsorAnswered;

  @override
  List<Object?> get props => [helpfulRuns, reviewPromptedAt, isSponsorAnswered];
}

/// The one prompt (if any) to show now. Each is asked once: the review first,
/// then the sponsor ask at least [reviewToSponsorGap] later.
SupportPrompt? pickSupportPrompt(SupportPromptState state, DateTime now) {
  final reviewAt = state.reviewPromptedAt;
  if (reviewAt == null) {
    return state.helpfulRuns >= reviewAfterHelpfulRuns ? SupportPrompt.review : null;
  }
  if (state.isSponsorAnswered || state.helpfulRuns < sponsorAfterHelpfulRuns) return null;
  return now.difference(reviewAt) >= reviewToSponsorGap ? SupportPrompt.sponsor : null;
}

/// Persists the counters behind [pickSupportPrompt].
class SupportPromptStore {
  Future<SupportPromptState> recordHelpfulRun() async {
    final prefs = await SharedPreferences.getInstance();
    final runs = (prefs.getInt(_helpfulRunsKey) ?? 0) + 1;
    await prefs.setInt(_helpfulRunsKey, runs);
    final reviewAtMs = prefs.getInt(_reviewPromptedAtKey);
    return SupportPromptState(
      helpfulRuns: runs,
      reviewPromptedAt: reviewAtMs == null ? null : DateTime.fromMillisecondsSinceEpoch(reviewAtMs),
      isSponsorAnswered: prefs.getBool(_sponsorAnsweredKey) ?? false,
    );
  }

  Future<void> markReviewPrompted(DateTime at) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_reviewPromptedAtKey, at.millisecondsSinceEpoch);
  }

  Future<void> markSponsorAnswered() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_sponsorAnsweredKey, true);
  }
}
