import 'package:flutter/material.dart';

import 'support_links.dart';

const sponsorDialogTitle = "Glad it's earning you points!";
const sponsorDialogBody =
    'Reward Search Automator is free and built by one developer in spare time. '
    'Sponsor from \$5/month to keep it working as Microsoft changes things, '
    'and get your name featured in the README.';

/// The one-time sponsor ask, shown after the app has helped several times.
Future<void> showSponsorDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      icon: const Icon(Icons.favorite, color: Colors.pinkAccent),
      title: const Text(sponsorDialogTitle),
      content: const Text(sponsorDialogBody),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('Not now'),
        ),
        FilledButton.icon(
          icon: const Icon(Icons.favorite),
          label: const Text('Sponsor'),
          onPressed: () {
            Navigator.of(dialogContext).pop();
            openSponsorPage();
          },
        ),
      ],
    ),
  );
}
