import { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PageFormDataEditor,
  PageFormSelect,
  PageFormSubmitHandler,
  PageFormSwitch,
  PageFormTextInput,
  PageHeader,
  PageLayout,
  useGetPageUrl,
  usePageNavigate,
} from '../../../../../framework';
import { PageFormCheckbox } from '../../../../../framework/PageForm/Inputs/PageFormCheckbox';
import { PageFormCreatableSelect } from '../../../../../framework/PageForm/Inputs/PageFormCreatableSelect';
import { PageFormSection } from '../../../../../framework/PageForm/Utils/PageFormSection';
import { LoadingPage } from '../../../../../framework/components/LoadingPage';
import { useGet } from '../../../../common/crud/useGet';
import { usePostRequest } from '../../../../common/crud/usePostRequest';
import { PageFormCredentialSelect } from '../../../access/credentials/components/PageFormCredentialSelect';
import { PageFormSelectExecutionEnvironment } from '../../../administration/execution-environments/components/PageFormSelectExecutionEnvironment';
import { PageFormInstanceGroupSelect } from '../../../administration/instance-groups/components/PageFormInstanceGroupSelect';
import { AwxError } from '../../../common/AwxError';
import { AwxPageForm } from '../../../common/AwxPageForm';
import { awxAPI } from '../../../common/api/awx-utils';
import { Credential } from '../../../interfaces/Credential';
import { InstanceGroup } from '../../../interfaces/InstanceGroup';
import { Inventory } from '../../../interfaces/Inventory';
import { Project } from '../../../interfaces/Project';
import { UnifiedJob } from '../../../interfaces/UnifiedJob';
import { AwxRoute } from '../../../main/AwxRoutes';
import { useGetJobOutputUrl } from '../../../views/jobs/useGetJobOutputUrl';
import { PageFormInventorySelect } from '../../inventories/components/PageFormInventorySelect';

/** GET /api/v2/projects/{id}/launch_playbook/ */
export interface LaunchPlaybookInfo {
  playbooks: string[];
  project_data: { id: number; name: string; allow_override: boolean };
}

interface Tag {
  name: string;
  label: string;
  value: string;
}

export interface LaunchPlaybookFormValues {
  playbook: string;
  inventory: Inventory | null;
  credentials: Credential[];
  credential_passwords: Record<string, string>;
  limit: string;
  job_type: 'run' | 'check';
  verbosity: number;
  extra_vars: string;
  scm_branch: string;
  execution_environment: number | null;
  instance_groups: InstanceGroup[];
  forks: number | string;
  timeout: number | string;
  job_tags: Tag[];
  skip_tags: Tag[];
  diff_mode: boolean;
  become_enabled: boolean;
  use_fact_cache: boolean;
}

export interface LaunchPlaybookPayload {
  playbook: string;
  inventory: number;
  credentials?: number[];
  credential_passwords?: Record<string, string>;
  limit?: string;
  job_type?: string;
  verbosity?: number;
  extra_vars?: string;
  scm_branch?: string;
  execution_environment?: number;
  instance_groups?: number[];
  forks?: number;
  timeout?: number;
  job_tags?: string;
  skip_tags?: string;
  diff_mode?: boolean;
  become_enabled?: boolean;
  use_fact_cache?: boolean;
}

/** Credential kinds a job accepts (see the launch_playbook endpoint). */
const credentialKinds = ['ssh', 'vault', 'cloud', 'net', 'kubernetes'];

/** The passwords that selected credentials ask for at launch, as keys of credential_passwords. */
export function getCredentialPasswordsNeeded(credentials: Credential[] | undefined) {
  const needed: string[] = [];
  for (const credential of credentials ?? []) {
    const inputs = (credential.inputs ?? {}) as Record<string, unknown>;
    if (inputs.password === 'ASK') needed.push('ssh_password');
    if (inputs.become_password === 'ASK') needed.push('become_password');
    if (inputs.ssh_key_unlock === 'ASK') needed.push('ssh_key_unlock');
    if (inputs.vault_password === 'ASK') {
      const vaultId = typeof inputs.vault_id === 'string' ? inputs.vault_id : '';
      needed.push(vaultId ? `vault_password.${vaultId}` : 'vault_password');
    }
  }
  return needed;
}

export function getLaunchPlaybookPayload(values: LaunchPlaybookFormValues): LaunchPlaybookPayload {
  const passwordsNeeded = getCredentialPasswordsNeeded(values.credentials);
  const payload: LaunchPlaybookPayload = {
    playbook: values.playbook,
    inventory: values.inventory?.id ?? 0,
    credentials: (values.credentials ?? []).map((credential) => credential.id),
    job_type: values.job_type,
    verbosity: Number(values.verbosity ?? 0),
    diff_mode: Boolean(values.diff_mode),
    become_enabled: Boolean(values.become_enabled),
    use_fact_cache: Boolean(values.use_fact_cache),
  };
  if (values.limit) payload.limit = values.limit;
  const extraVars = (values.extra_vars ?? '').trim();
  if (extraVars && extraVars !== '---' && extraVars !== '{}')
    payload.extra_vars = values.extra_vars;
  if (values.scm_branch) payload.scm_branch = values.scm_branch;
  if (values.execution_environment) payload.execution_environment = values.execution_environment;
  if (values.instance_groups?.length) {
    payload.instance_groups = values.instance_groups.map((group) => group.id);
  }
  if (values.forks !== '' && Number(values.forks) > 0) payload.forks = Number(values.forks);
  if (values.timeout !== '' && Number(values.timeout) > 0) payload.timeout = Number(values.timeout);
  const jobTags = (values.job_tags ?? []).map((tag) => tag.name).join(',');
  if (jobTags) payload.job_tags = jobTags;
  const skipTags = (values.skip_tags ?? []).map((tag) => tag.name).join(',');
  if (skipTags) payload.skip_tags = skipTags;
  if (passwordsNeeded.length) {
    payload.credential_passwords = Object.fromEntries(
      passwordsNeeded.map((key) => [key, values.credential_passwords?.[key] ?? ''])
    );
  }
  return payload;
}

export function ProjectLaunchPlaybook() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pageNavigate = usePageNavigate();
  const getPageUrl = useGetPageUrl();
  const getJobOutputUrl = useGetJobOutputUrl();
  const postRequest = usePostRequest<LaunchPlaybookPayload, UnifiedJob>();
  const id = params.id ?? '';
  const {
    data: project,
    error: projectError,
    refresh: projectRefresh,
  } = useGet<Project>(awxAPI`/projects/${id}/`);
  const {
    data: info,
    error: infoError,
    refresh: infoRefresh,
  } = useGet<LaunchPlaybookInfo>(awxAPI`/projects/${id}/launch_playbook/`);

  const defaultValue = useMemo<Partial<LaunchPlaybookFormValues>>(
    () => ({
      playbook: info?.playbooks?.length === 1 ? info.playbooks[0] : '',
      inventory: null,
      credentials: [],
      credential_passwords: {},
      limit: '',
      job_type: 'run',
      verbosity: 0,
      extra_vars: '---\n',
      scm_branch: '',
      execution_environment: null,
      instance_groups: [],
      forks: 0,
      timeout: 0,
      job_tags: [],
      skip_tags: [],
      diff_mode: false,
      become_enabled: false,
      use_fact_cache: false,
    }),
    [info]
  );

  const error = projectError || infoError;
  if (error) {
    return <AwxError error={error} handleRefresh={projectError ? projectRefresh : infoRefresh} />;
  }
  if (!project || !info) return <LoadingPage breadcrumbs />;

  const onSubmit: PageFormSubmitHandler<LaunchPlaybookFormValues> = async (values) => {
    const job = await postRequest(
      awxAPI`/projects/${id}/launch_playbook/`,
      getLaunchPlaybookPayload(values)
    );
    if (job) void navigate(getJobOutputUrl({ ...job, type: 'job' }));
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('Run playbook')}
        description={t(
          'Run a playbook of this project directly, without a job template. The job shows up in the jobs list like any other job.'
        )}
        breadcrumbs={[
          { label: t('Projects'), to: getPageUrl(AwxRoute.Projects) },
          {
            label: project.name,
            to: getPageUrl(AwxRoute.ProjectDetails, { params: { id: project.id } }),
          },
          { label: t('Run playbook') },
        ]}
      />
      <AwxPageForm<LaunchPlaybookFormValues>
        submitText={t('Run playbook')}
        onSubmit={onSubmit}
        onCancel={() => pageNavigate(AwxRoute.ProjectDetails, { params: { id: project.id } })}
        defaultValue={defaultValue}
      >
        <LaunchPlaybookInputs
          playbooks={info.playbooks ?? []}
          allowBranchOverride={Boolean(info.project_data?.allow_override)}
          organizationId={project.organization ?? null}
        />
      </AwxPageForm>
    </PageLayout>
  );
}

function LaunchPlaybookInputs(props: {
  playbooks: string[];
  allowBranchOverride: boolean;
  organizationId: number | null;
}) {
  const { t } = useTranslation();
  const credentials = useWatch<LaunchPlaybookFormValues, 'credentials'>({ name: 'credentials' });
  const passwordsNeeded = getCredentialPasswordsNeeded(credentials);
  return (
    <>
      <PageFormSelect<LaunchPlaybookFormValues>
        name="playbook"
        id="playbook"
        label={t('Playbook')}
        labelHelpTitle={t('Playbook')}
        labelHelp={t('Select the playbook of this project to run.')}
        placeholderText={
          props.playbooks.length ? t('Select a playbook') : t('No playbooks found in this project')
        }
        isRequired
        isDisabled={!props.playbooks.length}
        options={props.playbooks.map((playbook) => ({ label: playbook, value: playbook }))}
      />
      <PageFormInventorySelect<LaunchPlaybookFormValues> name="inventory" isRequired />
      <PageFormCredentialSelect<LaunchPlaybookFormValues>
        name="credentials"
        label={t('Credentials')}
        placeholder={t('Select credentials')}
        labelHelp={t(
          'Select credentials for accessing the nodes this job will be ran against. You can only select one credential of each type.'
        )}
        isMultiple
        queryParams={{ credential_type__kind__in: credentialKinds.join(',') }}
      />
      <PageFormTextInput<LaunchPlaybookFormValues>
        name="limit"
        label={t('Limit')}
        placeholder={t('Add a limit to reduce number of hosts.')}
        labelHelpTitle={t('Limit')}
        labelHelp={t(
          'Provide a host pattern to further constrain the list of hosts that will be managed or affected by the playbook. Multiple patterns are allowed. Refer to Ansible documentation for more information and examples on patterns.'
        )}
      />
      <PageFormSelect<LaunchPlaybookFormValues>
        name="job_type"
        id="job_type"
        label={t('Job type')}
        labelHelpTitle={t('Job type')}
        labelHelp={t('Check runs the playbook in check mode, without making changes.')}
        options={[
          { label: t('Run'), value: 'run' },
          { label: t('Check'), value: 'check' },
        ]}
        isRequired
      />
      <PageFormSelect<LaunchPlaybookFormValues>
        name="verbosity"
        id="verbosity"
        label={t('Verbosity')}
        labelHelpTitle={t('Verbosity')}
        labelHelp={t('Control the level of output Ansible will produce as the playbook executes.')}
        options={[
          { label: t`0 (Normal)`, value: 0 },
          { label: t`1 (Verbose)`, value: 1 },
          { label: t`2 (More Verbose)`, value: 2 },
          { label: t`3 (Debug)`, value: 3 },
          { label: t`4 (Connection Debug)`, value: 4 },
          { label: t`5 (WinRM Debug)`, value: 5 },
        ]}
      />
      {passwordsNeeded.length > 0 && (
        <PageFormSection title={t('Credential passwords')}>
          {passwordsNeeded.map((key) => (
            <PageFormTextInput<LaunchPlaybookFormValues>
              key={key}
              id={`launch-${key.replace(/\W/g, '-')}`}
              name={`credential_passwords.${key}`}
              label={credentialPasswordLabel(key, t)}
              placeholder={t('Enter a password')}
              type="password"
              isRequired
            />
          ))}
        </PageFormSection>
      )}
      <PageFormSection singleColumn>
        <PageFormDataEditor<LaunchPlaybookFormValues>
          name="extra_vars"
          label={t('Extra variables')}
          labelHelpTitle={t('Extra variables')}
          labelHelp={t('Optional extra variables for this run, in YAML or JSON.')}
          format="yaml"
        />
      </PageFormSection>
      <PageFormSection title={t('Advanced')} canCollapse defaultCollapsed>
        {props.allowBranchOverride && (
          <PageFormTextInput<LaunchPlaybookFormValues>
            name="scm_branch"
            label={t('Source control branch')}
            placeholder={t('Add a source control branch')}
            labelHelpTitle={t('Source control branch')}
            labelHelp={t('Branch to use in this run. Project default used if blank.')}
          />
        )}
        <PageFormSelectExecutionEnvironment<LaunchPlaybookFormValues>
          name="execution_environment"
          organizationId={props.organizationId}
        />
        <PageFormInstanceGroupSelect<LaunchPlaybookFormValues>
          name="instance_groups"
          labelHelp={t('Select the instance groups for this job to run on.')}
        />
        <PageFormTextInput<LaunchPlaybookFormValues>
          name="forks"
          type="number"
          min={0}
          label={t('Forks')}
          placeholder={t('Add number of forks')}
          labelHelpTitle={t('Forks')}
          labelHelp={t(
            'The number of parallel or simultaneous processes to use while executing the playbook. An empty value, or a value less than 1 will use the Ansible default which is usually 5.'
          )}
        />
        <PageFormTextInput<LaunchPlaybookFormValues>
          name="timeout"
          type="number"
          min={0}
          label={t('Timeout')}
          placeholder={t('Add a timeout value')}
          labelHelpTitle={t('Timeout')}
          labelHelp={t(
            'The amount of time (in seconds) to run before the job is canceled. Defaults to 0 for no job timeout.'
          )}
        />
        <PageFormCreatableSelect<LaunchPlaybookFormValues>
          name="job_tags"
          label={t('Job tags')}
          placeholderText={t('Select or create job tags')}
          labelHelpTitle={t('Job tags')}
          labelHelp={t('Only run the tasks and plays with these tags.')}
          options={[]}
        />
        <PageFormCreatableSelect<LaunchPlaybookFormValues>
          name="skip_tags"
          label={t('Skip tags')}
          placeholderText={t('Select or create skip tags')}
          labelHelpTitle={t('Skip tags')}
          labelHelp={t('Skip the tasks and plays with these tags.')}
          options={[]}
        />
        <PageFormSwitch<LaunchPlaybookFormValues>
          id="show-changes"
          name="diff_mode"
          label={t('Show changes')}
          labelHelpTitle={t('Show changes')}
          labelHelp={t(
            `If enabled, show the changes made by Ansible tasks, where supported. This is equivalent to Ansible's --diff mode.`
          )}
        />
        <PageFormCheckbox<LaunchPlaybookFormValues>
          name="become_enabled"
          label={t('Privilege escalation')}
        />
        <PageFormCheckbox<LaunchPlaybookFormValues>
          name="use_fact_cache"
          label={t('Enable fact storage')}
        />
      </PageFormSection>
    </>
  );
}

function credentialPasswordLabel(key: string, t: TFunction) {
  switch (key) {
    case 'ssh_password':
      return t('SSH password');
    case 'become_password':
      return t('Privilege escalation password');
    case 'ssh_key_unlock':
      return t('Private key passphrase');
    default: {
      const vaultId = key.split('.').slice(1).join('.');
      return vaultId ? t('Vault password | {{credId}}', { credId: vaultId }) : t('Vault password');
    }
  }
}
