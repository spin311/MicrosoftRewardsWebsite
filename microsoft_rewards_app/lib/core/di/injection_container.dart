import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../features/rewards/presentation/rewards_cubit.dart';
import '../../features/rewards/rewards.dart';
import '../../features/search/data/dataSources/search_words.dart';
import '../../features/search/domain/repositories/search_repository.dart';
import '../../features/search/domain/repositories/search_repository_impl.dart';
import '../../features/search/domain/useCases/perform_search.dart';
import '../../features/search/presentation/bloc/search_bloc.dart';
import '../utils/helpers/search_helper.dart';

final GetIt sl = GetIt.instance;

Future<void> init() async {
  // Register BLoCs
  sl.registerFactory(() => SearchBloc(performSearch: sl(), statusSource: sl()));
  sl.registerFactory(() => RewardsCubit(statusSource: sl(), appPoints: sl()));

  // Register use cases
  sl.registerLazySingleton(() => PerformSearch(sl()));

  // Register repositories
  sl.registerLazySingleton<SearchRepository>(() => SearchRepositoryImpl(
    dataSource: sl(),
    searchHelper: sl(),
  ));

  // Register data sources
  sl.registerLazySingleton<SearchWordsDataSource>(
        () => SearchWordsDataSourceImpl(),
  );

  // Rewards: today's status (headless WebView) and the Bing-app points.
  // The http.Client lives as long as the app.
  sl.registerLazySingleton<http.Client>(() => http.Client());
  sl.registerLazySingleton<RewardsStatusSource>(() => HeadlessRewardsStatusFetcher());
  sl.registerLazySingleton<AppPointsEarner>(() => AppPointsService(
        tokenSource: BingAppTokenProvider(
          authorizer: HeadlessBingAppAuthorizer(),
          exchange: BingAppTokenExchange(client: sl()),
        ),
        apiFactory: (token) => HttpRewardsPlatformApi(client: sl(), token: token),
      ));

  // Register core services
  sl.registerLazySingleton(() => SearchHelper());
}
