import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/app.dart';
import 'package:microsoft_automatic_rewards/core/di/injection_container.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(init);

  testWidgets('starts on the sign-in screen when the user is not logged in',
      (WidgetTester tester) async {
    // Arrange
    SharedPreferences.setMockInitialValues({});

    // Act
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    // Assert
    expect(find.text('Login to Microsoft Account'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('Skip for now'), findsOneWidget);
  });
}
