// Defensive readers for JSON whose shape Microsoft can change without notice.
// Each returns null for anything it doesn't recognise instead of throwing.

/// Covers both `jsonDecode` maps and the untyped maps a platform channel
/// returns.
typedef JsonMap = Map<Object?, Object?>;

JsonMap? asObject(Object? value) => value is JsonMap ? value : null;

List<Object?>? asList(Object? value) => value is List ? value : null;

String? asNonEmptyString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value : null;

/// Reads a whole number sent as a JSON number or a numeric string ("30").
/// Fractions, blanks and anything else are unknown (null).
int? asInt(Object? value) {
  if (value is int) return value;
  final number = switch (value) {
    final double d => d,
    final String s => double.tryParse(s.trim()),
    _ => null,
  };
  if (number == null || !number.isFinite || number != number.truncateToDouble()) {
    return null;
  }
  return number.toInt();
}

/// True for `true` and for the string "true" in any case ("True").
bool isTrue(Object? value) =>
    value == true || (value is String && value.toLowerCase() == 'true');
