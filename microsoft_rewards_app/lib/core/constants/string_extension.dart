extension StringExtension on String {
  String capitalizeFirst() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  String removeExtraSpaces() => replaceAll(RegExp(r'\s+'), ' ').trim();
}