import 'package:flutter/widgets.dart';
import 'package:in_app_review/in_app_review.dart';

import '../../core/utils/error_handler.dart';
import 'sponsor_dialog.dart';
import 'support_prompts.dart';

/// Records a run that earned points and, when due, shows the review or the
/// sponsor ask. Each answer is saved before the prompt opens, so a prompt the
/// user leaves (or the app is killed during) never comes back.
class SupportPromptPresenter {
  SupportPromptPresenter({
    SupportPromptStore? store,
    InAppReview? review,
    DateTime Function()? clock,
  })  : _store = store ?? SupportPromptStore(),
        _review = review ?? InAppReview.instance,
        _clock = clock ?? DateTime.now;

  final SupportPromptStore _store;
  final InAppReview _review;
  final DateTime Function() _clock;

  Future<void> onHelpfulRun(BuildContext context) async {
    final state = await _store.recordHelpfulRun();
    final now = _clock();
    switch (pickSupportPrompt(state, now)) {
      case SupportPrompt.review:
        await _store.markReviewPrompted(now);
        await _requestReview();
      case SupportPrompt.sponsor:
        if (!context.mounted) return;
        await _store.markSponsorAnswered();
        if (context.mounted) await showSponsorDialog(context);
      case null:
        return;
    }
  }

  /// Google's own review card, shown unmodified with no question first (Play
  /// guidelines). Google may decide not to show it (quota); that's fine.
  Future<void> _requestReview() async {
    try {
      if (await _review.isAvailable()) await _review.requestReview();
    } catch (e) {
      ErrorHandler.logError('review prompt', e);
    }
  }
}
