import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:microsoft_automatic_rewards/features/rewards/data/parsers/user_info_parser.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/point_counter.dart';
import 'package:microsoft_automatic_rewards/features/rewards/domain/entities/rewards_snapshot.dart';

// Ported from the extension's wxt/entrypoints/utils/rewardsStatus.test.ts.

final today = DateTime(2026, 11, 7); // 7 Nov 2026, local time

// Trimmed from the shape rewards.bing.com/api/getuserinfo?type=1 returns,
// round-tripped through JSON so the maps and lists are typed as decoded JSON.
Map<String, dynamic> userInfo({Map<String, dynamic> overrides = const {}}) {
  return jsonDecode(jsonEncode({
    'dashboard': {
      'userStatus': {
        'availablePoints': 12345,
        'levelInfo': {'activeLevel': 'newLevel3', 'activeLevelName': 'Gold'},
        'counters': {
          'pcSearch': [
            {'title': 'PC search', 'pointProgress': 30, 'pointProgressMax': 90},
            {'title': 'Microsoft Edge bonus', 'pointProgress': 0, 'pointProgressMax': 12},
          ],
          'mobileSearch': [
            {'title': 'Mobile search', 'pointProgress': '15', 'pointProgressMax': '60'},
          ],
        },
      },
      'dailySetPromotions': {
        '11/06/2026': [
          {'complete': true},
          {'complete': true},
          {'complete': true},
        ],
        '11/07/2026': [
          {'complete': true},
          {'complete': false},
          {'complete': 'True'},
        ],
      },
      ...overrides,
    },
  })) as Map<String, dynamic>;
}

Map<String, dynamic> countersOf(Map<String, dynamic> json) =>
    json['dashboard']['userStatus']['counters'] as Map<String, dynamic>;

void main() {
  group('parseUserInfo', () {
    test('reads points, level and the search counters', () {
      // Act
      final snapshot = parseUserInfo(userInfo(), today);

      // Assert
      expect(snapshot?.points, 12345);
      expect(snapshot?.level, 'Gold');
      expect(snapshot?.pcSearch, const PointCounter(progress: 30, max: 90));
      expect(snapshot?.edgeBonus, const PointCounter(progress: 0, max: 12));
      expect(snapshot?.mobileSearch, const PointCounter(progress: 15, max: 60));
    });

    // The Edge bonus only completes when searching in Edge. Counting it into
    // the PC total would make the searches look unfinished forever.
    test('keeps the Edge bonus apart from the PC search counter', () {
      final snapshot = parseUserInfo(userInfo(), today);

      expect(snapshot?.pcSearch, const PointCounter(progress: 30, max: 90));
    });

    test("counts today's daily set, not yesterday's", () {
      final snapshot = parseUserInfo(userInfo(), today);

      expect(snapshot?.dailySet, const DailySetProgress(done: 2, total: 3));
    });

    test('reports no daily set when today has none', () {
      final json = userInfo(overrides: {'dailySetPromotions': <String, dynamic>{}});

      expect(parseUserInfo(json, today)?.dailySet, isNull);
    });

    test('reports no mobile counter for accounts without mobile searches', () {
      // Arrange
      final json = userInfo();
      countersOf(json).remove('mobileSearch');

      // Act & Assert
      expect(parseUserInfo(json, today)?.mobileSearch, isNull);
    });

    test('falls back to the level id when there is no level name', () {
      final json = userInfo();
      json['dashboard']['userStatus']['levelInfo'] = {'activeLevel': 'Level1'};

      expect(parseUserInfo(json, today)?.level, 'Level1');
    });

    // Microsoft changes this API without notice; a shape we don't know must
    // read as "unrecognised", never as a run of zeros that stops the searches.
    test('returns null for a response without a dashboard', () {
      expect(parseUserInfo(<String, dynamic>{}, today), isNull);
      expect(parseUserInfo(null, today), isNull);
      expect(parseUserInfo('<html>', today), isNull);
      expect(parseUserInfo([1, 2], today), isNull);
    });

    test('returns null when there is a dashboard but no user status', () {
      expect(parseUserInfo({'dashboard': <String, dynamic>{}}, today), isNull);
    });

    test('skips counters whose numbers are not numbers', () {
      final json = userInfo();
      countersOf(json)['mobileSearch'] = [
        {'pointProgress': 'x', 'pointProgressMax': 60},
      ];

      expect(parseUserInfo(json, today)?.mobileSearch, isNull);
    });

    test('flags a mobile counter that is listed but unreadable', () {
      final json = userInfo();
      countersOf(json)['mobileSearch'] = [
        {'pointProgress': 'x', 'pointProgressMax': 60},
      ];

      final snapshot = parseUserInfo(json, today);

      expect(snapshot?.isMobileSearchUnreadable, isTrue);
      expect(snapshot?.phoneSearchCounter, isNull);
    });

    test('does not flag an account that has no mobile counter at all', () {
      final json = userInfo();
      countersOf(json).remove('mobileSearch');

      final snapshot = parseUserInfo(json, today);

      expect(snapshot?.isMobileSearchUnreadable, isFalse);
      expect(snapshot?.phoneSearchCounter, snapshot?.pcSearch);
    });

    // Summing only the readable entries could look maxed while the unreadable
    // one still had points left, and a maxed counter ends the searches.
    test('treats a group with one unreadable entry as unknown, not as a partial sum', () {
      final json = userInfo();
      countersOf(json)['pcSearch'] = [
        {'title': 'PC search', 'pointProgress': 30, 'pointProgressMax': 30},
        {'title': 'PC search level 2', 'pointProgress': null, 'pointProgressMax': 60},
      ];

      expect(parseUserInfo(json, today)?.pcSearch, isNull);
    });

    test('only treats "Edge" as a whole word as the Edge bonus', () {
      final json = userInfo();
      countersOf(json)['pcSearch'] = [
        {'title': 'Knowledge search', 'pointProgress': 10, 'pointProgressMax': 90},
      ];

      expect(parseUserInfo(json, today)?.pcSearch, const PointCounter(progress: 10, max: 90));
    });

    test('reads points sent as a string and leaves unreadable points unknown', () {
      final asString = userInfo();
      asString['dashboard']['userStatus']['availablePoints'] = '997';
      final unreadable = userInfo();
      unreadable['dashboard']['userStatus']['availablePoints'] = '';

      expect(parseUserInfo(asString, today)?.points, 997);
      expect(parseUserInfo(unreadable, today)?.points, isNull);
    });
  });

  group('dailySetKey', () {
    test('formats the local date the way the API keys the daily set', () {
      expect(dailySetKey(DateTime(2026, 1, 5)), '01/05/2026');
    });
  });

  // Shape seen live on a Member-level account (Nov 2026, new Rewards
  // program): one "Search" counter, no mobile counter, and the daily set keyed
  // by date including the next two days.
  group('parseUserInfo on a Member-level account', () {
    final member = <String, dynamic>{
      'dashboard': {
        'userStatus': {
          'availablePoints': 855,
          'levelInfo': {'activeLevel': 'newLevel1', 'activeLevelName': 'Member'},
          'counters': {
            'pcSearch': [
              {'title': 'Search', 'pointProgress': 0, 'pointProgressMax': 15, 'complete': false},
            ],
            'activityAndQuiz': [
              {'title': 'Other activities', 'pointProgress': 0, 'pointProgressMax': 151},
            ],
            'dailyPoint': [
              {'title': '', 'pointProgress': 0, 'pointProgressMax': 166},
            ],
          },
        },
        'dailySetPromotions': {
          '11/07/2026': [
            {'complete': false},
            {'complete': false},
            {'complete': false},
          ],
          '11/08/2026': [
            {'complete': false},
            {'complete': false},
            {'complete': false},
          ],
        },
      },
    };

    test('reads the single search counter and no mobile counter', () {
      expect(
        parseUserInfo(member, today),
        const RewardsSnapshot(
          points: 855,
          level: 'Member',
          pcSearch: PointCounter(progress: 0, max: 15),
          edgeBonus: null,
          mobileSearch: null,
          dailySet: DailySetProgress(done: 0, total: 3),
        ),
      );
    });

    // Verified live: phone searches on a Member account fill the shared
    // pcSearch counter, so that is the counter the phone run must watch.
    test('uses the shared search counter as the phone search counter', () {
      final snapshot = parseUserInfo(member, today);

      expect(snapshot?.phoneSearchCounter, const PointCounter(progress: 0, max: 15));
    });
  });
}
