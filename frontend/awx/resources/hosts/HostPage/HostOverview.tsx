import {
  CardBody,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Label,
  LabelGroup,
  SearchInput,
  Stack,
  StackItem,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { DateTimeCell, PageDashboard, useGetPageUrl } from '../../../../../framework';
import { PageDashboardCard } from '../../../../../framework/PageDashboard/PageDashboardCard';
import { PageDetailCodeEditor } from '../../../../../framework/PageDetails/PageDetailCodeEditor';
import { LoadingPage } from '../../../../../framework/components/LoadingPage';
import { StatusCell } from '../../../../common/Status';
import { useGet } from '../../../../common/crud/useGet';
import { AwxError } from '../../../common/AwxError';
import { awxAPI } from '../../../common/api/awx-utils';
import { UnifiedJob } from '../../../interfaces/UnifiedJob';
import { AwxRoute } from '../../../main/AwxRoutes';
import { useGetJobOutputUrl } from '../../../views/jobs/useGetJobOutputUrl';

/** GET /api/v2/hosts/{id}/overview/ */
export interface HostOverviewData {
  host: {
    id: number;
    name: string;
    description: string;
    enabled: boolean;
    inventory: { id: number; name: string; kind: string };
  };
  variables: Record<string, unknown> | null;
  groups: {
    direct: { id: number; name: string }[];
    all: { id: number; name: string }[];
  };
  facts: Record<string, unknown> | null;
  ansible_facts_modified: string | null;
  last_job_per_template: {
    job_template: { id: number; name: string };
    job: { id: number; name: string; status: string; finished: string | null; failed: boolean };
    host_failed: boolean;
  }[];
  recent_jobs: {
    id: number;
    type: 'job' | 'ad_hoc_command';
    name: string;
    status: string;
    created: string;
    started: string | null;
    finished: string | null;
    failed: boolean;
  }[];
}

const recentJobsCount = 10;

function inventoryKindToType(kind: string) {
  if (kind === 'smart') return 'smart_inventory';
  if (kind === 'constructed') return 'constructed_inventory';
  return 'inventory';
}

/** The overview tab of a host: facts, groups, variables and its jobs, from one API call. */
export function HostOverview() {
  const params = useParams<{ id: string; host_id: string }>();
  // on the hosts list routes the host is :id, on the inventory routes it is :host_id
  const hostId = params.host_id ?? params.id ?? '';
  const { data, error, refresh } = useGet<HostOverviewData>(awxAPI`/hosts/${hostId}/overview/`, {
    jobs: recentJobsCount,
  });
  if (error) return <AwxError error={error} handleRefresh={refresh} />;
  if (!data) return <LoadingPage />;
  return <HostOverviewInner overview={data} />;
}

export function HostOverviewInner(props: { overview: HostOverviewData }) {
  const { t } = useTranslation();
  const { overview } = props;
  return (
    <PageDashboard>
      <HostFactsCard facts={overview.facts} modified={overview.ansible_facts_modified} />
      <HostGroupsCard overview={overview} />
      <PageDashboardCard id="host-overview-variables" title={t('Variables')} width="md">
        <CardBody>
          <PageDetailCodeEditor
            value={JSON.stringify(overview.variables ?? {})}
            showCopyToClipboard
            toggleLanguage
          />
        </CardBody>
      </PageDashboardCard>
      <HostLastJobPerTemplateCard overview={overview} />
      <HostRecentJobsCard overview={overview} />
    </PageDashboard>
  );
}

function formatFactValue(value: unknown) {
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/** Top-level facts whose key or value contains the search text (ignoring case). */
export function filterFacts(facts: Record<string, unknown> | null, search: string) {
  const entries = Object.entries(facts ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const text = search.trim().toLowerCase();
  if (!text) return entries;
  return entries.filter(
    ([key, value]) =>
      key.toLowerCase().includes(text) || formatFactValue(value).toLowerCase().includes(text)
  );
}

function HostFactsCard(props: { facts: Record<string, unknown> | null; modified: string | null }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const entries = useMemo(() => filterFacts(props.facts, search), [props.facts, search]);
  const total = Object.keys(props.facts ?? {}).length;
  return (
    <PageDashboardCard
      id="host-overview-facts"
      title={t('Facts')}
      subtitle={
        props.modified
          ? t('{{count}} facts, last updated {{date}}', {
              count: total,
              date: new Date(props.modified).toLocaleString(),
            })
          : undefined
      }
      width="xxl"
      maxHeight="xl"
    >
      {total === 0 ? (
        <CardBody>
          <EmptyState variant="xs">
            <EmptyStateBody>
              {t('No facts have been gathered for this host. Run a job with fact storage enabled.')}
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      ) : (
        <>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem style={{ width: 400 }}>
                <SearchInput
                  data-cy="host-facts-search"
                  placeholder={t('Search facts')}
                  value={search}
                  onChange={(_event, value) => setSearch(value)}
                  onClear={() => setSearch('')}
                  resultsCount={search ? `${entries.length} / ${total}` : undefined}
                />
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
          <CardBody style={{ overflowY: 'auto' }}>
            <Table variant="compact" aria-label={t('Facts')} data-cy="host-facts-table">
              <Thead>
                <Tr>
                  <Th width={30}>{t('Fact')}</Th>
                  <Th>{t('Value')}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {entries.map(([key, value]) => (
                  <Tr key={key} data-cy={`fact-${key}`}>
                    <Td dataLabel={t('Fact')}>
                      <code>{key}</code>
                    </Td>
                    <Td dataLabel={t('Value')}>
                      {value !== null && typeof value === 'object' ? (
                        <ExpandableSection
                          toggleText={
                            Array.isArray(value)
                              ? `${t('List')} (${value.length})`
                              : `${t('Dictionary')} (${Object.keys(value).length})`
                          }
                        >
                          <pre style={{ whiteSpace: 'pre-wrap' }}>{formatFactValue(value)}</pre>
                        </ExpandableSection>
                      ) : (
                        <span style={{ wordBreak: 'break-word' }}>{formatFactValue(value)}</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </>
      )}
    </PageDashboardCard>
  );
}

function HostGroupsCard(props: { overview: HostOverviewData }) {
  const { t } = useTranslation();
  const getPageUrl = useGetPageUrl();
  const [which, setWhich] = useState<'direct' | 'all'>('direct');
  const { host, groups } = props.overview;
  const shown = groups[which] ?? [];
  return (
    <PageDashboardCard id="host-overview-groups" title={t('Groups')} width="md">
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <ToggleGroup aria-label={t('Groups')}>
              <ToggleGroupItem
                text={t('Direct ({{count}})', { count: groups.direct?.length ?? 0 })}
                buttonId="host-groups-direct"
                isSelected={which === 'direct'}
                onChange={() => setWhich('direct')}
              />
              <ToggleGroupItem
                text={t('All ({{count}})', { count: groups.all?.length ?? 0 })}
                buttonId="host-groups-all"
                isSelected={which === 'all'}
                onChange={() => setWhich('all')}
              />
            </ToggleGroup>
          </StackItem>
          <StackItem>
            {shown.length === 0 ? (
              t('This host is not in any group.')
            ) : (
              <LabelGroup numLabels={20} data-cy="host-groups">
                {shown.map((group) => (
                  <Label key={group.id}>
                    <Link
                      to={getPageUrl(AwxRoute.InventoryGroupDetails, {
                        params: {
                          inventory_type: inventoryKindToType(host.inventory.kind),
                          id: host.inventory.id,
                          group_id: group.id,
                        },
                      })}
                    >
                      {group.name}
                    </Link>
                  </Label>
                ))}
              </LabelGroup>
            )}
          </StackItem>
        </Stack>
      </CardBody>
    </PageDashboardCard>
  );
}

function HostLastJobPerTemplateCard(props: { overview: HostOverviewData }) {
  const { t } = useTranslation();
  const getPageUrl = useGetPageUrl();
  const getJobOutputUrl = useGetJobOutputUrl();
  const rows = props.overview.last_job_per_template ?? [];
  return (
    <PageDashboardCard
      id="host-overview-last-job-per-template"
      title={t('Last result per job template')}
      width="xxl"
    >
      <CardBody>
        {rows.length === 0 ? (
          t('No job template has run on this host yet.')
        ) : (
          <Table variant="compact" aria-label={t('Last result per job template')}>
            <Thead>
              <Tr>
                <Th>{t('Job template')}</Th>
                <Th>{t('Result on this host')}</Th>
                <Th>{t('Last job')}</Th>
                <Th>{t('Finished')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={row.job_template.id}>
                  <Td dataLabel={t('Job template')}>
                    <Link
                      to={getPageUrl(AwxRoute.JobTemplateDetails, {
                        params: { id: row.job_template.id },
                      })}
                    >
                      {row.job_template.name}
                    </Link>
                  </Td>
                  <Td dataLabel={t('Result on this host')}>
                    {row.host_failed ? (
                      <Label color="red">{t('Failed')}</Label>
                    ) : (
                      <Label color="green">{t('OK')}</Label>
                    )}
                  </Td>
                  <Td dataLabel={t('Last job')}>
                    <StatusCell
                      status={row.job.status}
                      to={getJobOutputUrl({ id: row.job.id, type: 'job' } as UnifiedJob)}
                    />{' '}
                    <Link to={getJobOutputUrl({ id: row.job.id, type: 'job' } as UnifiedJob)}>
                      {`${row.job.id} - ${row.job.name}`}
                    </Link>
                  </Td>
                  <Td dataLabel={t('Finished')}>
                    {row.job.finished ? <DateTimeCell value={row.job.finished} /> : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardBody>
    </PageDashboardCard>
  );
}

function HostRecentJobsCard(props: { overview: HostOverviewData }) {
  const { t } = useTranslation();
  const getJobOutputUrl = useGetJobOutputUrl();
  const rows = props.overview.recent_jobs ?? [];
  return (
    <PageDashboardCard id="host-overview-recent-jobs" title={t('Recent jobs')} width="xxl">
      <CardBody>
        {rows.length === 0 ? (
          t('No jobs have run on this host yet.')
        ) : (
          <Table variant="compact" aria-label={t('Recent jobs')}>
            <Thead>
              <Tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Type')}</Th>
                <Th>{t('Status')}</Th>
                <Th>{t('Finished')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((job) => (
                <Tr key={`${job.type}-${job.id}`}>
                  <Td dataLabel={t('Name')}>
                    <Link to={getJobOutputUrl(job as unknown as UnifiedJob)}>
                      {`${job.id} - ${job.name}`}
                    </Link>
                  </Td>
                  <Td dataLabel={t('Type')}>
                    {job.type === 'ad_hoc_command' ? t('Command') : t('Playbook run')}
                  </Td>
                  <Td dataLabel={t('Status')}>
                    <StatusCell status={job.status} />
                  </Td>
                  <Td dataLabel={t('Finished')}>
                    {job.finished ? <DateTimeCell value={job.finished} /> : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardBody>
    </PageDashboardCard>
  );
}
