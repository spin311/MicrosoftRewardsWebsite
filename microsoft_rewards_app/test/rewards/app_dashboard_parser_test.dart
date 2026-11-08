import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/parsers/app_dashboard_parser.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/app_dashboard.dart';

// Shape of GET prod.rewardsplatform.microsoft.com/dapi/me seen live on
// 2026-11-08, round-tripped through JSON like a real response body.
Map<String, dynamic> dapiMe({List<Object?>? promotions, Object? balance = 997}) {
  return jsonDecode(jsonEncode({
    'response': {
      'balance': balance,
      'profile': {
        'attributes': {'country': 'si'},
      },
      'promotions': promotions ??
          [
            {
              'name': 'ENUS_readarticle3_30points',
              'attributes': {
                'type': 'msnreadearn',
                'offerid': 'ENUS_readarticle3_30points',
                'title': 'Read to earn',
                'pointprogress': '0',
                'pointmax': '30',
                'complete': 'False',
              },
            },
            {
              'name': 'Gamification_Sapphire_DailyCheckIn',
              'attributes': {
                'type': 'checkin',
                'offerid': 'Gamification_Sapphire_DailyCheckIn',
                'complete': 'False',
                'hidden': 'True',
              },
            },
          ],
    },
  })) as Map<String, dynamic>;
}

void main() {
  group('parseAppDashboard', () {
    test('reads the balance, the profile country and the promotions', () {
      // Act
      final dashboard = parseAppDashboard(dapiMe());

      // Assert
      expect(dashboard?.balance, 997);
      expect(dashboard?.country, 'si');
      expect(dashboard?.promotions, hasLength(2));
    });

    test('reads numbers sent as strings and "True"/"False" flags', () {
      final readToEarn = parseAppDashboard(dapiMe())?.promotionOfType('msnreadearn');

      expect(
        readToEarn,
        const AppPromotion(
          name: 'ENUS_readarticle3_30points',
          type: 'msnreadearn',
          offerId: 'ENUS_readarticle3_30points',
          title: 'Read to earn',
          progress: 0,
          max: 30,
          isComplete: false,
          isHidden: false,
        ),
      );
    });

    test('reads the hidden flag', () {
      final checkIn = parseAppDashboard(dapiMe())?.promotionOfType('checkin');

      expect(checkIn?.isHidden, isTrue);
      expect(checkIn?.isComplete, isFalse);
    });

    test('leaves missing or unreadable numbers unknown, never zero', () {
      // Arrange
      final json = dapiMe(promotions: [
        {
          'name': 'x',
          'attributes': {'type': 'msnreadearn', 'pointprogress': '', 'pointmax': 'many'},
        },
      ]);

      // Act
      final promotion = parseAppDashboard(json)?.promotions.single;

      // Assert
      expect(promotion?.progress, isNull);
      expect(promotion?.max, isNull);
      expect(promotion?.offerId, isNull);
    });

    test('skips promotions without attributes', () {
      final json = dapiMe(promotions: [
        {'name': 'no attributes'},
        'not an object',
        {
          'name': 'ok',
          'attributes': {'type': 'checkin'},
        },
      ]);

      expect(parseAppDashboard(json)?.promotions.map((p) => p.name), ['ok']);
    });

    test('reads a balance sent as a string and leaves a missing one unknown', () {
      expect(parseAppDashboard(dapiMe(balance: '1200'))?.balance, 1200);
      expect(parseAppDashboard(dapiMe(balance: null))?.balance, isNull);
    });

    // A changed API must read as "unknown", not as "no promotions today".
    test('returns null for a shape it does not recognise', () {
      expect(parseAppDashboard(null), isNull);
      expect(parseAppDashboard('<html>'), isNull);
      expect(parseAppDashboard(<String, dynamic>{}), isNull);
      expect(parseAppDashboard({'response': <String, dynamic>{}}), isNull);
      expect(parseAppDashboard({'response': {'promotions': 'none'}}), isNull);
    });
  });

  group('AppDashboard.promotionOfType', () {
    test('matches the type case-insensitively and returns null when absent', () {
      final dashboard = parseAppDashboard(dapiMe())!;

      expect(dashboard.promotionOfType('MsnReadEarn')?.offerId, 'ENUS_readarticle3_30points');
      expect(dashboard.promotionOfType('quiz'), isNull);
    });
  });

  group('AppPromotion.isDone', () {
    test('is true when marked complete or when progress reached the max', () {
      expect(const AppPromotion(name: 'a', isComplete: true).isDone, isTrue);
      expect(const AppPromotion(name: 'a', progress: 30, max: 30).isDone, isTrue);
    });

    test('is false with points left, unknown numbers, or a zero max', () {
      expect(const AppPromotion(name: 'a', progress: 27, max: 30).isDone, isFalse);
      expect(const AppPromotion(name: 'a').isDone, isFalse);
      expect(const AppPromotion(name: 'a', progress: 0, max: 0).isDone, isFalse);
    });
  });

  group('parseActivityReceipt', () {
    test('reads the new balance from an activity response', () {
      expect(parseActivityReceipt({'response': {'balance': 1000}}).balance, 1000);
    });

    test('leaves the balance unknown for any other shape', () {
      expect(parseActivityReceipt(null).balance, isNull);
      expect(parseActivityReceipt({'response': <String, dynamic>{}}).balance, isNull);
    });
  });
}
