import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'app.dart';
import 'notifications/notification_service.dart';
import 'core/utils/error_handler.dart';
import 'core/di/injection_container.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize dependency injection
  await init();

  await NotificationService.init();
  // Add error handling
  Bloc.observer = _AppBlocObserver();

  runApp(const MyApp());
}

class _AppBlocObserver extends BlocObserver {
  @override
  void onChange(BlocBase<dynamic> bloc, Change<dynamic> change) {
    super.onChange(bloc, change);
    debugPrint('Bloc Change: $change');
  }

  @override
  void onError(BlocBase<dynamic> bloc, Object error, StackTrace stackTrace) {
    ErrorHandler.logError('Bloc ${bloc.runtimeType}', error);
    super.onError(bloc, error, stackTrace);
  }
}