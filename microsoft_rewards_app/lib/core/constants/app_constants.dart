import 'package:flutter/material.dart';

abstract class AppConstants {
  static const double defaultPadding = 16.0;
  static const double defaultButtonHeight = 48.0;
  static const int maxSearches = 50;
  static const int minSearches = 1;
  static const int urlLaunchTimeout = 10;
  static const int debounceTime = 500;
  static const primary = Color(0xFF0078D7);
  static const onPrimary = Colors.white;
  static const background = Colors.white;
  static const error = Colors.redAccent;
  static const success = Colors.green;
  static const progressBackground = Color(0xFFE0E0E0);
}