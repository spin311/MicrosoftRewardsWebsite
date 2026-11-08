import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_constants.dart';
import 'rewards_cubit.dart';
import 'rewards_messages.dart';

const _appPointsHint = 'Bing app bonus: Read to Earn and daily check-in';

/// Today's Rewards status (points, search counter) and the app-points button,
/// shown at the top of the search screen.
class RewardsStatusCard extends StatelessWidget {
  const RewardsStatusCard({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<RewardsCubit, RewardsState>(
      builder: (context, state) {
        final textTheme = Theme.of(context).textTheme;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _StatusRow(state: state, style: textTheme.titleSmall),
                _AppPointsRow(state: state, style: textTheme.bodySmall),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.state, required this.style});

  final RewardsState state;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.stars_rounded, color: AppConstants.primary, size: 20),
        const SizedBox(width: 8),
        Expanded(child: Text(describeStatus(state.status), style: style)),
        if (state.isRefreshing)
          const Padding(
            padding: EdgeInsets.all(14),
            child: SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)),
          )
        else
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Rewards status',
            onPressed: context.read<RewardsCubit>().refresh,
          ),
      ],
    );
  }
}

class _AppPointsRow extends StatelessWidget {
  const _AppPointsRow({required this.state, required this.style});

  final RewardsState state;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<RewardsCubit>();
    return Row(
      children: [
        Expanded(child: Text(_text(), style: style)),
        state.isCollecting
            ? TextButton(onPressed: cubit.cancelAppPoints, child: const Text('Stop'))
            : TextButton(onPressed: cubit.collectAppPoints, child: const Text('Collect app points')),
      ],
    );
  }

  String _text() {
    if (!state.isCollecting) return state.appPointsMessage ?? _appPointsHint;
    final progress = state.readProgress;
    final max = state.readMax;
    if (progress == null || max == null) return 'Connecting to the Bing app…';
    return 'Reading articles… $progress/$max';
  }
}
