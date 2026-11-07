import { ButtonVariant, Modal, ModalVariant } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { TFunction } from 'i18next';
import { useCallback, useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  IPageAction,
  PageActionSelection,
  PageActionType,
  PageFormSelect,
  PageFormSubmitHandler,
  PageFormTextInput,
  usePageDialogs,
} from '../../../../../framework';
import { AwxPageForm } from '../../../common/AwxPageForm';
import { IAwxView, hostFilterQueryKey } from '../../../common/useAwxView';
import { AwxHost } from '../../../interfaces/AwxHost';

/**
 * Builds host_filter terms that search the cached facts of hosts with the operators of
 * the Belfry API (ansible_facts__<path>__<operator>=<value>), see the
 * "Searching hosts by facts" page of the REST API documentation.
 */

export type FactFilterValueType = 'text' | 'list' | 'number' | 'version' | 'boolean';

export interface FactFilterOperator {
  /** The lookup written after the fact path; "equals" for equality, which has no lookup. */
  value: string;
  label: string;
  valueType: FactFilterValueType;
}

const equalsOperator = 'equals';

export function getFactFilterOperators(t: TFunction): FactFilterOperator[] {
  return [
    { value: equalsOperator, label: t('equals'), valueType: 'text' },
    { value: 'iexact', label: t('equals (ignore case)'), valueType: 'text' },
    { value: 'icontains', label: t('contains (ignore case)'), valueType: 'text' },
    { value: 'startswith', label: t('starts with'), valueType: 'text' },
    { value: 'istartswith', label: t('starts with (ignore case)'), valueType: 'text' },
    { value: 'endswith', label: t('ends with'), valueType: 'text' },
    { value: 'iendswith', label: t('ends with (ignore case)'), valueType: 'text' },
    { value: 'in', label: t('is one of (comma-separated)'), valueType: 'list' },
    { value: 'gt', label: t('> (number)'), valueType: 'number' },
    { value: 'gte', label: t('>= (number)'), valueType: 'number' },
    { value: 'lt', label: t('< (number)'), valueType: 'number' },
    { value: 'lte', label: t('<= (number)'), valueType: 'number' },
    { value: 'vgt', label: t('> (version)'), valueType: 'version' },
    { value: 'vgte', label: t('>= (version)'), valueType: 'version' },
    { value: 'vlt', label: t('< (version)'), valueType: 'version' },
    { value: 'vlte', label: t('<= (version)'), valueType: 'version' },
    { value: 'isnull', label: t('is missing or null'), valueType: 'boolean' },
    { value: 'exists', label: t('exists'), valueType: 'boolean' },
  ];
}

/** Normalizes a fact path: accepts dots or double underscores and an optional ansible_facts prefix. */
export function normalizeFactPath(path: string) {
  return path
    .trim()
    .replace(/^ansible_facts(\.|__)/, '')
    .split(/\.|__/)
    .filter((part) => part !== '')
    .join('__');
}

/** Quotes a host_filter value when it contains characters that end an unquoted value. */
export function quoteHostFilterValue(value: string) {
  if (value === '' || /[()=\s"\\]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function buildFactFilterTerm(path: string, operator: string, value: string) {
  const lookup = operator === equalsOperator ? '' : operator;
  const key = ['ansible_facts', normalizeFactPath(path), lookup].filter(Boolean).join('__');
  return `${key}=${quoteHostFilterValue(value.trim())}`;
}

/** Adds a term to a host filter; terms are combined with "and". */
export function appendHostFilterTerm(hostFilter: string | null | undefined, term: string) {
  const existing = (hostFilter ?? '').trim();
  if (!existing) return term;
  const needsParentheses = /\sor\s/.test(existing);
  return `${needsParentheses ? `(${existing})` : existing} and ${term}`;
}

interface FactFilterFormValues {
  path: string;
  operator: string;
  value: string;
}

export function FactFilterModal(props: { onApply: (term: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const operators = useMemo(() => getFactFilterOperators(t), [t]);
  const onSubmit: PageFormSubmitHandler<FactFilterFormValues> = (values) => {
    props.onApply(buildFactFilterTerm(values.path, values.operator, values.value));
    props.onClose();
    return Promise.resolve();
  };
  return (
    <Modal
      title={t('Filter hosts by facts')}
      aria-label={t('Filter hosts by facts')}
      variant={ModalVariant.medium}
      position="default"
      hasNoBodyWrapper
      isOpen
      onClose={props.onClose}
    >
      <AwxPageForm<FactFilterFormValues>
        submitText={t('Apply')}
        cancelText={t('Cancel')}
        onSubmit={onSubmit}
        onCancel={props.onClose}
        defaultValue={{ path: '', operator: equalsOperator, value: '' }}
        singleColumn
      >
        <FactFilterInputs operators={operators} />
      </AwxPageForm>
    </Modal>
  );
}

function FactFilterInputs(props: { operators: FactFilterOperator[] }) {
  const { t } = useTranslation();
  const { operators } = props;
  const [path, operatorValue, value] = useWatch<FactFilterFormValues>({
    name: ['path', 'operator', 'value'],
  }) as [string | undefined, string | undefined, string | undefined];
  const operator = operators.find((op) => op.value === operatorValue) ?? operators[0];
  const preview =
    path && normalizeFactPath(path) && value
      ? buildFactFilterTerm(path, operator.value, value)
      : undefined;
  return (
    <>
      <PageFormTextInput<FactFilterFormValues>
        name="path"
        label={t('Fact')}
        placeholder={t('ansible_distribution_version')}
        labelHelpTitle={t('Fact')}
        labelHelp={t(
          'The path of the fact in the cached facts of the host. Separate nested keys with a dot or two underscores, for example ansible_python.version.major. A number indexes a list.'
        )}
        isRequired
        validate={(path: string) =>
          !normalizeFactPath(path)
            ? t('Enter a fact.')
            : /[\s()="]/.test(path)
              ? t('A fact path cannot contain spaces, parentheses, quotes or =.')
              : undefined
        }
      />
      <PageFormSelect<FactFilterFormValues>
        name="operator"
        id="fact-operator"
        label={t('Operator')}
        isRequired
        options={operators.map((op) => ({ label: op.label, value: op.value }))}
      />
      {operator.valueType === 'boolean' ? (
        <PageFormSelect<FactFilterFormValues>
          name="value"
          id="fact-value"
          label={t('Value')}
          placeholderText={t('Select a value')}
          isRequired
          options={[
            { label: t('true'), value: 'true' },
            { label: t('false'), value: 'false' },
          ]}
        />
      ) : (
        <PageFormTextInput<FactFilterFormValues>
          name="value"
          label={t('Value')}
          placeholder={valuePlaceholder(operator.valueType, t)}
          isRequired
          validate={(value: string) => validateFactValue(operator.valueType, value, t)}
        />
      )}
      {preview && (
        <div data-cy="fact-filter-preview">
          {t('Filter')}: <code>{preview}</code>
        </div>
      )}
    </>
  );
}

function valuePlaceholder(valueType: FactFilterValueType, t: TFunction) {
  switch (valueType) {
    case 'list':
      return t('RedHat,Rocky');
    case 'number':
      return t('8000');
    case 'version':
      return t('9.2');
    default:
      return t('RedHat');
  }
}

export function validateFactValue(valueType: FactFilterValueType, value: string, t: TFunction) {
  const trimmed = (value ?? '').trim();
  if (valueType === 'number' && !/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return t('Enter a number.');
  }
  if (valueType === 'version' && !/^\d+(\.\d+)*$/.test(trimmed)) {
    return t('Enter a version made of numbers separated by dots, such as 9.2.');
  }
  if (valueType === 'boolean' && trimmed !== 'true' && trimmed !== 'false') {
    return t('Select true or false.');
  }
  return undefined;
}

/** Opens the dialog that builds a fact filter term and passes the term to onApply. */
export function useFactFilterDialog() {
  const { pushDialog, popDialog } = usePageDialogs();
  return useCallback(
    (onApply: (term: string) => void) =>
      pushDialog(<FactFilterModal onApply={onApply} onClose={popDialog} />),
    [pushDialog, popDialog]
  );
}

/** A toolbar action of host lists that adds a fact filter term to the host_filter filter. */
export function useFactFilterToolbarAction(view: IAwxView<AwxHost>): IPageAction<AwxHost> {
  const { t } = useTranslation();
  const openFactFilterDialog = useFactFilterDialog();
  const { setFilterState } = view;
  return useMemo<IPageAction<AwxHost>>(
    () => ({
      type: PageActionType.Button,
      selection: PageActionSelection.None,
      variant: ButtonVariant.secondary,
      isPinned: true,
      icon: FilterIcon,
      label: t('Filter by facts'),
      onClick: () =>
        openFactFilterDialog((term) =>
          setFilterState((filterState) => ({
            ...filterState,
            [hostFilterQueryKey]: [
              appendHostFilterTerm(filterState[hostFilterQueryKey]?.join(','), term),
            ],
          }))
        ),
    }),
    [openFactFilterDialog, setFilterState, t]
  );
}
