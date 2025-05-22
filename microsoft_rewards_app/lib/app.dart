import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:microsoft_automatic_rewards/features/search/presentation/pages/startup_screen.dart';
import 'core/constants/app_constants.dart';
import 'core/constants/strings.dart';
import 'features/search/presentation/bloc/search_bloc.dart';
import 'core/di/injection_container.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: Strings.appTitle,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primary,
          primary: AppConstants.primary,
          onPrimary: AppConstants.onPrimary,
          background: AppConstants.background,
          error: AppConstants.error,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppConstants.primary,
          foregroundColor: AppConstants.onPrimary,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.primary,
            foregroundColor: AppConstants.onPrimary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: AppConstants.primary,
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppConstants.primary,
          contentTextStyle: const TextStyle(color: AppConstants.onPrimary),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          behavior: SnackBarBehavior.floating,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: AppConstants.primary,
          linearTrackColor: AppConstants.progressBackground,
        ),
      ),
      home: BlocProvider(
        create: (context) => sl<SearchBloc>(),
        child: const StartupScreen(),
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}