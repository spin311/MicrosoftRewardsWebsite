import 'package:url_launcher/url_launcher.dart';

import '../../core/utils/error_handler.dart';

/// GitHub Sponsors, tagged so sponsorships from the app show up in exports
/// (the extension uses `-popup` and `-milestone`).
const sponsorUrl = 'https://github.com/sponsors/spin311?metadata_source=MicrosoftRewardsWebsite-app';

/// Opens the sponsor page in the browser. False when no app could open it.
Future<bool> openSponsorPage() => _openExternally(sponsorUrl);

Future<bool> _openExternally(String url) async {
  try {
    return await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  } catch (e) {
    ErrorHandler.logError('open $url', e);
    return false;
  }
}
