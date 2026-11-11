import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../domain/entities/app_access_token.dart';
import '../../domain/entities/app_token_result.dart';
import '../parsers/json_readers.dart';
import 'bing_app_oauth.dart';

/// Swaps a Bing app authorization code for an access token.
///
/// Only the access token is kept, in memory: the refresh token is dropped
/// because each run re-authorizes silently through single sign-on.
class BingAppTokenExchange {
  BingAppTokenExchange({
    required http.Client client,
    this.timeout = const Duration(seconds: 30),
  }) : _client = client;

  final http.Client _client;
  final Duration timeout;

  Future<AppTokenResult> exchange(String code) async {
    final http.Response response;
    try {
      response = await _client.post(
        bingAppTokenUri,
        headers: const {'Accept': 'application/json'},
        // A Map body is sent form-encoded.
        body: {
          'grant_type': 'authorization_code',
          'client_id': bingAppClientId,
          'code': code,
          'redirect_uri': bingAppRedirectUri,
          'scope': bingAppScope,
        },
      ).timeout(timeout);
    } on TimeoutException {
      return const AppTokenFailed('token request timed out');
    } on http.ClientException {
      return const AppTokenFailed('token request failed (network)');
    } on SocketException {
      return const AppTokenFailed('token request failed (network)');
    }
    return _readToken(response);
  }

  AppTokenResult _readToken(http.Response response) {
    final Object? json;
    try {
      json = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      return AppTokenFailed('token answer is not JSON (HTTP ${response.statusCode})');
    }
    final body = asObject(json);
    final accessToken = asNonEmptyString(body?['access_token']);
    if (accessToken != null && response.statusCode == 200) {
      return AppTokenGranted(AppAccessToken(accessToken));
    }
    // The OAuth error code (e.g. invalid_grant) is safe to surface; the
    // description can carry trace ids, so it is left out.
    final error = asNonEmptyString(body?['error']) ?? 'no access_token';
    return AppTokenFailed('token request rejected: $error (HTTP ${response.statusCode})');
  }
}
