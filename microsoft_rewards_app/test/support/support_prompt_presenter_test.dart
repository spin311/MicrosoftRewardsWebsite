import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:microsoft_automatic_rewards/features/support/sponsor_dialog.dart';
import 'package:microsoft_automatic_rewards/features/support/support_prompt_presenter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeReview extends Fake implements InAppReview {
  int requests = 0;
  @override
  Future<bool> isAvailable() async => true;
  @override
  Future<void> requestReview() async => requests++;
}

final _now = DateTime(2026, 11, 8, 13);

SupportPromptPresenter _presenter(_FakeReview review, {bool Function()? foreground}) =>
    SupportPromptPresenter(review: review, clock: () => _now, isInForeground: foreground ?? () => true);

Future<void> _pumpButton(WidgetTester tester, SupportPromptPresenter presenter) {
  return tester.pumpWidget(MaterialApp(
    home: Builder(
      builder: (context) => TextButton(
        onPressed: () => presenter.onHelpfulRun(context),
        child: const Text('helpful run'),
      ),
    ),
  ));
}

void main() {
  testWidgets('requests a review on the 3rd helpful run, once', (tester) async {
    // Arrange
    SharedPreferences.setMockInitialValues({'support_helpful_runs': 1});
    final review = _FakeReview();
    await _pumpButton(tester, _presenter(review));

    // Act: runs 2, 3 and 4
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('helpful run'));
      await tester.pumpAndSettle();
    }

    // Assert
    expect(review.requests, 1);
    expect(find.text(sponsorDialogTitle), findsNothing);
  });

  testWidgets('shows the sponsor ask when due, and "Not now" closes it for good', (tester) async {
    // Arrange: 9 helpful runs, review asked 8 days ago.
    SharedPreferences.setMockInitialValues({
      'support_helpful_runs': 9,
      'support_review_prompted_at': _now.subtract(const Duration(days: 8)).millisecondsSinceEpoch,
    });
    await _pumpButton(tester, _presenter(_FakeReview()));

    // Act
    await tester.tap(find.text('helpful run'));
    await tester.pumpAndSettle();

    // Assert: the ask is shown...
    expect(find.text(sponsorDialogTitle), findsOneWidget);
    expect(find.text(sponsorDialogBody), findsOneWidget);

    // ...closes on "Not now"...
    await tester.tap(find.text('Not now'));
    await tester.pumpAndSettle();
    expect(find.text(sponsorDialogTitle), findsNothing);

    // ...and never comes back.
    await tester.tap(find.text('helpful run'));
    await tester.pumpAndSettle();
    expect(find.text(sponsorDialogTitle), findsNothing);
  });

  testWidgets('holds a due review while the app is in the background', (tester) async {
    // Arrange: the 3rd helpful run ends in the background, the 4th in front.
    SharedPreferences.setMockInitialValues({'support_helpful_runs': 2});
    final review = _FakeReview();
    var isInForeground = false;
    await _pumpButton(tester, _presenter(review, foreground: () => isInForeground));

    // Act + Assert: nothing while in the background...
    await tester.tap(find.text('helpful run'));
    await tester.pumpAndSettle();
    expect(review.requests, 0);

    // ...and the review once the next helpful run ends in the foreground.
    isInForeground = true;
    await tester.tap(find.text('helpful run'));
    await tester.pumpAndSettle();
    expect(review.requests, 1);
  });
}
