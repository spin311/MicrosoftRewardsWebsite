import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/support/support_prompts.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _now = DateTime(2026, 11, 8, 13);

SupportPromptState _state({int runs = 0, DateTime? reviewAt, bool sponsorAnswered = false}) =>
    SupportPromptState(helpfulRuns: runs, reviewPromptedAt: reviewAt, isSponsorAnswered: sponsorAnswered);

void main() {
  group('pickSupportPrompt', () {
    test('asks for nothing before the app has helped a few times', () {
      expect(pickSupportPrompt(_state(runs: 2), _now), isNull);
    });

    test('asks for a review after 3 helpful runs', () {
      expect(pickSupportPrompt(_state(runs: 3), _now), SupportPrompt.review);
    });

    test('asks for the review only once', () {
      final state = _state(runs: 4, reviewAt: _now);

      expect(pickSupportPrompt(state, _now), isNull);
    });

    test('asks to sponsor after 10 helpful runs, a week after the review ask', () {
      final state = _state(runs: 10, reviewAt: _now.subtract(const Duration(days: 7)));

      expect(pickSupportPrompt(state, _now), SupportPrompt.sponsor);
    });

    test('waits a week after the review ask before the sponsor ask', () {
      final state = _state(runs: 12, reviewAt: _now.subtract(const Duration(days: 6)));

      expect(pickSupportPrompt(state, _now), isNull);
    });

    test('asks to sponsor only once', () {
      final state = _state(
          runs: 20, reviewAt: _now.subtract(const Duration(days: 30)), sponsorAnswered: true);

      expect(pickSupportPrompt(state, _now), isNull);
    });
  });

  group('SupportPromptStore', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('counts helpful runs across instances', () async {
      await SupportPromptStore().recordHelpfulRun();
      await SupportPromptStore().recordHelpfulRun();

      final state = await SupportPromptStore().recordHelpfulRun();

      expect(state.helpfulRuns, 3);
    });

    test('remembers that the review was asked and the sponsor answered', () async {
      final store = SupportPromptStore();
      await store.markReviewPrompted(_now);
      await store.markSponsorAnswered();

      final state = await SupportPromptStore().recordHelpfulRun();

      expect(state.reviewPromptedAt, _now);
      expect(state.isSponsorAnswered, isTrue);
    });
  });
}
