import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../../core/utils/validators/input_validators.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../notifications/notification_service.dart';
import '../bloc/search_bloc.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/constants/strings.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:animated_text_kit/animated_text_kit.dart';

import 'login_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final GlobalKey<SearchFormState> _searchFormKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final isKeyboardVisible = MediaQuery.of(context).viewInsets.bottom > 0;

    return Scaffold(
      appBar: AppBar(
        title: Builder(
          builder: (context) {
            final isSmallScreen = MediaQuery.of(context).size.width < 365;
            return isSmallScreen
                ? const Text(Strings.appTitle)
                : Row(
              children: [
                Image.asset(
                  'assets/images/auto_search.png',
                  height: 32,
                ),
                const SizedBox(width: 10),
                const Text(Strings.appTitle),
              ],
            );
          },
        ),
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            child: Column(
              children: [
                Expanded(
                  child: BlocListener<SearchBloc, SearchState>(
                    listener: _handleStateChanges,
                    child: SearchForm(key: _searchFormKey),
                  ),
                ),
                if (!isKeyboardVisible) const Divider(),
                const SizedBox(height: 48), // Reserve space for the bottom row
              ],
            ),
          ),
          // Bottom row positioned
          if (!isKeyboardVisible)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton(
                    onPressed: () => openInWebView(context, 'https://svitspindler.com/microsoft-automatic-rewards'),
                    child: const Text('Help'),
                  ),
                  TextButton(
                    onPressed: () => openInWebView(context, 'https://rewards.bing.com/'),
                    child: const Text('Rewards'),
                  )
                ],
              ),
            ),
        ],
      ),
    );
  }

  void _handleStateChanges(BuildContext context, SearchState state) {
    if (state is SearchFailure) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '${Strings.searchFailed}${state.message}',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ],
          ),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          duration: const Duration(seconds: 4),
        ),
      );
    }
    if (state is SearchSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.white),
              const SizedBox(width: 12),
              const Text(
                Strings.searchCompleted,
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    }
    if (state is SearchFailure || state is SearchSuccess) {
      WakelockPlus.disable();
    }
  }

  void openInWebView(BuildContext context, String url) {
    if (_searchFormKey.currentState != null) {
      _searchFormKey.currentState!.openInWebView(url);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Browser is not ready yet')),
      );
    }
  }
}

class SearchForm extends StatefulWidget {
  const SearchForm({super.key});

  @override
  State<SearchForm> createState() => SearchFormState();
}

class SearchFormState extends State<SearchForm> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _countController = TextEditingController();
  final TextEditingController _delayController = TextEditingController();
  InAppWebViewController? _webViewController;
  bool _sendDailyReminder = false;
  bool _keepScreenOn = true;
  bool _loggedIn = false;
  TimeOfDay _selectedTime = const TimeOfDay(hour: 19, minute: 0);

  @override
  void initState() {
    super.initState();
    saveAppOpenedToday();
    _loadSavedValues();
    _countController.addListener(saveCountValue);
    _delayController.addListener(saveDelayValue);
  }

  @override
  void dispose() {
    _countController.dispose();
    _delayController.dispose();
    _webViewController?.dispose();
    super.dispose();
  }

  Future<void> saveAppOpenedToday() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now();
    final formatted = '${today.year}-${today.month}-${today.day}'; // simple Y-M-D string
    await prefs.setString('last_opened_date', formatted);
  }

  Future<void> _loadSavedValues() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _countController.text = prefs.getString('search_count') ?? '22';
      _delayController.text = prefs.getString('search_delay') ?? '20';
      _sendDailyReminder = prefs.getBool('send_daily_reminder') ?? false;
      _keepScreenOn = prefs.getBool('keep_screen_on') ?? true;
      _loggedIn = prefs.getBool('loggedIn') ?? false;
      _selectedTime = TimeOfDay(
        hour: prefs.getInt('reminder_hour') ?? 19,
        minute: prefs.getInt('reminder_minute') ?? 0,
      );
    });
  }

  Future<void> _selectTime(BuildContext context) async {
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: const ColorScheme.light(
              primary: Colors.blue,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
            buttonTheme: const ButtonThemeData(
              textTheme: ButtonTextTheme.primary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (pickedTime != null && pickedTime != _selectedTime) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('reminder_hour', pickedTime.hour);
      await prefs.setInt('reminder_minute', pickedTime.minute);

      setState(() => _selectedTime = pickedTime);

      if (_sendDailyReminder) {
        await NotificationService.scheduleDailyReminder(hour: pickedTime.hour, minute: pickedTime.minute);
      }
    }
  }

  Future<void> saveCountValue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('search_count', _countController.text);
  }

  Future<void> saveDelayValue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('search_delay', _delayController.text);
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          CustomTextField(
            controller: _countController,
            labelText: Strings.searchCountLabel,
            hintText: Strings.searchCountHint,
            keyboardType: TextInputType.number,
            validator: InputValidators.validateSearchCount,
          ),
          const SizedBox(height: AppConstants.defaultPadding),
          CustomTextField(
            controller: _delayController,
            labelText: Strings.delayLabel,
            hintText: Strings.delayHint,
            keyboardType: TextInputType.number,
            validator: InputValidators.validateDelay,
          ),
          Row(
            children: [
              Checkbox(
                value: _sendDailyReminder,
                onChanged: (value) async {
                  setState(() => _sendDailyReminder = value!);
                  final prefs = await SharedPreferences.getInstance();
                  prefs.setBool('send_daily_reminder', value!);

                  if (value) {
                    await NotificationService.scheduleDailyReminder(hour: _selectedTime.hour, minute: _selectedTime.minute);
                  } else {
                    await NotificationService.cancelReminder();
                  }
                },
              ),
              Expanded(
                child: InkWell(
                  onTap: () => _selectTime(context),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Daily reminder at ',
                        style: TextStyle(
                          color: _sendDailyReminder ? Colors.blue : Colors.grey,
                          decoration: TextDecoration.none,
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(
                              color: _sendDailyReminder ? Colors.blue : Colors.grey,
                              width: 1.0,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _selectedTime.format(context),
                              style: TextStyle(
                                color: _sendDailyReminder ? Colors.blue : Colors.grey,
                                decoration: TextDecoration.none,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              Icons.access_time,
                              color: _sendDailyReminder ? Colors.blue : Colors.grey,
                              size: 20,
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                ),
              ),
            ],
          ),
          Row (
            children: [
              Checkbox(
                  value: _keepScreenOn,
                  onChanged: (value) async {
                    setState(() => _keepScreenOn = value!);
                    final prefs = await SharedPreferences.getInstance();
                    prefs.setBool('keep_screen_on', value!);
                  },
              ),
              Text(
                'Keep screen on during search',
                style: TextStyle(
                  color: _keepScreenOn ? Colors.blue : Colors.grey,
                  decoration: TextDecoration.none,
                ),
              ),
            ],
          ),
          if (!_loggedIn) ...[
            Row(
              children: [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12.0),
                  child: const Icon(
                  Icons.warning_amber,
                  color: Colors.orange,
                  size: 20,
                  ),
                ),
                TextButton(
                    onPressed: () => navigateToLoginScreen(context),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.only(right: 6.0),
                      minimumSize: const Size(0, 0),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                        'Log in',
                        style: TextStyle(
                          decoration: TextDecoration.underline,
                          decorationColor: Theme.of(context).primaryColor)
                    )
                ),
                Text('to earn points.')
              ],
            )
          ] else ...[
            Row(
            children: [
    const Padding(
    padding: EdgeInsets.symmetric(horizontal: 12.0),
    child: Icon(
    Icons.logout,
    color: Colors.blue,
    size: 20,
    ),
    ),
    TextButton(
    onPressed: _logout,
    style: TextButton.styleFrom(
    padding: const EdgeInsets.only(right: 6.0),
    minimumSize: const Size(0, 0),
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
    ),
    child: Text(
    'Log out',
    style: TextStyle(
    decoration: TextDecoration.underline,
    decorationColor: Theme.of(context).primaryColor,
    ),
    ),
    ),
    ],
    ),
    ],
          BlocBuilder<SearchBloc, SearchState>(
            builder: (context, state) {
              final isInProgress = state is SearchInProgress;
              return Column(
                children: [
                  CustomButton(
                    onPressed: isInProgress ? _cancelSearch : _startSearch,
                    text: _getButtonText(state),
                  ),
                  if (isInProgress) ...[
                    const SizedBox(height: 12),

                    // Spinner + animated dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Searching.',
                          style: TextStyle(fontSize: 16, color: Colors.blue),
                        ),
                        AnimatedTextKit(
                          repeatForever: true,
                          animatedTexts: [
                            TyperAnimatedText('..',
                                textStyle: const TextStyle(fontSize: 16, color: Colors.blue),
                                speed: const Duration(milliseconds: 1000)),
                          ],
                          isRepeatingAnimation: true,
                          pause: const Duration(milliseconds: 200),
                          displayFullTextOnTap: false,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Animated linear progress bar
                    TweenAnimationBuilder<double>(
                      duration: const Duration(milliseconds: 300),
                      tween: Tween<double>(
                        begin: 0,
                        end: state.totalCount > 0 ? state.currentCount / state.totalCount : 0,
                      ),
                      builder: (context, value, _) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 32),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: LinearProgressIndicator(
                              value: value,
                              minHeight: 10,
                              backgroundColor: Colors.grey.shade300,
                              color: Colors.blue,
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 8),

                    // Progress text (e.g. 4/20)
                    Text(
                      '${state.currentCount}/${state.totalCount} completed',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppConstants.defaultPadding * 2),
                  SizedBox(
                    height: MediaQuery.of(context).size.height *
                        (state is SearchInProgress ? 0.3 : 0.4),
                    child: InAppWebView(
                      initialUrlRequest: URLRequest(url: WebUri("https://www.bing.com")),
                      onWebViewCreated: (controller) => _webViewController = controller,
                      initialSettings: InAppWebViewSettings(
                        javaScriptEnabled: true,
                        cacheEnabled: true,
                        incognito: false,
                        clearSessionCache: false,
                        clearCache: false,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16), // Bottom margin
                ],
              );

            },
          ),
        ],
      ),
    );
  }

  String _getButtonText(SearchState state) {
    if (state is SearchInProgress) return Strings.searchInProgress;
    return Strings.startSearch;
  }

  void _startSearch() {
    if (_formKey.currentState!.validate()) {
      if (_keepScreenOn) {
        WakelockPlus.enable();
      }
      context.read<SearchBloc>().add(StartSearchEvent(
        count: int.parse(_countController.text),
        delay: double.parse(_delayController.text),
        controller: _webViewController!,
      ));
    }
  }

  void navigateToLoginScreen(BuildContext context) {
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const LoginScreen(),
        ),
      );
    }
  }

  void openInWebView(String url) {
    if (_webViewController != null) {
      _webViewController!.loadUrl(
        urlRequest: URLRequest(url: WebUri(url)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Browser is not ready yet')),
      );
    }
  }

  void _cancelSearch() {
    context.read<SearchBloc>().add(CancelSearchEvent());
  }

  Future<void> _logout() async {

    await CookieManager.instance().deleteAllCookies();
    await WebStorageManager.instance().deleteAllData();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('loggedIn', false);

    if (mounted) {
      navigateToLoginScreen(context);
    }
  }
}