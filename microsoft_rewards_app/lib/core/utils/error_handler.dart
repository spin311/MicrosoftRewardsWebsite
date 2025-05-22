import 'dart:async';
import 'dart:io';
import 'package:flutter/cupertino.dart';

class ErrorHandler {
  static String getErrorMessage(Object error) {
    if (error is SocketException) return 'No internet connection';
    if (error is TimeoutException) return 'Request timed out';
    if (error is FormatException) return 'Invalid data format';
    return 'Something went wrong: ${error.toString()}';
  }

  static void logError(String location, Object error) {
    debugPrint('Error in $location: ${error.toString()}');
  }
}