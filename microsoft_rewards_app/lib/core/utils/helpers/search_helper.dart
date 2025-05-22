import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class SearchHelper {
  static Future<void> launchSearch({
    required InAppWebViewController controller,
    required String query }) async {
    final encodedQuery = Uri.encodeComponent(query);
    final url = WebUri('https://www.bing.com/search?q=$encodedQuery&qs=n&form=QBLH&sp=-1&pq=');

    try {
      await controller.loadUrl(
        urlRequest: URLRequest(url: url),
      );
    } catch (e) {
      throw Exception('Failed to launch search: ${e.toString()}');
    }
  }
}
