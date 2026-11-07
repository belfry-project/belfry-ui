import { Modal } from '@patternfly/react-core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PageFormSubmitHandler,
  PageFormTextInput,
  usePageDialogs,
  usePageNavigate,
} from '../../../../../framework';
import { usePostRequest } from '../../../../common/crud/usePostRequest';
import { AwxPageForm } from '../../../common/AwxPageForm';
import { awxAPI } from '../../../common/api/awx-utils';
import { JobTemplate } from '../../../interfaces/JobTemplate';
import { UnifiedJob } from '../../../interfaces/UnifiedJob';
import { AwxRoute } from '../../../main/AwxRoutes';

interface SaveJobAsTemplateInput {
  name: string;
  description?: string;
}

/** Belfry: save a job that ran a playbook directly (no job template) as a job template. */
export function useSaveJobAsTemplate() {
  const { pushDialog, popDialog } = usePageDialogs();
  return useCallback(
    (job: UnifiedJob) => pushDialog(<SaveJobAsTemplateModal job={job} onClose={popDialog} />),
    [pushDialog, popDialog]
  );
}

function SaveJobAsTemplateModal(props: { job: UnifiedJob; onClose: () => void }) {
  const { t } = useTranslation();
  const postRequest = usePostRequest<SaveJobAsTemplateInput, JobTemplate>();
  const pageNavigate = usePageNavigate();
  const onSubmit: PageFormSubmitHandler<SaveJobAsTemplateInput> = async (values) => {
    const template = await postRequest(
      awxAPI`/jobs/${String(props.job.id)}/create_job_template/`,
      values
    );
    props.onClose();
    pageNavigate(AwxRoute.JobTemplateDetails, { params: { id: template.id } });
  };
  return (
    <Modal
      aria-label={t('Save as job template')}
      title={t('Save as job template')}
      variant="small"
      position="default"
      hasNoBodyWrapper
      isOpen
      onClose={props.onClose}
    >
      <AwxPageForm<SaveJobAsTemplateInput>
        submitText={t('Save')}
        cancelText={t('Cancel')}
        onSubmit={onSubmit}
        onCancel={props.onClose}
        singleColumn
        defaultValue={{ name: props.job.name, description: '' }}
      >
        <span>
          {t(
            'Create a job template with the playbook, inventory, credentials and settings of this job, for example to schedule it.'
          )}
        </span>
        <PageFormTextInput<SaveJobAsTemplateInput>
          name="name"
          label={t('Name')}
          placeholder={t('Enter a name')}
          isRequired
          maxLength={512}
        />
        <PageFormTextInput<SaveJobAsTemplateInput>
          name="description"
          label={t('Description')}
          placeholder={t('Enter a description')}
        />
      </AwxPageForm>
    </Modal>
  );
}
