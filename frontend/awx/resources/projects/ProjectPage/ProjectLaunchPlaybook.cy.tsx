import { Credential } from '../../../interfaces/Credential';
import {
  getCredentialPasswordsNeeded,
  getLaunchPlaybookPayload,
  LaunchPlaybookFormValues,
  ProjectLaunchPlaybook,
} from './ProjectLaunchPlaybook';

const launchInfo = {
  playbooks: ['hello_world.yml', 'site.yml'],
  project_data: { id: 1, name: 'Demo Project', allow_override: false },
};

function interceptCommon(info: object = launchInfo) {
  cy.intercept({ method: 'GET', url: '/api/v2/projects/1/' }, { fixture: 'project.json' });
  cy.intercept({ method: 'GET', url: '/api/v2/projects/1/launch_playbook/' }, info).as(
    'launchInfo'
  );
  cy.intercept({ method: 'GET', url: '/api/v2/inventories/*' }, { fixture: 'inventories.json' });
}

describe('ProjectLaunchPlaybook', () => {
  it('lists the playbooks of the project and requires playbook and inventory', () => {
    interceptCommon();
    cy.mount(<ProjectLaunchPlaybook />);
    cy.wait('@launchInfo');
    cy.verifyPageTitle('Run playbook');
    cy.get('[data-cy="playbook-form-group"]').within(() => {
      cy.get('div[data-ouia-component-id="menu-select"]').click();
    });
    cy.contains('hello_world.yml').should('be.visible');
    cy.contains('site.yml').should('be.visible');
    cy.get('body').type('{esc}');
    cy.clickButton(/^Run playbook$/);
    cy.contains('Playbook is required.').should('be.visible');
    cy.contains('Inventory is required.').should('be.visible');
  });

  it('hides the source control branch when the project does not allow overriding it', () => {
    interceptCommon({ ...launchInfo, project_data: { ...launchInfo.project_data } });
    cy.mount(<ProjectLaunchPlaybook />);
    cy.wait('@launchInfo');
    cy.get('[data-cy="scm-branch"]').should('not.exist');
  });

  it('shows the source control branch when the project allows overriding it', () => {
    interceptCommon({
      ...launchInfo,
      project_data: { ...launchInfo.project_data, allow_override: true },
    });
    cy.mount(<ProjectLaunchPlaybook />);
    cy.wait('@launchInfo');
    cy.get('[data-cy="scm-branch"]').should('exist');
  });

  it('posts the launch to the project and its launch_playbook endpoint', () => {
    interceptCommon();
    cy.intercept('POST', '/api/v2/projects/1/launch_playbook/', (req) => {
      expect(req.body).to.deep.equal({
        playbook: 'site.yml',
        inventory: 1,
        credentials: [],
        job_type: 'check',
        verbosity: 0,
        diff_mode: false,
        become_enabled: false,
        use_fact_cache: false,
        limit: 'web*',
      });
      req.reply({ statusCode: 201, body: { id: 42, job: 42, type: 'job', name: 'x' } });
    }).as('launch');
    cy.mount(<ProjectLaunchPlaybook />);
    cy.wait('@launchInfo');
    cy.selectDropdownOptionByResourceName('playbook', 'site.yml');
    cy.selectDropdownOptionByResourceName('inventory', 'Demo Inventory');
    cy.get('[data-cy="limit"]').type('web*');
    cy.selectDropdownOptionByResourceName('job_type', 'Check');
    cy.clickButton(/^Run playbook$/);
    cy.wait('@launch');
  });

  it('shows the error of the API', () => {
    interceptCommon();
    cy.intercept('POST', '/api/v2/projects/1/launch_playbook/', {
      statusCode: 403,
      body: { detail: 'Running playbooks directly is disabled.' },
    }).as('launch');
    cy.mount(<ProjectLaunchPlaybook />);
    cy.wait('@launchInfo');
    cy.selectDropdownOptionByResourceName('playbook', 'site.yml');
    cy.selectDropdownOptionByResourceName('inventory', 'Demo Inventory');
    cy.clickButton(/^Run playbook$/);
    cy.wait('@launch');
    cy.contains('Running playbooks directly is disabled.').should('be.visible');
  });
});

describe('ProjectLaunchPlaybook helpers', () => {
  const machine = {
    id: 3,
    inputs: { username: 'admin', password: 'ASK', become_password: 'ASK' },
  } as unknown as Credential;
  const vault = {
    id: 4,
    inputs: { vault_password: 'ASK', vault_id: 'prod' },
  } as unknown as Credential;

  it('finds the passwords that credentials ask for', () => {
    expect(getCredentialPasswordsNeeded([machine, vault])).to.deep.equal([
      'ssh_password',
      'become_password',
      'vault_password.prod',
    ]);
    expect(getCredentialPasswordsNeeded([{ id: 5, inputs: {} } as unknown as Credential])).to.be
      .empty;
  });

  it('builds the payload from the form values', () => {
    const values = {
      playbook: 'site.yml',
      inventory: { id: 7 },
      credentials: [machine, vault],
      credential_passwords: {
        ssh_password: 'a',
        become_password: 'b',
        'vault_password.prod': 'c',
        unused: 'x',
      },
      limit: '',
      job_type: 'run',
      verbosity: 2,
      extra_vars: 'greeting: hi\n',
      scm_branch: '',
      execution_environment: 2,
      instance_groups: [{ id: 1 }],
      forks: '10',
      timeout: 0,
      job_tags: [{ name: 'a' }, { name: 'b' }],
      skip_tags: [],
      diff_mode: true,
      become_enabled: false,
      use_fact_cache: true,
    } as unknown as LaunchPlaybookFormValues;
    expect(getLaunchPlaybookPayload(values)).to.deep.equal({
      playbook: 'site.yml',
      inventory: 7,
      credentials: [3, 4],
      job_type: 'run',
      verbosity: 2,
      diff_mode: true,
      become_enabled: false,
      use_fact_cache: true,
      extra_vars: 'greeting: hi\n',
      execution_environment: 2,
      instance_groups: [1],
      forks: 10,
      job_tags: 'a,b',
      credential_passwords: {
        ssh_password: 'a',
        become_password: 'b',
        'vault_password.prod': 'c',
      },
    });
  });
});
