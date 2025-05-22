import 'package:get_it/get_it.dart';

import '../../features/search/data/dataSources/search_words.dart';
import '../../features/search/domain/repositories/search_repository.dart';
import '../../features/search/domain/repositories/search_repository_impl.dart';
import '../../features/search/domain/useCases/perform_search.dart';
import '../../features/search/presentation/bloc/search_bloc.dart';
import '../utils/helpers/search_helper.dart';

final GetIt sl = GetIt.instance;

Future<void> init() async {
  // Register BLoCs
  sl.registerFactory(() => SearchBloc(performSearch: sl()));

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

  // Register core services
  sl.registerLazySingleton(() => SearchHelper());
}