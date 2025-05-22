import '../../constants/app_constants.dart';
import '../../constants/strings.dart';

class InputValidators {
  static String? validateSearchCount(String? value) {
    if (value == null || value.isEmpty) return Strings.invalidNumberError;
    final count = int.tryParse(value);
    if (count == null || count < AppConstants.minSearches || count > AppConstants.maxSearches) {
      return Strings.invalidNumberError;
    }
    return null;
  }

  static String? validateDelay(String? value) {
    if (value == null || value.isEmpty) return Strings.invalidDelayError;
    final delay = double.tryParse(value);
    if (delay == null || delay < 0.5) return Strings.invalidDelayError;
    return null;
  }
}