import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:microsoft_automatic_rewards/features/search/presentation/pages/search_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/di/injection_container.dart';
import '../bloc/search_bloc.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _showWebView = false;
  late InAppWebViewController _webViewController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Login to Microsoft")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            if (!_showWebView) ...[
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                margin: const EdgeInsets.symmetric(horizontal: 16),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/images/microsoft.png',
                        height: 40,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Earn Microsoft Rewards automatically",
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        "Sign in to Microsoft to earn points by automating Bing searches.\n Level 2 is required to earn points.\n Redeem points for gift cards and more.",
                        style: TextStyle(fontSize: 15, height: 1.5),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _showWebView = true;
                          });
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        label: const Text(
                          "Sign In",
                          style: TextStyle(fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const Spacer(),
            Align(
              alignment: Alignment.bottomRight,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextButton(
                  onPressed: () => showConfirmPopup(context),
                  child: const Text(
                      "Skip for now",
                      style: TextStyle(fontSize: 16, color: Colors.blue)
                  ),
                ),
              ),
            ),
            ] else ...[
              Expanded(
                child: InAppWebView(
                  initialUrlRequest: URLRequest(
                    url: WebUri("https://login.live.com/login.srf?wa=wsignin1.0&id=264960&wreply=https%3A%2F%2Fwww.bing.com%2Fsecure%2FPassport.aspx&wp=MBI_SSL"),
                  ),
                  initialSettings: InAppWebViewSettings(
                    javaScriptEnabled: true,
                    cacheEnabled: true,
                    incognito: false,
                    clearSessionCache: false,
                    clearCache: false,
                  ),
                  onWebViewCreated: (controller) {
                    _webViewController = controller;
                  },
                  onLoadStop: (controller, url) async {
                    if (url != null && url.host.contains("www.bing.com")) {
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setBool("loggedIn", true);
                      navigateToSearchScreen(context);
                    }
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void navigateToSearchScreen(BuildContext context) {
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => BlocProvider(
            create: (context) => sl<SearchBloc>(),
            child: const SearchScreen(),
          ),
        ),
      );
    }
  }

  showConfirmPopup(context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Skip Login for now?"),
          content: const Text("You won't be able to earn points until you login. Are you sure you want to skip?"),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text("Cancel"),
            ),
            TextButton(
              onPressed: () {
                // Handle logout logic here
                Navigator.of(context).pop();
                navigateToSearchScreen(context);
              },
              child: const Text("Skip"),
            ),
          ],
        );
      },
      barrierDismissible: true
    );
  }
}
