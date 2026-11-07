import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IToolbarFilter, ToolbarFilterType } from '../../../../../framework';
import {
  useCreatedByToolbarFilter,
  useModifiedByToolbarFilter,
} from '../../../common/awx-toolbar-filters';
import { hostFilterQueryKey } from '../../../common/useAwxView';
import { useDynamicToolbarFilters } from '../../../common/useDynamicFilters';

/**
 * @param options.hostFilter adds a "Host filter" filter that takes a host_filter expression,
 * for lists whose API supports host_filter (the hosts list and the hosts of an inventory).
 */
export function useHostsFilters(options?: { hostFilter?: boolean }) {
  const createdByToolbarFilter = useCreatedByToolbarFilter();
  const modifiedByToolbarFilter = useModifiedByToolbarFilter();
  const hostFilterToolbarFilter = useHostFilterToolbarFilter();
  const additionalFilters = useMemo(
    () =>
      options?.hostFilter
        ? [createdByToolbarFilter, modifiedByToolbarFilter, hostFilterToolbarFilter]
        : [createdByToolbarFilter, modifiedByToolbarFilter],
    [createdByToolbarFilter, modifiedByToolbarFilter, hostFilterToolbarFilter, options?.hostFilter]
  );

  const toolbarFilters = useDynamicToolbarFilters({
    optionsPath: 'hosts',
    preSortedKeys: ['name', 'description', 'created-by', 'modified-by'],
    preFilledValueKeys: { name: { apiPath: 'hosts' }, id: { apiPath: 'hosts' } },
    additionalFilters,
    removeFilters: ['last_job_host_summary'],
  });
  return toolbarFilters;
}

export function useHostFilterToolbarFilter() {
  const { t } = useTranslation();
  return useMemo<IToolbarFilter>(
    () => ({
      key: hostFilterQueryKey,
      label: t('Host filter'),
      type: ToolbarFilterType.SingleText,
      query: hostFilterQueryKey,
      comparison: 'equals',
      placeholder: t('ansible_facts__ansible_distribution=RedHat'),
    }),
    [t]
  );
}
